import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { type TaskProposal } from '@/lib/catallax';
import { EditProjectForm } from './EditProjectForm';
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
 * "Edit" affordance for a proposed task's patron. The caller decides whether to
 * render this (via `canEditTask`); this component is the dialog + form only.
 */
export function EditProjectDialog({ task }: { task: TaskProposal }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
          <DialogDescription>Correct the details of your proposed project.</DialogDescription>
        </DialogHeader>
        <EditProjectForm task={task} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
