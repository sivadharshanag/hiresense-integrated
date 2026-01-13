import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { applicationsApi, aiApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { UpdateStatusDialog } from '@/components/recruiter/UpdateStatusDialog';
import { ScheduleInterviewDialog } from '@/components/recruiter/ScheduleInterviewDialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  User,
  Mail,
  Briefcase,
  ArrowLeft,
  Loader2,
  Sparkles,
  Eye,
  CheckCircle2,
  Scale,
  Calendar,
  Filter,
  Clock,
  Download,
} from 'lucide-react';

interface Application {
  _id: string;
  applicantId: {
    _id: string;
    fullName: string;
    email: string;
  };
  jobId: {
    _id: string;
    title: string;
    applicationDeadline?: string;
  };
  status: string;
  appliedAt: string;
  coverLetter?: string;
  aiInsights?: {
    overallScore: number;
    skillMatch: number;
    experienceScore: number;
    githubScore: number;
    recommendation: string;
  };
}

const JobApplications = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const jobId = searchParams.get('jobId');
  const { toast } = useToast();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredApplications = statusFilter === 'all' 
    ? applications 
    : applications.filter(app => app.status === statusFilter);

  const statusCounts = {
    all: applications.length,
    pending: applications.filter(app => app.status === 'pending').length,
    shortlisted: applications.filter(app => app.status === 'shortlisted').length,
    selected: applications.filter(app => app.status === 'selected').length,
    rejected: applications.filter(app => app.status === 'rejected').length,
  };

  useEffect(() => {
    if (jobId) {
      loadApplications();
    }
  }, [jobId]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const response = await applicationsApi.getByJob(jobId!);
      if (response.data?.applications) {
        setApplications(response.data.applications);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load applications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluateAll = async () => {
    setEvaluating(true);
    try {
      await aiApi.evaluateJobApplications(jobId!);
      toast({
        title: 'Evaluation Complete',
        description: 'All applications have been evaluated',
      });
      loadApplications();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to evaluate applications',
        variant: 'destructive',
      });
    } finally {
      setEvaluating(false);
    }
  };

  const handleViewDetails = (applicationId: string) => {
    navigate(`/recruiter/candidates?id=${applicationId}`);
  };

  const handleToggleSelection = (applicationId: string) => {
    setSelectedCandidates((prev) =>
      prev.includes(applicationId)
        ? prev.filter((id) => id !== applicationId)
        : [...prev, applicationId]
    );
  };

  const handleCompare = () => {
    // Navigate to full-page comparison view
    const ids = selectedCandidates.join(',');
    navigate(`/recruiter/compare?ids=${ids}`);
  };

  // Export candidates to CSV
  const exportToCSV = () => {
    if (applications.length === 0) {
      toast({
        title: 'No Data',
        description: 'No candidates available to export.',
        variant: 'destructive',
      });
      return;
    }

    // CSV headers
    const headers = [
      'Candidate Name',
      'Email',
      'Job Title',
      'Status',
      'Overall Score',
      'Skill Match',
      'Experience Score',
      'GitHub Score',
      'Recommendation',
      'Applied Date',
    ];

    // CSV rows
    const rows = applications.map((app) => {
      const insights = app.aiInsights;
      return [
        app.applicantId.fullName,
        app.applicantId.email,
        app.jobId.title,
        app.status,
        insights?.overallScore ?? 'N/A',
        insights?.skillMatch ?? 'N/A',
        insights?.experienceScore ?? 'N/A',
        insights?.githubScore ?? 'N/A',
        insights?.recommendation ?? 'N/A',
        new Date(app.appliedAt).toLocaleDateString(),
      ];
    });

    // Escape CSV values
    const escapeCSV = (value: string | number) => {
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Build CSV content
    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `job-applications-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Successful',
      description: `${applications.length} application${applications.length !== 1 ? 's' : ''} exported to CSV.`,
    });
  };

  const getDeadlineInfo = () => {
    if (!applications[0]?.jobId?.applicationDeadline) return null;
    
    const deadline = new Date(applications[0].jobId.applicationDeadline);
    const now = new Date();
    const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      date: deadline.toLocaleDateString(),
      daysLeft,
      isExpired: daysLeft < 0,
      isUrgent: daysLeft <= 3 && daysLeft >= 0
    };
  };

  const deadlineInfo = getDeadlineInfo();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => navigate('/recruiter/jobs')} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Jobs
          </Button>
          <h1 className="text-3xl font-bold">Job Applications</h1>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-muted-foreground">
              {filteredApplications.length} application{filteredApplications.length !== 1 ? 's' : ''}
              {statusFilter !== 'all' && ` (filtered by ${statusFilter})`}
            </p>
            {deadlineInfo && (
              <Badge 
                variant={deadlineInfo.isExpired ? 'destructive' : deadlineInfo.isUrgent ? 'default' : 'secondary'}
                className="flex items-center gap-1"
              >
                <Clock className="w-3 h-3" />
                {deadlineInfo.isExpired 
                  ? 'Deadline Passed' 
                  : `${deadlineInfo.daysLeft} day${deadlineInfo.daysLeft !== 1 ? 's' : ''} left`}
              </Badge>
            )}
          </div>
        </div>
        {applications.length > 0 && (
          <div className="flex gap-2">
            {selectedCandidates.length >= 2 && (
              <Button onClick={handleCompare} variant="default">
                <Scale className="w-4 h-4 mr-2" />
                Compare ({selectedCandidates.length})
              </Button>
            )}
            <Button onClick={handleEvaluateAll} disabled={evaluating}>
              {evaluating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Evaluating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Evaluate All
                </>
              )}
            </Button>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        )}
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">No Applications Yet</h2>
            <p className="text-muted-foreground">
              No candidates have applied to this job yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filter Section */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filter by Status:</span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant={statusFilter === 'all' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setStatusFilter('all')}
                  >
                    All ({statusCounts.all})
                  </Button>
                  <Button 
                    variant={statusFilter === 'pending' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setStatusFilter('pending')}
                  >
                    Pending ({statusCounts.pending})
                  </Button>
                  <Button 
                    variant={statusFilter === 'shortlisted' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setStatusFilter('shortlisted')}
                  >
                    Shortlisted ({statusCounts.shortlisted})
                  </Button>
                  <Button 
                    variant={statusFilter === 'selected' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setStatusFilter('selected')}
                  >
                    Selected ({statusCounts.selected})
                  </Button>
                  <Button 
                    variant={statusFilter === 'rejected' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setStatusFilter('rejected')}
                  >
                    Rejected ({statusCounts.rejected})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {filteredApplications.map((app) => (
            <Card key={app._id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {app.aiInsights && (
                      <Checkbox
                        checked={selectedCandidates.includes(app._id)}
                        onCheckedChange={() => handleToggleSelection(app._id)}
                        disabled={!app.aiInsights}
                      />
                    )}
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{app.applicantId.fullName}</h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {app.applicantId.email}
                        </span>
                        <span>•</span>
                        <span>Applied {new Date(app.appliedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {app.aiInsights && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {app.aiInsights.overallScore}
                        </div>
                        <div className="text-xs text-muted-foreground">AI Score</div>
                      </div>
                    )}
                    <Badge className="capitalize">{app.status.replace('_', ' ')}</Badge>
                    <ScheduleInterviewDialog
                      applicationId={app._id}
                      applicantName={app.applicantId.fullName}
                      jobTitle={app.jobId.title}
                      onScheduled={loadApplications}
                      trigger={<Button size="sm" variant="default">Schedule Interview</Button>}
                    />
                    <UpdateStatusDialog
                      applicationId={app._id}
                      currentStatus={app.status}
                      applicantName={app.applicantId.fullName}
                      onStatusUpdated={loadApplications}
                      trigger={<Button size="sm" variant="outline">Update Status</Button>}
                    />
                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(app._id)}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </div>

                {app.coverLetter && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Cover Letter:</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {app.coverLetter}
                    </p>
                  </div>
                )}

                {app.aiInsights && (
                  <div className="mt-4 pt-4 border-t flex gap-6 text-sm">
                    <div>
                      <span className="text-muted-foreground">Skills: </span>
                      <span className="font-medium">{app.aiInsights.skillMatch}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Experience: </span>
                      <span className="font-medium">{app.aiInsights.experienceScore}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">GitHub: </span>
                      <span className="font-medium">{app.aiInsights.githubScore}/100</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Recommendation: </span>
                      <Badge variant="secondary" className="capitalize">
                        {app.aiInsights.recommendation}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            ))}
          </div>
        </>
      )}

    </div>
  );
};

export default JobApplications;
