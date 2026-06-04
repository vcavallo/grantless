import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft } from 'lucide-react';
import { useAuthor } from '@/hooks/useAuthor';
import { useTaskProposals } from '@/hooks/useCatallax';
import { useGoalsProgress } from '@/hooks/useGoalsProgress';
import { filterTasks, groupTasksByPatron, parsePubkey, sortTasks } from '@/lib/grantless';
import { genUserName } from '@/lib/genUserName';
import { NomineeProjectItem } from '@/components/grantless/NomineeProjectItem';
import { BrowseControls, type BrowseControlsState } from '@/components/grantless/BrowseControls';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Every project posted by a single applicant. Reached from the browse card (the
 * applicant's name or its "view N more" link) so a prolific applicant's dozens of
 * projects live on their own page instead of overrunning the browse grid.
 */
export default function ApplicantProjects() {
  const { npub } = useParams<{ npub: string }>();
  const pubkey = npub ? parsePubkey(npub) : null;

  const author = useAuthor(pubkey ?? '');
  const metadata = author.data?.metadata;
  const displayName = metadata?.name ?? (pubkey ? genUserName(pubkey) : 'Applicant');
  const initial = displayName.slice(0, 2).toUpperCase();

  const { data: allTasks = [], isLoading } = useTaskProposals();
  const tasks = useMemo(() => {
    if (!pubkey) return [];
    return groupTasksByPatron(allTasks).get(pubkey) ?? [];
  }, [allTasks, pubkey]);

  const goalIds = useMemo(
    () => tasks.filter((t) => t.goalId).map((t) => t.goalId as string),
    [tasks],
  );
  const { progressByGoal } = useGoalsProgress(goalIds);

  // An applicant's own page defaults to showing everything (including concluded) —
  // it's their full portfolio — but offers the same filters/sorts as the browse.
  const [controls, setControls] = useState<BrowseControlsState>({
    statuses: ['proposed', 'funded', 'in_progress', 'submitted', 'concluded'],
    sort: 'newest',
    seekingFunding: false,
    needsWorker: false,
    hideEmpty: false,
  });

  const visibleTasks = useMemo(() => {
    const filtered = filterTasks(
      tasks,
      { statuses: controls.statuses, seekingFunding: controls.seekingFunding, needsWorker: controls.needsWorker },
      progressByGoal,
    );
    return sortTasks(filtered, controls.sort, progressByGoal);
  }, [tasks, controls, progressByGoal]);

  return (
    <>
      <Helmet>
        <title>{displayName} — Grantless</title>
        <meta name="description" content={`Projects posted by ${displayName} on Grantless.`} />
      </Helmet>

      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="space-y-6">
          <Button variant="outline" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to browse
            </Link>
          </Button>

          {!pubkey ? (
            <Card className="border-dashed">
              <CardContent className="px-8 py-12 text-center text-muted-foreground">
                That doesn't look like a valid applicant address.
              </CardContent>
            </Card>
          ) : (
            <>
              <header className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  {metadata?.picture && <AvatarImage src={metadata.picture} alt={displayName} />}
                  <AvatarFallback>{initial}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-bold">{displayName}</h1>
                  {metadata?.nip05 && (
                    <p className="truncate text-sm text-muted-foreground">{metadata.nip05}</p>
                  )}
                </div>
              </header>

              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : tasks.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="px-8 py-12 text-center text-muted-foreground">
                    No projects yet.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  <BrowseControls
                    {...controls}
                    showHideEmpty={false}
                    onChange={(patch) => setControls((c) => ({ ...c, ...patch }))}
                  />
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {visibleTasks.length} of {tasks.length} project{tasks.length === 1 ? '' : 's'}
                    </p>
                    {visibleTasks.length === 0 ? (
                      <Card className="border-dashed">
                        <CardContent className="px-8 py-10 text-center text-muted-foreground">
                          No projects match these filters.
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-2">
                        {visibleTasks.map((task) => (
                          <NomineeProjectItem
                            key={task.id}
                            task={task}
                            progress={task.goalId ? progressByGoal.get(task.goalId) : undefined}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
