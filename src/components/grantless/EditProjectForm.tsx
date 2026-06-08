import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { buildTaskProposalTemplate, taskProposalToInput, type TaskProposal } from '@/lib/catallax';
import { canEditTaskAmount } from '@/lib/grantless';
import { ProjectForm, type ProjectFormValues } from './ProjectForm';

interface EditProjectFormProps {
  task: TaskProposal;
  onSuccess?: () => void;
}

/**
 * Edit a proposed task's fields by re-publishing the kind-33401 under the same
 * identity (`patron:d`) via the shared re-publish primitive — preserving status,
 * arbiter, goal link, and worker. The amount is locked once a goal exists (the 9041
 * goal isn't replaceable). Patron-only; the caller gates on `canEditTask`.
 */
export function EditProjectForm({ task, onSuccess }: EditProjectFormProps) {
  const { mutateAsync: publishEvent, isPending } = useNostrPublish();
  const { toast } = useToast();

  const initialValues = {
    title: task.content.title,
    description: task.content.description,
    requirements: task.content.requirements,
    amount: task.amount as unknown as number,
    detailsUrl: task.detailsUrl ?? '',
    // Show only the patron's own categories; the builder re-adds the `catallax` tag.
    categories: task.categories.filter((c) => c !== 'catallax').join(', '),
    deadline: task.content.deadline
      ? new Date(task.content.deadline * 1000).toISOString().slice(0, 10)
      : '',
  };

  const onSubmit = async (values: ProjectFormValues) => {
    try {
      await publishEvent(
        buildTaskProposalTemplate({
          ...taskProposalToInput(task),
          title: values.title,
          description: values.description,
          requirements: values.requirements,
          amount: values.amount,
          detailsUrl: values.detailsUrl,
          categories: values.categories,
          deadline: values.deadline,
        }),
      );
      toast({ title: 'Project updated', description: 'Your changes are live.' });
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Couldn't save your changes",
        description: error instanceof Error ? error.message : 'Publishing failed. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <ProjectForm
      initialValues={initialValues}
      amountLocked={!canEditTaskAmount(task)}
      submitLabel="Save changes"
      isPending={isPending}
      onSubmit={onSubmit}
    />
  );
}
