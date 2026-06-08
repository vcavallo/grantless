import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { parseDeadlineInput } from '@/lib/grantless';
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
  deadline: z.string().optional(),
});

type FormValues = z.input<typeof schema>;

/** Normalized values handed to the create/edit action. */
export interface ProjectFormValues {
  title: string;
  description: string;
  requirements: string;
  /** Funding target in sats, as a string (the 33401 `amount` tag). */
  amount: string;
  detailsUrl?: string;
  categories: string[];
  /** Deadline as unix seconds, or undefined when left empty. */
  deadline?: number;
}

interface ProjectFormProps {
  /** Pre-fill (edit mode). Omit for a blank create form. */
  initialValues?: Partial<FormValues>;
  /** Disable the amount field (funding already open — the 9041 goal can't change). */
  amountLocked?: boolean;
  submitLabel?: string;
  isPending?: boolean;
  onSubmit: (values: ProjectFormValues) => Promise<void> | void;
}

/**
 * The shared project fields + validation, used by both create and edit. It only
 * collects and validates — the parent owns the build/publish via `onSubmit`. When
 * `amountLocked`, the amount is shown disabled (its current value is preserved and
 * still submitted, since the field is RHF-controlled).
 */
export function ProjectForm({
  initialValues,
  amountLocked = false,
  submitLabel = 'Save',
  isPending = false,
  onSubmit,
}: ProjectFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      requirements: '',
      amount: '' as unknown as number,
      detailsUrl: '',
      categories: '',
      deadline: '',
      ...initialValues,
    },
  });

  const submit = async (values: FormValues) => {
    const parsed = schema.parse(values);
    const categories = (parsed.categories ?? '')
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    await onSubmit({
      title: parsed.title,
      description: parsed.description,
      requirements: parsed.requirements,
      amount: String(parsed.amount),
      detailsUrl: parsed.detailsUrl || undefined,
      categories,
      deadline: parseDeadlineInput(parsed.deadline ?? ''),
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
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
                <Input type="number" min={1} step={1} placeholder="75000" disabled={amountLocked} {...field} />
              </FormControl>
              <FormDescription>
                {amountLocked
                  ? "Funding is open — the goal amount can't be changed (it would orphan existing contributions)."
                  : 'The crowdfunding goal for this project.'}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="deadline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deadline (optional)</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
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
          {submitLabel}
        </Button>
      </form>
    </Form>
  );
}
