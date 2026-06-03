import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { CreateProjectForm } from './CreateProjectForm';
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

/**
 * "Post a project" entry point for the Grantless browse page. Login-gated: logged-in
 * users get the create form; logged-out users are prompted to log in (no publish is
 * possible without a signer). Posting is permissionless — any logged-in key can post.
 */
export function CreateProjectDialog() {
  const { user } = useCurrentUser();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Post a project
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Post a project</DialogTitle>
          <DialogDescription>
            Describe a crowdfunded project. You can add an arbiter and open it for funding next.
          </DialogDescription>
        </DialogHeader>
        {user ? (
          <CreateProjectForm onSuccess={() => setOpen(false)} />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Log in to post a project.</p>
            <LoginArea className="w-full" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
