import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { buildArbiterAnnouncementTemplate } from '@/lib/catallax';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const schema = z.object({
  name: z.string().trim().min(1, 'A service name is required'),
  about: z.string().trim().optional(),
  feeType: z.enum(['flat', 'percentage']),
  feeAmount: z.coerce
    .number({ invalid_type_error: 'Enter a fee amount' })
    .positive('The fee must be greater than zero'),
});

type FormValues = z.input<typeof schema>;

interface BecomeArbiterFormProps {
  /** Called after a successful announcement (e.g. to show the vouching panel). */
  onSuccess?: () => void;
}

/**
 * Announce an arbiter service: publishes a kind-33400, authored by the logged-in
 * user, carrying the minimal terms a patron needs to evaluate them (name + fee).
 * The signer prompts for an explicit signature — nothing is published silently.
 * Announcing is permissionless; it does not make the arbiter selectable (that is a
 * curator/host's call — see the dialog's success panel).
 */
export function BecomeArbiterForm({ onSuccess }: BecomeArbiterFormProps) {
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent, isPending } = useNostrPublish();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', about: '', feeType: 'flat', feeAmount: '' as unknown as number },
  });

  const feeType = form.watch('feeType');

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    const parsed = schema.parse(values);

    const template = buildArbiterAnnouncementTemplate({
      name: parsed.name,
      about: parsed.about || undefined,
      feeType: parsed.feeType,
      feeAmount: String(parsed.feeAmount),
      pubkey: user.pubkey,
    });

    try {
      await publishEvent(template);
      toast({ title: 'Arbiter service announced', description: 'Your service is now public on the network.' });
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Couldn't announce your service",
        description: error instanceof Error ? error.message : 'Publishing failed. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!user) {
    return <p className="text-sm text-muted-foreground">You must be logged in to become an arbiter.</p>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Reliable OSS Escrow" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="about"
          render={({ field }) => (
            <FormItem>
              <FormLabel>About (optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Your arbitration experience and how you work" rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="feeType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fee type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="flat">Flat</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="feeAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fee amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step={feeType === 'percentage' ? 0.01 : 1}
                    max={feeType === 'percentage' ? 1 : undefined}
                    placeholder={feeType === 'percentage' ? '0.05' : '10000'}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {feeType === 'percentage' ? 'A fraction from 0 to 1 (e.g. 0.05 = 5%).' : 'A flat fee in sats.'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Announce service
        </Button>
      </form>
    </Form>
  );
}
