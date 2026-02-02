import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { applicationsApi } from '@/lib/api';

interface StatusUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  targetStatus: string;
  candidateName: string;
  onConfirm: (note: string) => Promise<void>;
}

// Map status to action for API
const statusToAction: Record<string, 'select' | 'reject' | 'shortlist' | 'interview' | 'review'> = {
  'reviewing': 'review',
  'shortlisted': 'shortlist',
  'interview': 'interview',
  'rejected': 'reject',
  'selected': 'select',
  'hired': 'select',
};

const statusLabels: Record<string, string> = {
  'reviewing': 'Mark as Reviewing',
  'shortlisted': 'Shortlist Candidate',
  'interview': 'Schedule Interview',
  'rejected': 'Reject Application',
  'selected': 'Select Candidate',
  'hired': 'Hire Candidate',
};

export function StatusUpdateDialog({
  open,
  onOpenChange,
  applicationId,
  targetStatus,
  candidateName,
  onConfirm,
}: StatusUpdateDialogProps) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Debug log
  console.log('StatusUpdateDialog render:', { open, applicationId, targetStatus });

  // Auto-generate justification when dialog opens
  useEffect(() => {
    console.log('useEffect triggered:', { open, applicationId });
    if (open && applicationId) {
      generateJustification();
    }
  }, [open, applicationId, targetStatus]);

  const generateJustification = async () => {
    const action = statusToAction[targetStatus] || 'review';
    setGenerating(true);
    try {
      const response = await applicationsApi.generateJustification(applicationId, action);
      const data = response.data as { justification?: string };
      if (data?.justification) {
        setNote(data.justification);
      }
    } catch (error) {
      console.error('Failed to generate justification:', error);
      // Keep existing note if generation fails
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(note);
      setNote('');
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in parent
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNote('');
    onOpenChange(false);
  };

  const isDestructive = targetStatus === 'rejected';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className={isDestructive ? 'text-destructive' : ''}>
            {statusLabels[targetStatus] || 'Update Status'}
          </DialogTitle>
          <DialogDescription>
            {isDestructive 
              ? `Are you sure you want to reject ${candidateName}'s application?`
              : `Update ${candidateName}'s application status.`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="note" className="flex items-center gap-2">
                Decision Notes
                {generating && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="w-3 h-3 animate-pulse text-primary" />
                    AI generating...
                  </span>
                )}
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={generateJustification}
                disabled={generating}
                className="h-7 text-xs"
              >
                {generating ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3 mr-1" />
                )}
                Regenerate
              </Button>
            </div>
            <Textarea
              id="note"
              placeholder={generating ? 'Generating AI-powered justification...' : 'Add notes about this decision...'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[150px] resize-none"
              disabled={generating}
            />
            <p className="text-xs text-muted-foreground">
              <Sparkles className="w-3 h-3 inline mr-1" />
              AI-generated notes based on candidate evaluation. Feel free to edit before saving.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || generating}
            variant={isDestructive ? 'destructive' : 'default'}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {statusLabels[targetStatus] || 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
