import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { buildTaskProposalTemplate, generateTaskId } from '@/lib/catallax';
import { ProjectForm, type ProjectFormValues } from './ProjectForm';

interface CreateProjectFormProps {
  /** Called after a successful publish (e.g. to close the dialog). */
  onSuccess?: () => void;
}

/**
 * Post a crowdfunded project: publishes a kind-33401 in status `proposed`, authored
 * by the logged-in grantee (patron), with no arbiter and no zap goal yet (Stories
 * 6–7). The signer prompts for an explicit signature — nothing is published silently.
 * Fields + validation live in the shared `ProjectForm`.
 */
export function CreateProjectForm({ onSuccess }: CreateProjectFormProps) {
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent, isPending } = useNostrPublish();
  const { toast } = useToast();

  if (!user) {
    return <p className="text-sm text-muted-foreground">You must be logged in to post a project.</p>;
  }

  const onSubmit = async (values: ProjectFormValues) => {
    try {
      await publishEvent(
        buildTaskProposalTemplate({
          d: generateTaskId(values.title),
          patronPubkey: user.pubkey,
          title: values.title,
          description: values.description,
          requirements: values.requirements,
          amount: values.amount,
          status: 'proposed',
          fundingType: 'crowdfunding',
          detailsUrl: values.detailsUrl,
          categories: values.categories,
          deadline: values.deadline,
        }),
      );
      toast({ title: 'Project posted', description: 'Your project is now live for the community to see.' });
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Couldn't post your project",
        description: error instanceof Error ? error.message : 'Publishing failed. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return <ProjectForm submitLabel="Post project" isPending={isPending} onSubmit={onSubmit} />;
}
