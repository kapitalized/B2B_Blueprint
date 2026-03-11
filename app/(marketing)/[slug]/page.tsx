import { notFound } from 'next/navigation';
import { getPageMetadata, PAGES } from '@/lib/seo';
import { getPageBySlug } from '@/lib/payload-content';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return getPageMetadata(slug);
}

export default async function MarketingSlugPage({ params }: Props) {
  const { slug } = await params;
  const cmsPage = await getPageBySlug(slug);
  const staticMeta = PAGES[slug];

  if (!cmsPage && !staticMeta) notFound();

  const title = cmsPage?.title ?? staticMeta?.title ?? slug;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-4 text-muted-foreground">
        {cmsPage
          ? 'Content from Payload. Add a rich text or blocks field in the Pages collection to render body content here.'
          : 'Static page. Create a Page in the admin with this slug to drive title and SEO from the CMS.'}
      </p>
    </div>
  );
}
