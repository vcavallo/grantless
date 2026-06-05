import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Loader2, Copy, Check, Zap } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthor } from '@/hooks/useAuthor';
import { useAppContext } from '@/hooks/useAppContext';
import { useLightningZap } from '@/hooks/useLightningZap';
import { useToast } from '@/hooks/useToast';
import { getActiveRelays } from '@/lib/relays';
import { type TaskProposal } from '@/lib/catallax';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type Phase = 'amount' | 'preparing' | 'invoice' | 'waiting' | 'done' | 'timeout' | 'error';

/**
 * Contribute real sats to a project's crowdfund goal via a NIP-57 zap to the task's
 * arbiter. Always offers the invoice as a locally-rendered QR + a copy button (the
 * bulletproof path for mobile-in-browser funders); WebLN is an additive one-click
 * option. Funding advances only when a real 9735 receipt appears — never faked. If
 * the arbiter has no Lightning address, it says so honestly and publishes nothing.
 */
export function ContributeDialog({ task }: { task: TaskProposal }) {
  const { config, presetRelays } = useAppContext();
  const { prepareInvoice, payWithWebLN, waitForReceipt, isWebLNAvailable } = useLightningZap();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const arbiter = useAuthor(task.arbiterPubkey ?? '');
  const lightningAddress = arbiter.data?.metadata?.lud16 || arbiter.data?.metadata?.lud06;
  const arbiterResolved = !!arbiter.data || arbiter.isError;
  const hasAddress = !!lightningAddress;

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [phase, setPhase] = useState<Phase>('amount');
  const [invoice, setInvoice] = useState('');
  const [qr, setQr] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const watchRef = useRef<AbortController | null>(null);

  // Stop watching for the receipt if the dialog unmounts.
  useEffect(() => () => watchRef.current?.abort(), []);

  const reset = () => {
    watchRef.current?.abort();
    setAmount('');
    setPhase('amount');
    setInvoice('');
    setQr('');
    setError('');
    setCopied(false);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  // Render the QR locally once we have an invoice — no third-party QR service.
  useEffect(() => {
    if (!invoice) return;
    QRCode.toDataURL(`lightning:${invoice}`, { width: 240, margin: 1 }).then(setQr).catch(() => setQr(''));
  }, [invoice]);

  // Watch the relays for the real receipt — funding only advances on a real 9735.
  const startWatch = (goalId: string) => {
    watchRef.current?.abort();
    const ac = new AbortController();
    watchRef.current = ac;
    const relays = getActiveRelays(config, presetRelays);
    const since = Math.floor(Date.now() / 1000);
    setPhase('waiting');
    waitForReceipt(goalId, relays, since, ac.signal).then((seen) => {
      if (ac.signal.aborted) return;
      if (seen) {
        setPhase('done');
        queryClient.invalidateQueries({ queryKey: ['zap-goal', goalId] });
        toast({ title: 'Contribution confirmed', description: 'Your sats are on the way to escrow.' });
      } else {
        setPhase('timeout');
      }
    });
  };

  const getInvoice = async () => {
    const sats = parseInt(amount, 10);
    if (!sats || sats <= 0 || !task.goalId || !task.arbiterPubkey) {
      setError('Enter a positive amount of sats.');
      setPhase('error');
      return;
    }
    setPhase('preparing');
    setError('');
    try {
      const relays = getActiveRelays(config, presetRelays);
      const { invoice: pr } = await prepareInvoice({
        recipientPubkey: task.arbiterPubkey,
        amountSats: sats,
        goalId: task.goalId,
        relays,
      });
      setInvoice(pr);
      startWatch(task.goalId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create an invoice.');
      setPhase('error');
    }
  };

  const copyInvoice = async () => {
    await navigator.clipboard.writeText(invoice);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const payWallet = async () => {
    try {
      await payWithWebLN(invoice);
      toast({ title: 'Payment sent to your wallet', description: 'Waiting for the receipt…' });
    } catch (e) {
      toast({
        title: 'Wallet payment failed',
        description: e instanceof Error ? e.message : 'Try the QR or copy the invoice instead.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="h-8">Contribute</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contribute to {task.content.title}</DialogTitle>
          <DialogDescription>
            Real Lightning sats, custodied by the project's arbiter as escrow.
          </DialogDescription>
        </DialogHeader>

        {!arbiterResolved ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
            Checking the arbiter's Lightning address…
          </p>
        ) : !hasAddress ? (
          <p className="text-sm text-muted-foreground">
            This project's arbiter hasn't set a <strong>Lightning address</strong> (lud16/lud06) in
            their profile, so a real contribution can't be sent yet. Nothing has been published.
          </p>
        ) : phase === 'invoice' || phase === 'waiting' || phase === 'done' || phase === 'timeout' ? (
          <div className="space-y-4">
            {qr && (
              <div className="flex justify-center">
                <img src={qr} alt="Lightning invoice QR code" className="rounded-md border" width={240} height={240} />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="ln-invoice" className="text-xs text-muted-foreground">Lightning invoice</Label>
              <div className="flex items-center gap-2">
                <Input id="ln-invoice" readOnly value={invoice} className="h-8 font-mono text-xs" />
                <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={copyInvoice}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Scan it, or copy and pay it from any Lightning wallet.
              </p>
            </div>

            {isWebLNAvailable && phase !== 'done' && (
              <Button size="sm" variant="outline" className="w-full" onClick={payWallet}>
                <Zap className="mr-2 h-4 w-4" />
                Pay with browser wallet
              </Button>
            )}

            {phase === 'waiting' && (
              <p className="flex items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Waiting for your payment to confirm…
              </p>
            )}
            {phase === 'done' && (
              <p className="text-center text-sm font-medium text-green-600">Contribution confirmed — thank you!</p>
            )}
            {phase === 'timeout' && (
              <p className="text-center text-sm text-muted-foreground">
                Haven't seen your payment on the relays yet. If your wallet says it paid, it may take a
                moment — you can close this and refresh the funding bar.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="contribute-amount">Amount (sats)</Label>
              <Input
                id="contribute-amount"
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="amount in sats"
              />
            </div>
            {phase === 'error' && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" disabled={phase === 'preparing'} onClick={getInvoice}>
              {phase === 'preparing' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Get invoice
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
