import { useState, useEffect } from 'react';
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { interviewsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Calendar as CalendarIcon, Clock, Loader2, Video, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ScheduleInterviewDialogProps {
  applicationId: string;
  applicantName: string;
  jobTitle: string;
  onScheduled: () => void;
  trigger?: React.ReactNode;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  displayTime: string;
}

export const ScheduleInterviewDialog = ({
  applicationId,
  applicantName,
  jobTitle,
  onScheduled,
  trigger,
}: ScheduleInterviewDialogProps) => {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [duration, setDuration] = useState('60');
  const [type, setType] = useState('Technical');
  const [meetingLink, setMeetingLink] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (date) {
      loadAvailableSlots();
    }
  }, [date, duration]);

  const loadAvailableSlots = async () => {
    if (!date) return;
    
    try {
      setIsLoadingSlots(true);
      const response = await interviewsApi.getAvailability(
        date.toISOString().split('T')[0],
        parseInt(duration)
      );
      
      if (response.data?.availableSlots) {
        setAvailableSlots(response.data.availableSlots);
        setSelectedSlot(''); // Reset selection when slots change
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load available slots',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleSchedule = async () => {
    if (!date || !selectedSlot) {
      toast({
        title: 'Missing Information',
        description: 'Please select a date and time slot',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await interviewsApi.schedule({
        applicationId,
        scheduledTime: selectedSlot,
        duration: parseInt(duration),
        meetingLink: meetingLink || undefined,
        type,
        notes: notes || undefined,
      });

      toast({
        title: 'Interview Scheduled!',
        description: `Interview with ${applicantName} has been scheduled`,
      });

      setOpen(false);
      resetForm();
      onScheduled();
    } catch (error: any) {
      toast({
        title: 'Scheduling Failed',
        description: error.message || 'Failed to schedule interview',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setDate(undefined);
    setSelectedSlot('');
    setAvailableSlots([]);
    setDuration('60');
    setType('Technical');
    setMeetingLink('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Schedule Interview
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Interview</DialogTitle>
          <DialogDescription>
            Schedule an interview with {applicantName} for {jobTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Duration Selection */}
          <div className="space-y-2">
            <Label>Interview Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Select Date</Label>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(date) => date < new Date()}
              className="rounded-md border"
            />
          </div>

          {/* Time Slots */}
          {date && (
            <div className="space-y-2">
              <Label>Available Time Slots</Label>
              {isLoadingSlots ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No available slots for this date</p>
                  <p className="text-sm">Try a different date or duration</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                  {availableSlots.map((slot) => (
                    <Button
                      key={slot.startTime}
                      variant={selectedSlot === slot.startTime ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedSlot(slot.startTime)}
                      className="text-xs"
                    >
                      {selectedSlot === slot.startTime && (
                        <CheckCircle className="w-3 h-3 mr-1" />
                      )}
                      {slot.displayTime.split(' - ')[0]}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Interview Type */}
          <div className="space-y-2">
            <Label>Interview Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Technical">Technical Round</SelectItem>
                <SelectItem value="Behavioral">Behavioral Round</SelectItem>
                <SelectItem value="HR">HR Round</SelectItem>
                <SelectItem value="Final">Final Round</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Meeting Link */}
          <div className="space-y-2">
            <Label htmlFor="meetingLink">Meeting Link (Optional)</Label>
            <div className="flex gap-2">
              <Video className="w-5 h-5 text-muted-foreground mt-2" />
              <Input
                id="meetingLink"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/abc-defg-hij"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes or instructions..."
              rows={3}
            />
          </div>

          {/* Summary */}
          {selectedSlot && (
            <div className="p-4 bg-secondary/50 rounded-lg space-y-2">
              <p className="font-medium">Interview Summary:</p>
              <div className="text-sm space-y-1 text-muted-foreground">
                <p>• Candidate: {applicantName}</p>
                <p>• Date: {date?.toLocaleDateString()}</p>
                <p>
                  • Time:{' '}
                  {availableSlots.find((s) => s.startTime === selectedSlot)?.displayTime}
                </p>
                <p>• Duration: {duration} minutes</p>
                <p>• Type: {type}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSchedule} disabled={!selectedSlot || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <CalendarIcon className="w-4 h-4 mr-2" />
                Schedule Interview
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
