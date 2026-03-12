import Link from 'next/link';
import { ProjectNav } from './ProjectNav';
import { ProjectPageTitle } from './ProjectPageTitle';

type Props = { params: Promise<{ shortId: string; slug: string }> };

export default async function ProjectHomePage({ params }: Props) {
  const { shortId, slug } = await params;
  const path = (segment: 'chat' | 'documents' | 'reports') => `/project/${shortId}/${slug}/${segment}`;

  return (
    <div className="space-y-6">
      <ProjectNav shortId={shortId} slug={slug} />
      <div>
        <ProjectPageTitle />
        <p className="mt-2 text-muted-foreground">Open a section below.</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        <li>
          <Link
            href={path('documents')}
            className="block rounded-xl border bg-card p-4 text-foreground hover:bg-muted/50"
          >
            <span className="font-medium">Documents</span>
            <p className="mt-1 text-sm text-muted-foreground">Upload and manage files</p>
          </Link>
        </li>
        <li>
          <Link
            href={path('reports')}
            className="block rounded-xl border bg-card p-4 text-foreground hover:bg-muted/50"
          >
            <span className="font-medium">Reports</span>
            <p className="mt-1 text-sm text-muted-foreground">View AI reports</p>
          </Link>
        </li>
        <li>
          <Link
            href={path('chat')}
            className="block rounded-xl border bg-card p-4 text-foreground hover:bg-muted/50"
          >
            <span className="font-medium">Chat</span>
            <p className="mt-1 text-sm text-muted-foreground">AI chat for this project</p>
          </Link>
        </li>
      </ul>
    </div>
  );
}
