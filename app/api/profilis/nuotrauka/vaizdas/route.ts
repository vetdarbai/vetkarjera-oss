import { authorizePhoto, readPhoto, photoHeaders, photoFailure, PhotoError } from '@/lib/profiles/photo';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try { const auth = await authorizePhoto(request, false); const photo = await readPhoto(auth);
    if (!photo) throw new PhotoError(404, 'not_found');
    return new Response(new Uint8Array(photo.bytes), { headers: { ...photoHeaders, 'Content-Type': 'image/webp' } });
  } catch (error) { return photoFailure(error); }
}
