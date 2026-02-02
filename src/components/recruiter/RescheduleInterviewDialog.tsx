import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { interviewsApi } from '@/lib/api';
import { Calendar as CalendarIcon, Clock, Video, CheckCircle, Loader2 } from 'lucide-react';

interface RescheduleInterviewDialogProps {
  interviewId: string;
  currentScheduledTime: string;
  currentDuration: number;
  currentType: string;
  currentMeetingLink: string;
  currentNotes?: string;
  applicantName: string;
  jobTitle: string;
  onRescheduled: () => void;
  trigger?: React.ReactNode;
}

const RescheduleInterviewDialog = ({
  interviewId,
  currentScheduledTime,
  currentDuration,
  currentType,
  currentMeetingLink,
  currentNotes,
  applicantName,
  jobTitle,
  onRescheduled,
  trigger,
}: RescheduleInterviewDialogProps) => {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date(currentScheduledTime));
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [duration, setDuration] = useState(currentDuration);
  const [type, setType] = useState(currentType);
  const [meetingLink, setMeetingLink] = useState(currentMeetingLink);
  const [notes, setNotes] = useState(currentNotes || '');
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (date && open) {
      loadAvailableSlots();
    }
  }, [date, duration, open]);

  useEffect(() => {
    if (open) {
      // Reset to current values when dialog opens
      setDate(new Date(currentScheduledTime));
      setDuration(currentDuration);
      setType(currentType);
      setMeetingLink(currentMeetingLink);
      setNotes(currentNotes || '');
      
      // Set selected slot to current time
      const currentTime = new Date(currentScheduledTime);
      const hours = currentTime.getHours();
      const minutes = currentTime.getMinutes();
      setSelectedSlot(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
    }
  }, [open, currentScheduledTime, currentDuration, currentType, currentMeetingLink, currentNotes]);

  const loadAvailableSlots = async () => {
    if (!date) return;

    try {
      setIsLoadingSlots(true);
      const dateString = date.toISOString().split('T')[0];
      const response = await interviewsApi.getAvailability(dateString, duration);
      
      const data = response.data as { availableSlots: string[] };
      if (data?.availableSlots) {
        setAvailableSlots(data.availableSlots);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load available time slots',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleReschedule = async () => {
    if (!date || !selectedSlot) {
      toast({
        title: 'Validation Error',
        description: 'Please select a date and time slot',
        variant: 'destructive',
      });
      return;
    }

    // Validate meeting link format
    if (meetingLink && !isValidMeetingLink(meetingLink)) {
      toast({
        title: 'Invalid Meeting Link',
        description: 'Please enter a valid Google Meet, Zoom, or Teams link',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const [hours, minutes] = selectedSlot.split(':').map(Number);
      const scheduledTime = new Date(date);
      scheduledTime.setHours(hours, minutes, 0, 0);

      const updateData = {
        scheduledTime: scheduledTime.toISOString(),
        duration,
        type,
        meetingLink: meetingLink || undefined,
        notes: notes || undefined,
      };

      await interviewsApi.update(interviewId, updateData);

      toast({
        title: 'Interview Rescheduled',
        description: `Interview with ${applicantName} has been rescheduled successfully`,
      });

      setOpen(false);
      onRescheduled();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reschedule interview',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValidMeetingLink = (url: string): boolean => {
    if (!url) return true; // Optional field
    
    const validPatterns = [
      /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/i, // Google Meet
      /^https:\/\/([\w-]+\.)?zoom\.us\/(j|my)\/\d+/i, // Zoom
      /^https:\/\/teams\.microsoft\.com\/l\/meetup-join\//i, // Teams
    ];

    return validPatterns.some(pattern => pattern.test(url));
  };

  const formatSelectedDateTime = () => {
    if (!date || !selectedSlot) return 'Not selected';
    
    const [hours, minutes] = selectedSlot.split(':').map(Number);
    const dateTime = new Date(date);
    dateTime.setHours(hours, minutes);
    
    return dateTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Reschedule</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reschedule Interview</DialogTitle>
          <DialogDescription>
            Update the interview schedule for {applicantName} - {jobTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Duration Selector */}
          <div className="space-y-2">
            <Label>Interview Duration</Label>
            <Select value={duration.toString()} onValueChange={(val) => setDuration(Number(val))}>
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

          {/* Date Picker and Time Slots */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Calendar */}
            <div className="space-y-2">
              <Label>Select Date</Label>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                className="rounded-md border"
              />
            </div>

            {/* Time Slots */}
            <div className="space-y-2">
              <Label>Available Time Slots</Label>
              {isLoadingSlots ? (
                <div className="flex items-center justify-center h-64 border rounded-md">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="border rounded-md p-4 h-64 overflow-y-auto">
                  {availableSlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No available slots for selected date
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot}
                          variant={selectedSlot === slot ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedSlot(slot)}
                          className="w-full"
                        >
                          {selectedSlot === slot && (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          )}
                          {slot}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Interview Type */}
          <div className="space-y-2">
            <Label>Interview Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Technical">Technical Interview</SelectItem>
                <SelectItem value="Behavioral">Behavioral Interview</SelectItem>
                <SelectItem value="HR">HR Interview</SelectItem>
                <SelectItem value="Final">Final Round</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Meeting Link */}
          <div className="space-y-2">
            <Label htmlFor="meetingLink">
              Meeting Link <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <div className="flex gap-2">
              <Video className="w-5 h-5 text-muted-foreground mt-2" />
              <Input
                id="meetingLink"
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Supported: Google Meet, Zoom, Microsoft Teams
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Interview Notes <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="Add any special instructions or notes for the interview..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Summary Card */}
          {date && selectedSlot && (
            <Card className="p-4 bg-primary/5 border-primary/20">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Interview Summary
              </h4>
              <div className="space-y-1 text-sm">
                <p><strong>Candidate:</strong> {applicantName}</p>
                <p><strong>Position:</strong> {jobTitle}</p>
                <p><strong>Date & Time:</strong> {formatSelectedDateTime()}</p>
                <p><strong>Duration:</strong> {duration} minutes</p>
                <p><strong>Type:</strong> {type}</p>
              </div>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleReschedule} disabled={isSubmitting || !date || !selectedSlot}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rescheduling...
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  Reschedule Interview
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RescheduleInterviewDialog;
