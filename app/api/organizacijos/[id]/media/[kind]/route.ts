import { replaceOrganizationMedia, removeOrganizationMedia, readOrganizationMedia, mediaHeaders, mediaFailure } from '@/lib/organizations/media';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string; kind: string }> };
export async function GET(request: Request, context: Context) {
 try { const p = await context.params; return await readOrganizationMedia(request, p.id, p.kind); }
 catch (error) { return mediaFailure(error); }
}
export async function PUT(request: Request, context: Context) {
 try { const p = await context.params; return Response.json(await replaceOrganizationMedia(request, p.id, p.kind), { headers: mediaHeaders }); }
 catch (error) { return mediaFailure(error); }
}
export async function DELETE(request: Request, context: Context) {
 try { const p = await context.params; return Response.json(await removeOrganizationMedia(request, p.id, p.kind), { headers: mediaHeaders }); }
 catch (error) { return mediaFailure(error); }
}
