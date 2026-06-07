import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useIsOperator } from '@/hooks/useIsOperator';
import { useStuckProjects } from '@/hooks/useStuckProjects';
import { useAuthor } from '@/hooks/useAuthor';
import { CATALLAX_KINDS, getStatusColor, type TaskProposal } from '@/lib/catallax';
import { shortNpub } from '@/lib/shortNpub';
import NotFound from '@/pages/NotFound';
import { CopyNpubButton } from '@/components/CopyNpubButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/** One stuck project: creator identity (for outreach), status, reason, task link. */
function StuckRow({ task, reason }: { task: TaskProposal; reason: string }) {
  const author = useAuthor(task.patronPubkey);
  const creatorName = author.data?.metadata?.name ?? shortNpub(task.patronPubkey);
  const naddr = nip19.naddrEncode({
    kind: CATALLAX_KINDS.TASK_PROPOSAL,
    pubkey: task.patronPubkey,
    identifier: task.d,
  });

  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <Link to={`/task/${naddr}`} className="inline-flex items-center gap-1.5 font-medium hover:text-primary hover:underline underline-offset-4">
            <ExternalLink className="h-4 w-4 shrink-0" />
            <span className="break-words">{task.content.title}</span>
          </Link>
          <Badge className={`shrink-0 ${getStatusColor(task.status)}`}>{task.status.replace('_', ' ')}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{reason}</p>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Creator:</span>
          <span className="font-medium">{creatorName}</span>
          <CopyNpubButton pubkey={task.patronPubkey} size="sm" className="h-6 w-6 p-0" />
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ title, reason, tasks }: { title: string; reason: string; tasks: TaskProposal[] }) {
  return (
    <section className="space-y-3" aria-label={title}>
      <h2 className="text-lg font-semibold">
        {title} <span className="text-sm font-normal text-muted-foreground">({tasks.length})</span>
      </h2>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">None — nothing stuck here.</p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <StuckRow key={`${task.patronPubkey}:${task.d}`} task={task} reason={reason} />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Operator helper panel (Story 16). A read-only diagnostic view, shown only to a
 * configured operator (`VITE_GRANTLESS_OPERATOR`), surfacing two "why isn't my
 * crowdfunding active?" states so the operator can reach out and help. It confers
 * NO privilege — every query is a public read anyone could run. Non-operators get
 * the 404 (the gate is convenience, not security).
 */
export default function OperatorPanel() {
  const isOperator = useIsOperator();
  const { unvouched, arbiterless, isLoading } = useStuckProjects();

  if (!isOperator) return <NotFound />;

  const nothingStuck = !isLoading && unvouched.length === 0 && arbiterless.length === 0;

  return (
    <>
      <Helmet>
        <title>Admin — Grantless</title>
        <meta name="description" content="Operator helper panel: projects that look stuck." />
      </Helmet>

      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="space-y-6">
          <header className="space-y-1">
            <Button variant="ghost" size="sm" asChild className="-ml-2">
              <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" />Back to browse</Link>
            </Button>
            <h1 className="text-3xl font-bold">Admin</h1>
            <p className="text-sm text-muted-foreground">
              Projects that look stuck, to help people whose crowdfunding isn't active. Read-only —
              best-effort over the relays and curators currently reachable, so treat it as a heuristic.
            </p>
          </header>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : nothingStuck ? (
            <Card className="border-dashed">
              <CardContent className="px-8 py-12 text-center text-muted-foreground">
                Nothing stuck right now — every project is vouched and has an arbiter.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              <Section
                title="Not vouched by any curator"
                reason="Creator is in no curator's applicant set — invisible in the browse (likely not tagged)."
                tasks={unvouched}
              />
              <Section
                title="No arbiter assigned"
                reason="No arbiter — the project can't open for funding."
                tasks={arbiterless}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
