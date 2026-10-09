import { resolvePublicOrganization } from '@/lib/organizations/server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
 try {
 const { slug } = await context.params;
 const result = await resolvePublicOrganization(slug);
 if (!result) return Response.json({ error: 'not_found' }, { status: 404 });
 if (result.status === 308) return Response.redirect(new URL('/darbdaviai/' + result.slug, request.url), 308);
 return Response.json(result.profile, { headers: { 'Cache-Control': 'no-store' } });
 } catch { return Response.json({ error: 'unavailable' }, { status: 503 }); }
}
