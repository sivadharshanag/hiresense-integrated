import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { applicationsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, Clock, Calendar } from 'lucide-react';

interface UpdateStatusDialogProps {
  applicationId: string;
  currentStatus: string;
  applicantName: string;
  onStatusUpdated: () => void;
  trigger?: React.ReactNode;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', icon: Clock, color: 'text-gray-500' },
  { value: 'under_review', label: 'Under Review', icon: Clock, color: 'text-blue-500' },
  { value: 'reviewing', label: 'Reviewing', icon: Clock, color: 'text-blue-500' },
  { value: 'shortlisted', label: 'Shortlisted', icon: CheckCircle, color: 'text-green-500' },
  { value: 'interview', label: 'Interview Scheduled', icon: Calendar, color: 'text-purple-500' },
  { value: 'selected', label: 'Selected', icon: CheckCircle, color: 'text-green-600' },
  { value: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-red-500' },
];

export const UpdateStatusDialog = ({
  applicationId,
  currentStatus,
  applicantName,
  onStatusUpdated,
  trigger,
}: UpdateStatusDialogProps) => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!status) {
      toast({
        title: 'Status required',
        description: 'Please select a status',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await applicationsApi.updateStatus(applicationId, status, note || undefined);
      
      toast({
        title: 'Status Updated',
        description: `Application status updated to ${STATUS_OPTIONS.find(s => s.value === status)?.label}`,
      });
      
      setOpen(false);
      setNote('');
      onStatusUpdated();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button size="sm">Update Status</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Application Status</DialogTitle>
          <DialogDescription>
            Update the status for {applicantName}'s application
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className={`w-4 h-4 ${option.color}`} />
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Feedback Note (Optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note about this status change (visible to candidate)..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              This note will be visible to the candidate in their application timeline
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Status'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
