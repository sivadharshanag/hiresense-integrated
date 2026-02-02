import { CheckCircle, Clock, XCircle, Calendar, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StatusHistoryEntry {
  status: string;
  timestamp: string;
  note?: string;
  changedBy?: {
    fullName: string;
  };
}

interface ApplicationTimelineProps {
  statusHistory: StatusHistoryEntry[];
  currentStatus: string;
}

const STATUS_CONFIG = {
  pending: {
    label: 'Application Submitted',
    icon: Clock,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
  },
  under_review: {
    label: 'Under Review',
    icon: Clock,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
  },
  reviewing: {
    label: 'Reviewing',
    icon: Clock,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
  },
  shortlisted: {
    label: 'Shortlisted',
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
  },
  interview: {
    label: 'Interview Scheduled',
    icon: Calendar,
    color: 'text-purple-500',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-300',
  },
  selected: {
    label: 'Selected',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-400',
  },
  rejected: {
    label: 'Not Selected',
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
  },
};

export const ApplicationTimeline = ({ statusHistory, currentStatus }: ApplicationTimelineProps) => {
  const sortedHistory = [...statusHistory].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Application Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-8 bottom-0 w-0.5 bg-border" />

          {/* Timeline items */}
          <div className="space-y-8">
            {sortedHistory.map((entry, index) => {
              const config = STATUS_CONFIG[entry.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
              const { date, time } = formatDate(entry.timestamp);
              const Icon = config.icon;
              const isLast = index === sortedHistory.length - 1;

              return (
                <div key={index} className="relative flex gap-4">
                  {/* Icon circle */}
                  <div className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full ${config.bgColor} border-2 ${config.borderColor} flex items-center justify-center ${isLast ? 'ring-4 ring-primary/20' : ''}`}>
                    <Icon className={`w-6 h-6 ${config.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-8">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-lg">{config.label}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-muted-foreground">{date}</span>
                          <span className="text-sm text-muted-foreground">•</span>
                          <span className="text-sm text-muted-foreground">{time}</span>
                        </div>
                      </div>
                      {isLast && (
                        <Badge variant="default" className="flex-shrink-0">
                          Current
                        </Badge>
                      )}
                    </div>

                    {entry.note && (
                      <div className="mt-3 p-3 bg-secondary/50 rounded-lg border">
                        <p className="text-sm text-muted-foreground flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{entry.note}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Status Summary */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current Status</p>
              <p className="text-lg font-semibold mt-1">
                {STATUS_CONFIG[currentStatus as keyof typeof STATUS_CONFIG]?.label || 'Pending'}
              </p>
            </div>
            <Badge
              variant={
                currentStatus === 'selected' || currentStatus === 'shortlisted'
                  ? 'selected'
                  : currentStatus === 'rejected'
                  ? 'rejected'
                  : 'review'
              }
              className="text-sm px-3 py-1"
            >
              {STATUS_CONFIG[currentStatus as keyof typeof STATUS_CONFIG]?.label || 'Pending'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
