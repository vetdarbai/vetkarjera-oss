import { authorizePhoto, readPhoto, photoMetadata, readLimitedImage, processPhoto, replacePhoto, removePhoto, photoHeaders, photoFailure } from '@/lib/profiles/photo';
import { createHash } from 'node:crypto';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try { const auth = await authorizePhoto(request, false);
    return Response.json({ ok: true, ...photoMetadata(auth, await readPhoto(auth)) }, { headers: photoHeaders });
  } catch (error) { return photoFailure(error); }
}
export async function PUT(request: Request) {
  try { const auth = await authorizePhoto(request, true);
    const output = await processPhoto(await readLimitedImage(request));
    await replacePhoto(auth, output);
    // The successful write is authoritative. An immediate Storage download can
    // still contain the previous generation and must not restore stale UI state.
    const saved = { bytes: output, version: createHash('sha256').update(output).digest('hex') };
    return Response.json({ ok: true, ...photoMetadata(auth, saved) }, { headers: photoHeaders });
  } catch (error) { return photoFailure(error); }
}
export async function DELETE(request: Request) {
  try { const auth = await authorizePhoto(request, true);
    await removePhoto(auth);
    // Successful deletion is authoritative. A follow-up download can fail or
    // return stale bytes; it must not turn a successful removal into an error.
    return Response.json({ ok: true, ...photoMetadata(auth, null) }, { headers: photoHeaders });
  } catch (error) { return photoFailure(error); }
}
