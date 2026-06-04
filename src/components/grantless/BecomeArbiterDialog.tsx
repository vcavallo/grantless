import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Shield } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMyArbiterServices } from '@/hooks/useCatallax';
import { BecomeArbiterForm } from './BecomeArbiterForm';
import { LoginArea } from '@/components/auth/LoginArea';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface BecomeArbiterDialogProps {
  /** Open on mount — used by the `?compose=arbiter` deep-link from the About page. */
  autoOpen?: boolean;
}

/**
 * "Become an Arbiter" entry point for the Grantless browse — the arbiter analogue of
 * "Post a project". Login-gated: logged-in users announce a kind-33400 service;
 * logged-out users are prompted to log in. Announcing is permissionless, but it does
 * NOT make an arbiter selectable — the success panel says so plainly and points to how
 * a curator/host vouches. No arbiter is privileged by the client.
 */
export function BecomeArbiterDialog({ autoOpen = false }: BecomeArbiterDialogProps) {
  const { user } = useCurrentUser();
  const { data: myServices } = useMyArbiterServices(user?.pubkey);
  const hasService = (myServices?.length ?? 0) > 0;

  const [open, setOpen] = useState(autoOpen);
  const [announced, setAnnounced] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setAnnounced(false); // reset the panel when the dialog closes
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {hasService ? <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> : <Shield className="mr-2 h-4 w-4" />}
          {hasService ? 'Update arbiter service' : 'Become an Arbiter'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {announced ? (
          <>
            <DialogHeader>
              <DialogTitle>Announced — but not yet selectable</DialogTitle>
              <DialogDescription>
                Your arbiter service is now public. One more step before patrons can pick you.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                Announcing is permissionless — anyone can do it. But on Grantless, patrons can only
                choose arbiters their <strong>curator</strong> vouches for (the curator's
                trusted-arbiter set). Until a curator adds you, you won't appear as a selectable
                arbiter.
              </p>
              <p>
                Getting vouched is a social, out-of-band step — there's no button here that can grant
                it (that would defeat the Web of Trust).
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/about">How does vouching work?</Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{hasService ? 'Update your arbiter service' : 'Become an Arbiter'}</DialogTitle>
              <DialogDescription>
                Announce your arbiter service — the terms and fee patrons need to evaluate you.
                {hasService && ' Re-announcing with the same name updates your existing service.'}
              </DialogDescription>
            </DialogHeader>
            {user ? (
              <BecomeArbiterForm onSuccess={() => setAnnounced(true)} />
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Log in to become an arbiter.</p>
                <LoginArea className="w-full" />
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
