import { notFound, permanentRedirect } from 'next/navigation';
import PublicEmployerProfile from '@/components/PublicEmployerProfile';
import { resolvePublicOrganization } from '@/lib/organizations/server';
import type { PublicOrganization } from '@/lib/organizations/contracts';
import './public-profile.css';
export const dynamic = 'force-dynamic';
export default async function PublicEmployerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await resolvePublicOrganization(slug);
  if (!result) notFound();
  if (result.status === 308) permanentRedirect(`/darbdaviai/${result.slug}`);
  if (result.status !== 200 || !result.profile || typeof result.profile !== 'object') notFound();
  return <PublicEmployerProfile organization={result.profile as PublicOrganization} />;
}
