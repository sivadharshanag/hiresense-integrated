import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { applicationsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  Briefcase,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  MapPin,
  Calendar,
  Sparkles,
  FileText,
} from 'lucide-react';

interface Application {
  _id: string;
  jobId: {
    _id: string;
    title: string;
    department: string;
    location: string;
    employmentType: string;
    salaryMin?: number;
    salaryMax?: number;
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
  };
}

const ApplicationFeedback = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setIsLoading(true);
      const response = await applicationsApi.getMyApplications();
      if (response.data?.applications) {
        setApplications(response.data.applications);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch applications',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'selected':
      case 'shortlisted':
      case 'interview':
        return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-700 border-red-500/20';
      case 'reviewing':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      default:
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'selected':
      case 'shortlisted':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <Briefcase className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Applications Yet</h2>
        <p className="text-muted-foreground">
          You haven't applied to any jobs yet. Browse available positions to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Your Applications</h1>
        <p className="text-muted-foreground mt-1">
          Track your job applications and view AI feedback
        </p>
      </div>

      <div className="grid gap-6">
        {applications.map((app) => (
          <Card key={app._id}>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Briefcase className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{app.jobId.title}</h3>
                        <p className="text-sm text-muted-foreground">{app.jobId.department}</p>
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(app.status)} border`}>
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(app.status)}
                        <span className="capitalize">{app.status.replace('_', ' ')}</span>
                      </div>
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {app.jobId.location}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {app.jobId.employmentType}
                    </div>
                    {app.jobId.salaryMin && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium">₹</span>
                        ₹{app.jobId.salaryMin.toLocaleString()} - ₹{app.jobId.salaryMax?.toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Applied on {new Date(app.appliedAt).toLocaleDateString()}
                  </div>

                  {app.coverLetter && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-2 text-sm font-medium mb-2">
                        <FileText className="w-4 h-4" />
                        Cover Letter
                      </div>
                      <p className="text-sm text-muted-foreground">{app.coverLetter}</p>
                    </div>
                  )}
                </div>

                {app.aiInsights && (
                  <div className="lg:w-80">
                    <Card className="bg-gradient-to-br from-primary/5 to-transparent">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          AI Evaluation
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Overall Score</span>
                          <Badge>{app.aiInsights.overallScore}/100</Badge>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Skills</span>
                            <span>{app.aiInsights.skillMatch}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Experience</span>
                            <span>{app.aiInsights.experienceScore}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">GitHub</span>
                            <span>{app.aiInsights.githubScore}/100</span>
                          </div>
                        </div>

                        {app.aiInsights.strengths.length > 0 && (
                          <div className="pt-2 border-t">
                            <p className="text-xs font-medium mb-1">Strengths</p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {app.aiInsights.strengths.slice(0, 2).map((s, i) => (
                                <li key={i}>• {s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ApplicationFeedback;
