import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { interviewsApi } from '@/lib/api';
import { Calendar as CalendarIcon, Clock, Video, User, Briefcase, Link as LinkIcon, Loader2, XCircle, Edit, AlertTriangle, CheckCircle, Bell, Info } from 'lucide-react';
import RescheduleInterviewDialog from '@/components/recruiter/RescheduleInterviewDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Interview {
  _id: string;
  applicationId: {
    applicantId: {
      fullName: string;
      email: string;
    };
    jobId: {
      title: string;
      department: string;
    };
  };
  scheduledTime: string;
  duration: number;
  type: string;
  meetingLink: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  notes?: string;
  // Drop-off detection fields
  candidateConfirmed?: boolean;
  dropOffRisk?: 'low' | 'medium' | 'high';
  dropOffReasons?: string[];
  reminderCount?: number;
}

interface DropOffAnalytics {
  totalScheduled: number;
  confirmed: number;
  unconfirmed: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  confirmationRate: number;
}

const InterviewScheduling = () => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [analytics, setAnalytics] = useState<DropOffAnalytics | null>(null);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadInterviews();
    loadAnalytics();
  }, [filterStatus]);

  const loadInterviews = async () => {
    try {
      setIsLoading(true);
      const params = filterStatus ? { status: filterStatus } : undefined;
      const response = await interviewsApi.getAll(params);
      
      if (response.data?.interviews) {
        setInterviews(response.data.interviews);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load interviews',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await interviewsApi.getDropOffAnalytics();
      if (response.data) {
        setAnalytics(response.data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const handleSendReminder = async (interviewId: string) => {
    setSendingReminder(interviewId);
    try {
      await interviewsApi.sendReminder(interviewId);
      toast({
        title: '📧 Reminder Sent',
        description: 'Interview reminder has been sent to the candidate',
      });
      loadInterviews();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send reminder',
        variant: 'destructive',
      });
    } finally {
      setSendingReminder(null);
    }
  };

  const getRiskBadge = (risk?: string, confirmed?: boolean, reasons?: string[]) => {
    if (confirmed) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Confirmed
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>✅ Candidate has confirmed attendance</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    const riskConfig = {
      high: {
        variant: 'destructive' as const,
        className: 'bg-red-100 text-red-700 hover:bg-red-200',
        icon: <AlertTriangle className="w-3 h-3 mr-1" />,
        label: '⚠️ High Risk'
      },
      medium: {
        variant: 'secondary' as const,
        className: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
        icon: <Info className="w-3 h-3 mr-1" />,
        label: 'Medium Risk'
      },
      low: {
        variant: 'default' as const,
        className: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
        icon: null,
        label: 'Low Risk'
      }
    };

    const config = riskConfig[risk as keyof typeof riskConfig] || riskConfig.low;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant={config.variant} className={config.className}>
              {config.icon}
              {config.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="font-semibold mb-1">Drop-off Risk Signals:</p>
            <ul className="text-sm space-y-1">
              {reasons?.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              )) || <li>No specific signals detected</li>}
            </ul>
            <p className="text-xs mt-2 text-muted-foreground italic">
              This is a risk signal, not a verdict.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const handleJoinMeeting = (meetingLink: string) => {
    // Validate the meeting link before opening
    if (!meetingLink) {
      toast({
        title: 'No Meeting Link',
        description: 'No meeting link has been set for this interview',
        variant: 'destructive',
      });
      return;
    }

    // Ensure the link starts with https://
    let validLink = meetingLink;
    if (!meetingLink.startsWith('http://') && !meetingLink.startsWith('https://')) {
      validLink = 'https://' + meetingLink;
    }

    // Validate that it's a proper meeting link
    const validPatterns = [
      /meet\.google\.com/i,
      /zoom\.us/i,
      /teams\.microsoft\.com/i,
    ];

    const isValidMeetingLink = validPatterns.some(pattern => pattern.test(validLink));

    if (!isValidMeetingLink) {
      toast({
        title: 'Invalid Meeting Link',
        description: 'The meeting link appears to be invalid. Please update it.',
        variant: 'destructive',
      });
      return;
    }

    window.open(validLink, '_blank');
  };

  const handleCancelInterview = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this interview?')) return;

    try {
      await interviewsApi.cancel(id);
      toast({
        title: 'Interview Cancelled',
        description: 'The interview has been cancelled successfully',
      });
      loadInterviews();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel interview',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      scheduled: 'default',
      rescheduled: 'secondary',
      completed: 'selected',
      cancelled: 'rejected',
    };
    return variants[status as keyof typeof variants] || 'default';
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Interview Scheduling</h1>
          <p className="text-muted-foreground">
            Manage candidate interviews and meetings • {interviews.length} total interviews
          </p>
        </div>
        <div className="flex gap-2">
          <select
            className="px-3 py-2 border rounded-md text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Interviews</option>
            <option value="scheduled">Scheduled</option>
            <option value="rescheduled">Rescheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Drop-off Analytics Summary */}
      {analytics && analytics.totalScheduled > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Interview Attendance Monitoring
            </CardTitle>
            <CardDescription>
              Proactive detection of candidates who may miss their interviews
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <p className="text-2xl font-bold text-primary">{analytics.totalScheduled}</p>
                <p className="text-xs text-muted-foreground">Scheduled</p>
              </div>
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <p className="text-2xl font-bold text-green-600">{analytics.confirmed}</p>
                <p className="text-xs text-muted-foreground">Confirmed</p>
              </div>
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <p className="text-2xl font-bold text-red-600">{analytics.highRisk}</p>
                <p className="text-xs text-muted-foreground">High Risk</p>
              </div>
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <p className="text-2xl font-bold text-amber-600">{analytics.mediumRisk}</p>
                <p className="text-xs text-muted-foreground">Medium Risk</p>
              </div>
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <p className="text-2xl font-bold text-blue-600">{analytics.confirmationRate}%</p>
                <p className="text-xs text-muted-foreground">Confirmation Rate</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center italic">
              💡 Risk signals help you take proactive action. They are not verdicts about candidate attendance.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Interviews List */}
      {interviews.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CalendarIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">No Interviews Scheduled</h2>
            <p className="text-muted-foreground">
              Schedule interviews from the job applications page
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {interviews.map((interview) => {
            const { date, time } = formatDateTime(interview.scheduledTime);
            return (
              <Card key={interview._id}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left Section - Candidate Info */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {interview.applicationId.applicantId.fullName}
                        </h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Briefcase className="w-4 h-4" />
                          {interview.applicationId.jobId.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {interview.applicationId.applicantId.email}
                        </p>
                      </div>
                    </div>

                    {/* Middle Section - Interview Details */}
                    <div className="flex flex-wrap gap-6 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Date & Time</p>
                        <p className="font-medium flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4 text-primary" />
                          {date}
                        </p>
                        <p className="font-medium flex items-center gap-1">
                          <Clock className="w-4 h-4 text-primary" />
                          {time} ({interview.duration} min)
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Type</p>
                        <Badge variant="secondary">{interview.type}</Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Status</p>
                        <Badge variant={getStatusBadge(interview.status) as any}>
                          {interview.status}
                        </Badge>
                      </div>
                      {interview.status === 'scheduled' && (
                        <div>
                          <p className="text-muted-foreground mb-1">Attendance</p>
                          {getRiskBadge(interview.dropOffRisk, interview.candidateConfirmed, interview.dropOffReasons)}
                        </div>
                      )}
                    </div>

                    {/* Right Section - Actions */}
                    <div className="flex flex-col gap-2">
                      {interview.meetingLink && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleJoinMeeting(interview.meetingLink)}
                        >
                          <Video className="w-4 h-4 mr-2" />
                          Join Meeting
                        </Button>
                      )}
                      {interview.status === 'scheduled' && (
                        <>
                          {/* Send Reminder Button - show for unconfirmed interviews */}
                          {!interview.candidateConfirmed && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendReminder(interview._id)}
                              disabled={sendingReminder === interview._id}
                              className="border-amber-300 text-amber-700 hover:bg-amber-50"
                            >
                              {sendingReminder === interview._id ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Bell className="w-4 h-4 mr-2" />
                              )}
                              {interview.reminderCount ? `Remind (${interview.reminderCount})` : 'Send Reminder'}
                            </Button>
                          )}
                          <RescheduleInterviewDialog
                            interviewId={interview._id}
                            currentScheduledTime={interview.scheduledTime}
                            currentDuration={interview.duration}
                            currentType={interview.type}
                            currentMeetingLink={interview.meetingLink}
                            currentNotes={interview.notes}
                            applicantName={interview.applicationId.applicantId.fullName}
                            jobTitle={interview.applicationId.jobId.title}
                            onRescheduled={loadInterviews}
                            trigger={
                              <Button size="sm" variant="secondary">
                                <Edit className="w-4 h-4 mr-2" />
                                Reschedule
                              </Button>
                            }
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleCancelInterview(interview._id)}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {interview.notes && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium mb-1">Notes:</p>
                      <p className="text-sm text-muted-foreground">{interview.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InterviewScheduling;
