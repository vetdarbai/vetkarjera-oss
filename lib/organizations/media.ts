import 'server-only';
import sharp from 'sharp';
import { randomUUID, createHash } from 'node:crypto';
import { createClient as createStorageClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseEnvironment } from '@/lib/supabase/env';
import { getActiveUser } from '@/lib/auth/session';
import { PhotoError, photoHeaders, readLimitedImage, photoFailure } from '@/lib/profiles/photo';
import { validOrganizationId, type MediaKind } from './contracts';
import { ownOrganizationContext } from './server';
const bucket = 'organization-profile-media';
export { photoHeaders as mediaHeaders, photoFailure as mediaFailure };
export const ORGANIZATION_MEDIA_LIMITS = {
 logo: { edge: 512, bytes: 250 * 1024 }, cover: { edge: 1600, bytes: 600 * 1024 },
} as const;
function kind(value: string): MediaKind {
 if (value !== 'logo' && value !== 'cover') throw new PhotoError(400, 'invalid_request');
 return value;
}
function storageAdmin() {
 const secret = process.env.SUPABASE_STORAGE_SERVICE_ROLE_KEY;
 if (!secret) throw new PhotoError(503, 'unavailable');
 return createStorageClient(getSupabaseEnvironment().url, secret, {
 auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
 global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
 }).storage.from(bucket);
}
export async function processOrganizationImage(input: Buffer, mediaKind: MediaKind) {
 if (!input.length || input.length > 3 * 1024 * 1024) throw new PhotoError(413, 'image_too_large');
 const format = input[0] === 0xff && input[1] === 0xd8 ? 'jpeg'
 : input.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'png'
 : input.subarray(0,4).toString() === 'RIFF' && input.subarray(8,12).toString() === 'WEBP' ? 'webp' : null;
 if (!format) throw new PhotoError(415, 'unsupported_image');
 try {
 const source = sharp(input, { limitInputPixels: 16_000_000, failOn: 'warning', animated: true });
 const metadata = await source.metadata();
 if (metadata.format !== format || (metadata.pages ?? 1) !== 1) throw new PhotoError(415, 'unsupported_image');
 const limit = ORGANIZATION_MEDIA_LIMITS[mediaKind];
 const bytes = await source.rotate().resize({ width: limit.edge, height: limit.edge, fit: 'inside', withoutEnlargement: true })
 .webp({ quality: 80, effort: 4 }).timeout({ seconds: 8 }).toBuffer();
 if (bytes.length > limit.bytes) throw new PhotoError(413, 'image_too_large');
 const result = await sharp(bytes).metadata();
 return { bytes, width: result.width!, height: result.height!, sha256: createHash('sha256').update(bytes).digest('hex') };
 } catch (error) {
 if (error instanceof PhotoError) throw error;
 throw new PhotoError(400, 'invalid_image');
 }
}
async function mutationAuthorization(request: Request, id: string, k: string) {
 if (!validOrganizationId(id) || request.headers.get('origin') !== new URL(request.url).origin || new URL(request.url).search)
 throw new PhotoError(403, 'forbidden');
 const mediaKind = kind(k);
 if (!await getActiveUser()) throw new PhotoError(401, 'session_required');
 const context = await ownOrganizationContext(id);
 if (!context?.capabilities.canManageMedia) throw new PhotoError(403, 'forbidden');
 return { mediaKind, context, client: await createClient() };
}
export async function replaceOrganizationMedia(request: Request, id: string, k: string) {
 const auth = await mutationAuthorization(request, id, k);
 const output = await processOrganizationImage(await readLimitedImage(request), auth.mediaKind);
 const prepared = await auth.client.rpc('prepare_org_media', { organization_id: id, expected_row_version: auth.context.rowVersion, payload: { kind: auth.mediaKind } });
 if (prepared.error || !prepared.data || typeof prepared.data !== 'object' || Array.isArray(prepared.data)) throw new PhotoError(409, 'stale_revision');
 const p = prepared.data as { path: string; version: string };
 if (!validOrganizationId(p.version) || p.path !== id + '/' + auth.mediaKind + '/' + p.version + '.webp') throw new PhotoError(503, 'unavailable');
 const store = storageAdmin();
 const uploaded = await store.upload(p.path, output.bytes, { contentType: 'image/webp', cacheControl: '0', upsert: false });
 if (uploaded.error) throw new PhotoError(503, 'unavailable');
 let committed;
 try {
 committed = await auth.client.rpc('commit_org_media', { organization_id: id, expected_row_version: auth.context.rowVersion,
 payload: { kind: auth.mediaKind, version: p.version, sha256: output.sha256, size_bytes: output.bytes.length, width: output.width, height: output.height } });
 if (committed.error || !committed.data) throw new PhotoError(409, 'stale_revision');
 } catch (error) {
 const cleanup = await store.remove([p.path]);
 if (cleanup.error) throw new PhotoError(503, 'media_cleanup_required');
 throw error;
 }
 const result = committed.data as { previousPath?: string | null; context: unknown };
 if (result.previousPath && (await store.remove([result.previousPath])).error) throw new PhotoError(503, 'media_cleanup_required');
 // Return the committed immutable URL, never an immediate stale download.
 return { ok: true, version: p.version, src: '/api/organizacijos/' + id + '/media/' + auth.mediaKind + '?v=' + p.version, context: result.context };
}
export async function removeOrganizationMedia(request: Request, id: string, k: string) {
 const auth = await mutationAuthorization(request, id, k);
 const removed = await auth.client.rpc('remove_org_media', { organization_id: id, expected_row_version: auth.context.rowVersion, payload: { kind: auth.mediaKind } });
 if (removed.error || !removed.data) throw new PhotoError(409, 'stale_revision');
 const result = removed.data as { previousPath?: string | null; context: unknown };
 if (result.previousPath && (await storageAdmin().remove([result.previousPath])).error) throw new PhotoError(503, 'media_cleanup_required');
 return { ok: true, version: null, src: null, context: result.context };
}
export async function readOrganizationMedia(request: Request, id: string, k: string) {
 if (!validOrganizationId(id)) throw new PhotoError(404, 'not_found');
 const mediaKind = kind(k),url = new URL(request.url);
 if (Array.from(url.searchParams.keys()).some(k => k !== 'v') || url.searchParams.getAll('v').length > 1) throw new PhotoError(400, 'invalid_request');
 const version = url.searchParams.get('v');
 if (version && !validOrganizationId(version)) throw new PhotoError(400, 'invalid_request');
 const client = await createClient();
 const result = await client.rpc('read_org_media', { organization_id: id, kind: mediaKind, version });
 if (result.error) throw new PhotoError(503, 'unavailable');
 if (!result.data) throw new PhotoError(404, 'not_found');
 const metadata = result.data as { path: string; version: string; sha256: string; size: number };
 const expected = id + '/' + mediaKind + '/' + metadata.version + '.webp';
 if (metadata.path !== expected) throw new PhotoError(503, 'unavailable');
 const download = await client.storage.from(bucket).download(metadata.path, { cacheNonce: version || randomUUID() });
 if (download.error) throw new PhotoError(503, 'unavailable');
 const bytes = Buffer.from(await download.data.arrayBuffer());
 if (bytes.length !== metadata.size || bytes.length > ORGANIZATION_MEDIA_LIMITS[mediaKind].bytes ||
 createHash('sha256').update(bytes).digest('hex') !== metadata.sha256) throw new PhotoError(503, 'unavailable');
 return new Response(new Uint8Array(bytes), { headers: { ...photoHeaders, 'Content-Type': 'image/webp' } });
}
