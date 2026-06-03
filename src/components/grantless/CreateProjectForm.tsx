import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { buildTaskProposalTemplate, generateTaskId } from '@/lib/catallax';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const schema = z.object({
  title: z.string().trim().min(1, 'A title is required'),
  description: z.string().trim().min(1, 'Describe what this project is'),
  requirements: z.string().trim().min(1, 'Describe what "done" looks like'),
  amount: z.coerce
    .number({ invalid_type_error: 'Enter a funding target in sats' })
    .int('Use a whole number of sats')
    .positive('The target must be greater than zero'),
  detailsUrl: z.union([z.literal(''), z.string().url('Enter a valid URL')]).optional(),
  categories: z.string().optional(),
});

type FormValues = z.input<typeof schema>;

interface CreateProjectFormProps {
  /** Called after a successful publish (e.g. to close the dialog). */
  onSuccess?: () => void;
}

/**
 * Post a crowdfunded project: publishes a kind-33401 in status `proposed`, authored
 * by the logged-in grantee (patron), with no arbiter and no zap goal yet (Stories
 * 6–7). The signer prompts for an explicit signature — nothing is published silently.
 */
export function CreateProjectForm({ onSuccess }: CreateProjectFormProps) {
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent, isPending } = useNostrPublish();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', description: '', requirements: '', amount: '' as unknown as number, detailsUrl: '', categories: '' },
  });

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    const parsed = schema.parse(values);
    const categories = (parsed.categories ?? '')
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const template = buildTaskProposalTemplate({
      d: generateTaskId(parsed.title),
      patronPubkey: user.pubkey,
      title: parsed.title,
      description: parsed.description,
      requirements: parsed.requirements,
      amount: String(parsed.amount),
      status: 'proposed',
      fundingType: 'crowdfunding',
      detailsUrl: parsed.detailsUrl || undefined,
      categories,
    });

    try {
      await publishEvent(template);
      toast({ title: 'Project posted', description: 'Your project is now live for the community to see.' });
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Couldn't post your project",
        description: error instanceof Error ? error.message : 'Publishing failed. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!user) {
    return <p className="text-sm text-muted-foreground">You must be logged in to post a project.</p>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Reproducible builds for the wallet" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="What is this project?" rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="requirements"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Requirements</FormLabel>
              <FormControl>
                <Textarea placeholder='What does "done" look like?' rows={3} {...field} />
              </FormControl>
              <FormDescription>The bar an arbiter will judge the work against.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Funding target (sats)</FormLabel>
              <FormControl>
                <Input type="number" min={1} step={1} placeholder="75000" {...field} />
              </FormControl>
              <FormDescription>The crowdfunding goal for this project.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="detailsUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Details URL (optional)</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://github.com/you/project" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="categories"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categories (optional)</FormLabel>
              <FormControl>
                <Input placeholder="comma, separated, tags" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Post project
        </Button>
      </form>
    </Form>
  );
}
