import 'server-only';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { getActiveUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { createStorageAdmin } from '@/lib/supabase/storage-admin';

export const PHOTO_LIMITS = { inputBytes: 3 * 1024 * 1024, inputPixels: 16_000_000, outputBytes: 250 * 1024, edge: 512 } as const;
const bucket = 'specialist-profile-photos';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class PhotoError extends Error {
  constructor(public readonly status: number, public readonly code: string) { super(code); }
}
export const photoHeaders = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };

/** Both Auth and the live-session RPC must succeed. No metadata-based authorization. */
export async function authorizePhoto(request: Request, mutation: boolean) {
  const url = new URL(request.url);
  if (mutation && (request.headers.get('origin') !== url.origin || url.search)) throw new PhotoError(403, 'forbidden');
  if (Array.from(url.searchParams.keys()).some(key => key !== 'userId') || url.searchParams.getAll('userId').length > 1) throw new PhotoError(400, 'invalid_request');
  const account = await getActiveUser();
  if (!account) throw new PhotoError(401, 'session_required');
  const target = mutation ? account.id : (url.searchParams.get('userId') ?? account.id);
  if (!uuid.test(target) || (target !== account.id && !account.isAdmin)) throw new PhotoError(403, 'forbidden');
  const client = await createClient();
  const { data, error } = await client.from('specialist_profiles').select('user_id').eq('user_id', target).maybeSingle();
  if (error) throw new PhotoError(503, 'unavailable');
  if (!data) throw new PhotoError(403, 'specialist_required');
  return { target, path: target + '/profile.webp', client };
}

export async function readLimitedImage(request: Request): Promise<Buffer> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(request.headers.get('content-type') ?? '')) throw new PhotoError(415, 'unsupported_image');
  const length = request.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > PHOTO_LIMITS.inputBytes)) throw new PhotoError(413, 'image_too_large');
  if (!request.body) throw new PhotoError(400, 'invalid_image');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > PHOTO_LIMITS.inputBytes) { await reader.cancel(); throw new PhotoError(413, 'image_too_large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  if (!size) throw new PhotoError(400, 'invalid_image');
  return Buffer.concat(chunks);
}

export async function processPhoto(input: Buffer): Promise<Buffer> {
  if (!input.length || input.length > PHOTO_LIMITS.inputBytes) throw new PhotoError(413, 'image_too_large');
  // Reject SVG/GIF/etc before decoding, including forged Content-Type headers.
  const format = input[0] === 0xff && input[1] === 0xd8 ? 'jpeg'
    : input.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'png'
    : input.subarray(0,4).toString() === 'RIFF' && input.subarray(8,12).toString() === 'WEBP' ? 'webp' : null;
  if (!format) throw new PhotoError(415, 'unsupported_image');
  try {
    const source = sharp(input, { limitInputPixels: PHOTO_LIMITS.inputPixels, failOn: 'warning', animated: true });
    const meta = await source.metadata();
    if (meta.format !== format || (meta.pages ?? 1) !== 1) throw new PhotoError(415, 'unsupported_image');
    // Sharp drops metadata by default. Original bytes never reach Storage.
    const result = await source.rotate().resize({ width: PHOTO_LIMITS.edge, height: PHOTO_LIMITS.edge, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80, effort: 4 }).timeout({ seconds: 8 }).toBuffer();
    if (result.length > PHOTO_LIMITS.outputBytes) throw new PhotoError(413, 'image_too_large');
    return result;
  } catch (error) {
    if (error instanceof PhotoError) throw error;
    throw new PhotoError(400, 'invalid_image');
  }
}

type Authorization = Awaited<ReturnType<typeof authorizePhoto>>;
export async function readPhoto(auth: Authorization) {
  const { data, error } = await auth.client.storage.from(bucket).download(auth.path);
  if (error) {
    if (('statusCode' in error && Number(error.statusCode) === 404) || ('error' in error && error.error === 'NoSuchKey')) return null;
    throw new PhotoError(503, 'unavailable');
  }
  const bytes = Buffer.from(await data.arrayBuffer());
  if (bytes.length > PHOTO_LIMITS.outputBytes) throw new PhotoError(503, 'unavailable');
  return { bytes, version: createHash('sha256').update(bytes).digest('hex') };
}
export function photoMetadata(auth: Authorization, value: Awaited<ReturnType<typeof readPhoto>>) {
  return { hasPhoto: !!value, reference: value ? auth.path : null, version: value?.version ?? null,
    imageUrl: value ? '/api/profilis/nuotrauka/vaizdas?userId=' + auth.target : null };
}
export async function replacePhoto(auth: Authorization, bytes: Buffer) {
  // Recheck session immediately before the privileged write (processing can take time).
  const { data, error } = await auth.client.rpc('account_capabilities');
  if (error || !data || typeof data !== 'object' || Array.isArray(data) || data.id !== auth.target || data.hasSpecialistProfile !== true) throw new PhotoError(401, 'session_required');
  const result = await createStorageAdmin().upload(auth.path, bytes, { contentType: 'image/webp', upsert: true, cacheControl: '0' });
  if (result.error) throw new PhotoError(503, 'unavailable');
}
export async function removePhoto(auth: Authorization) {
  const { data, error } = await auth.client.rpc('account_capabilities');
  if (error || !data || typeof data !== 'object' || Array.isArray(data) || data.id !== auth.target || data.hasSpecialistProfile !== true) throw new PhotoError(401, 'session_required');
  if ((await createStorageAdmin().remove([auth.path])).error) throw new PhotoError(503, 'unavailable');
}
export function photoFailure(error: unknown) {
  const known = error instanceof PhotoError ? error : new PhotoError(503, 'unavailable');
  return Response.json({ ok: false, code: known.code }, { status: known.status, headers: photoHeaders });
}
