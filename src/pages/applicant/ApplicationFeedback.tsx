import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { applicationsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  Briefcase,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Lightbulb,
  Calendar,
  Sparkles,
  ThumbsUp,
  ArrowUpRight,
  Loader2,
  MapPin,
} from 'lucide-react';

interface Application {
  _id: string;
  jobId: {
    _id: string;
    title: string;
    department: string;
    location: string;
    employmentType: string;
  };
  status: string;
  appliedAt: string;
  coverLetter?: string;
  aiInsights?: {
    overallScore: number;
    skillMatch: number;
    experienceScore: number;
    githubScore: number;
    strengths: string[];
    gaps: string[];
    recommendation: string;
  };
}

const ApplicationFeedback = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'selected':
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Clock className="w-5 h-5 text-warning" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-accent" />
          Application Feedback
        </h1>
        <p className="text-muted-foreground">
          View AI-generated feedback and insights for your applications
        </p>
      </div>

      {/* Applications List */}
      <Tabs defaultValue={mockApplications[0].id} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
          {mockApplications.map((app) => (
            <TabsTrigger
              key={app.id}
              value={app.id}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground bg-secondary px-4 py-2 rounded-lg"
            >
              <div className="flex items-center gap-2">
                {getStatusIcon(app.status)}
                <span>{app.company}</span>
              </div>
            </TabsTrigger>
          ))}
        </TabsList>

        {mockApplications.map((app) => (
          <TabsContent key={app.id} value={app.id} className="space-y-4">
            {/* Application Overview */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Briefcase className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">{app.role}</h2>
                      <p className="text-muted-foreground">{app.company}</p>
                      <p className="text-sm text-muted-foreground mt-1">Applied on {app.appliedDate}</p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      app.status === 'selected'
                        ? 'selected'
                        : app.status === 'rejected'
                        ? 'rejected'
                        : 'review'
                    }
                    className="text-sm py-2 px-4"
                  >
                    {app.status === 'review' ? 'Under Review' : app.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Interview Details (if selected) */}
            {app.status === 'selected' && app.interviewDetails && (
              <Card className="border-success/30 bg-success/5">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-success">
                    <Calendar className="w-5 h-5" />
                    Interview Scheduled
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium text-foreground">{app.interviewDetails.date}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Time</p>
                      <p className="font-medium text-foreground">{app.interviewDetails.time}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="font-medium text-foreground">{app.interviewDetails.type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Meeting Link</p>
                      <a
                        href={app.interviewDetails.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        Join Meeting
                        <ArrowUpRight className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Feedback Section */}
            {app.feedback && (
              <>
                {/* Strengths */}
                {app.feedback.strengths.length > 0 && (
                  <Card className="border-success/30 bg-success/5">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2 text-success">
                        <ThumbsUp className="w-5 h-5" />
                        Your Strengths
                      </CardTitle>
                      <CardDescription>Areas where you excelled</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {app.feedback.strengths.map((strength, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                            <span className="text-foreground">{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Skill Gaps */}
                {app.feedback.skillGaps.length > 0 && (
                  <Card className="border-warning/30 bg-warning/5">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2 text-warning">
                        <AlertTriangle className="w-5 h-5" />
                        Skill Gaps Identified
                      </CardTitle>
                      <CardDescription>Areas for improvement based on job requirements</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {app.feedback.skillGaps.map((skill, index) => (
                          <Badge key={index} variant="warning">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Improvement Suggestions */}
                {app.feedback.improvements.length > 0 && (
                  <Card className="gradient-ai">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2 text-accent-foreground">
                        <Lightbulb className="w-5 h-5" />
                        AI Improvement Suggestions
                      </CardTitle>
                      <CardDescription className="text-accent-foreground/80">
                        Recommendations to improve your chances
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {app.feedback.improvements.map((improvement, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-3 p-3 bg-accent-foreground/10 rounded-lg"
                          >
                            <span className="w-6 h-6 rounded-full bg-accent-foreground/20 flex items-center justify-center text-sm font-bold text-accent-foreground flex-shrink-0">
                              {index + 1}
                            </span>
                            <span className="text-accent-foreground">{improvement}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* No Feedback Yet */}
            {!app.feedback && app.status === 'review' && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Clock className="w-12 h-12 text-warning mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Application Under Review</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Your application is currently being reviewed. You'll receive AI-generated feedback
                    once the review is complete.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default ApplicationFeedback;
