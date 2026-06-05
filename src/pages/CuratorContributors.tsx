import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { nip19 } from 'nostr-tools';
import { ArrowLeft } from 'lucide-react';
import { parsePubkey } from '@/lib/grantless';
import { formatSats } from '@/lib/catallax';
import { useCuratorContributors } from '@/hooks/useCuratorContributors';
import { AuthorAvatar } from '@/components/AuthorAvatar';
import { AuthorName } from '@/components/AuthorName';
import { CopyNpubButton } from '@/components/CopyNpubButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Everyone who has funded anything across a curator's set of projects, ranked by total
 * contributed. A "show off" page for funders and curators alike — shareable by URL,
 * built entirely from public zap receipts (no privileged data).
 */
export default function CuratorContributors() {
  const { npub } = useParams<{ npub: string }>();
  const curator = npub ? parsePubkey(npub) : null;
  const { contributors, isLoading } = useCuratorContributors(curator);

  const backTo = curator ? `/c/${nip19.npubEncode(curator)}` : '/';

  return (
    <>
      <Helmet>
        <title>Contributors — Grantless</title>
        <meta name="description" content="Contributors ranked by total sats across a curator's projects." />
      </Helmet>

      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="space-y-6">
          <Button variant="outline" size="sm" asChild>
            <Link to={backTo}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to browse
            </Link>
          </Button>

          {!curator ? (
            <Card className="border-dashed">
              <CardContent className="px-8 py-12 text-center text-muted-foreground">
                That doesn't look like a valid curator address.
              </CardContent>
            </Card>
          ) : (
            <>
              <header className="flex items-center gap-3">
                <AuthorAvatar pubkey={curator} className="h-12 w-12" />
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold">Contributors</h1>
                  <p className="truncate text-sm text-muted-foreground">
                    Backing <AuthorName pubkey={curator} />'s projects, ranked by total contributed.
                  </p>
                </div>
              </header>

              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : contributors.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="px-8 py-12 text-center text-muted-foreground">
                    No contributions yet. Be the first to fund a project here.
                  </CardContent>
                </Card>
              ) : (
                <ul className="space-y-1">
                  {contributors.map((c, i) => (
                    <li key={c.pubkey} className="flex items-center gap-3 rounded-md border px-3 py-2">
                      <span className="w-6 shrink-0 text-center text-sm font-medium text-muted-foreground">
                        {i + 1}
                      </span>
                      <AuthorAvatar pubkey={c.pubkey} className="h-8 w-8" />
                      <AuthorName pubkey={c.pubkey} className="min-w-0 flex-1 truncate font-medium" />
                      <span className="shrink-0 font-medium">{formatSats(String(c.totalSats))}</span>
                      <CopyNpubButton pubkey={c.pubkey} size="icon" variant="ghost" />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
