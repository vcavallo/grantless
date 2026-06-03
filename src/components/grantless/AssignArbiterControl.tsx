import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { useCuratorArbiterCandidates } from '@/hooks/useCuratorArbiterCandidates';
import { buildTaskProposalTemplate, taskProposalToInput, type TaskProposal } from '@/lib/catallax';
import { genUserName } from '@/lib/genUserName';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AssignArbiterControlProps {
  task: TaskProposal;
  /** The curator whose grantless-arbiter list supplies the options. */
  curatorPubkey?: string;
}

/**
 * Patron-only control to attach (or change) the task's arbiter, chosen from the
 * curator's vouched-for arbiters. Re-publishes the patron-signed 33401 with the
 * arbiter `p`/`a` tags via the shared builder; status is unchanged. Renders nothing
 * for non-patrons.
 */
export function AssignArbiterControl({ task, curatorPubkey }: AssignArbiterControlProps) {
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent, isPending } = useNostrPublish();
  const { toast } = useToast();
  const { candidates, isLoading } = useCuratorArbiterCandidates(curatorPubkey);
  const [selected, setSelected] = useState<string>(task.arbiterPubkey ?? '');

  // Only the project's patron may set its arbiter (Catallax authorized-updater rule).
  if (!user || user.pubkey !== task.patronPubkey) return null;

  const assign = async () => {
    const candidate = candidates.find((c) => c.pubkey === selected);
    if (!candidate) return;
    const template = buildTaskProposalTemplate({
      ...taskProposalToInput(task),
      arbiterPubkey: candidate.pubkey,
      arbiterService: candidate.serviceCoord,
    });
    try {
      await publishEvent(template);
      toast({ title: 'Arbiter assigned', description: `${candidate.name ?? genUserName(candidate.pubkey)} is now the arbiter.` });
    } catch (error) {
      toast({
        title: "Couldn't assign the arbiter",
        description: error instanceof Error ? error.message : 'Publishing failed. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Loading arbiters…</p>;
  }

  if (candidates.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No arbiters available from this curator. Try another curator or relay.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger className="h-8 w-full max-w-[16rem] text-xs">
          <SelectValue placeholder={task.arbiterPubkey ? 'Change arbiter…' : 'Choose an arbiter…'} />
        </SelectTrigger>
        <SelectContent>
          {candidates.map((c) => (
            <SelectItem key={c.pubkey} value={c.pubkey}>
              {c.name ?? genUserName(c.pubkey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="secondary"
        className="h-8 shrink-0"
        disabled={isPending || !selected || selected === task.arbiterPubkey}
        onClick={assign}
      >
        {isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
        {task.arbiterPubkey ? 'Change' : 'Assign'}
      </Button>
    </div>
  );
}
