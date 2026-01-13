import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { applicationsApi } from '@/lib/api';
import { ApplicationTimeline } from '@/components/applicant/ApplicationTimeline';
import RejectionFeedbackCard from '@/components/applicant/RejectionFeedbackCard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Briefcase,
  Clock,
  FileText,
  ArrowRight,
  TrendingUp,
  Loader2,
  Eye,
  MapPin,
  DollarSign,
  Building2,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface RejectionFeedback {
  status: string;
  statusMessage: string;
  reasons: string[];
  improvementAreas: string[];
  learningFocus: string[];
  encouragement: string;
}

interface Application {
  _id: string;
  jobId: {
    _id: string;
    title: string;
    company?: string;
    department?: string;
    location?: string;
    employmentType?: string;
    experienceLevel?: string;
    salaryRange?: {
      min: number;
      max: number;
      currency: string;
    };
    requiredSkills?: string[];
    description?: string;
  };
  status: string;
  appliedAt: string;
  statusHistory?: Array<{
    status: string;
    timestamp: string;
    note?: string;
  }>;
  aiEvaluation?: {
    overallScore: number;
  };
  rejectionFeedback?: RejectionFeedback;
}

const MyApplications = () => {
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<{
    applicationId: string;
    jobTitle: string;
    feedback: RejectionFeedback;
  } | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [expandedApplication, setExpandedApplication] = useState<string | null>(null);
  const [applicationFilter, setApplicationFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    review: 0,
    interview: 0,
    selected: 0,
    rejected: 0,
  });

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await applicationsApi.getMyApplications();
      const apps = (response.data as any)?.applications || [];
      setApplications(apps);

      // Calculate statistics
      setStats({
        total: apps.length,
        pending: apps.filter((a: Application) => a.status === 'pending').length,
        review: apps.filter((a: Application) => a.status === 'reviewing').length,
        interview: apps.filter((a: Application) => a.status === 'interview').length,
        selected: apps.filter((a: Application) => a.status === 'selected').length,
        rejected: apps.filter((a: Application) => a.status === 'rejected').length,
      });
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

  const fetchRejectionFeedback = async (applicationId: string, jobTitle: string) => {
    try {
      setFeedbackLoading(applicationId);
      const response = await applicationsApi.getRejectionFeedback(applicationId);
      const data = (response as any).data;
      
      setSelectedFeedback({
        applicationId,
        jobTitle: data.jobTitle || jobTitle,
        feedback: data.rejectionFeedback
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load feedback',
        variant: 'destructive',
      });
    } finally {
      setFeedbackLoading(null);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'secondary';
      case 'reviewing':
        return 'default';
      case 'interview':
        return 'default';
      case 'selected':
        return 'selected';
      case 'rejected':
        return 'rejected';
      default:
        return 'secondary';
    }
  };

  const getStatusDisplayText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Pending';
      case 'reviewing':
        return 'Under Review';
      case 'interview':
        return 'Interview';
      case 'selected':
        return 'Selected';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'reviewing':
        return <Eye className="w-4 h-4" />;
      case 'interview':
        return <Calendar className="w-4 h-4" />;
      case 'selected':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Filter applications based on status and search query
  const filteredApplications = applications
    .filter(app => applicationFilter === 'all' || app.status === applicationFilter)
    .filter(app => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        app.jobId?.title?.toLowerCase().includes(query) ||
        app.jobId?.company?.toLowerCase().includes(query) ||
        app.jobId?.department?.toLowerCase().includes(query) ||
        app.jobId?.location?.toLowerCase().includes(query)
      );
    });

  if (loading) {
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
          <h1 className="text-2xl font-bold text-foreground">My Applications</h1>
          <p className="text-muted-foreground">
            Track and manage all your job applications
          </p>
        </div>
        <Link to="/applicant/jobs">
          <Button variant="gradient">
            <Briefcase className="w-4 h-4 mr-2" />
            Browse More Jobs
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card 
          className={`cursor-pointer transition-all ${applicationFilter === 'all' ? 'ring-2 ring-primary' : 'hover:bg-secondary/50'}`}
          onClick={() => setApplicationFilter('all')}
        >
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${applicationFilter === 'pending' ? 'ring-2 ring-amber-500' : 'hover:bg-secondary/50'}`}
          onClick={() => setApplicationFilter('pending')}
        >
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-amber-500">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${applicationFilter === 'reviewing' ? 'ring-2 ring-blue-500' : 'hover:bg-secondary/50'}`}
          onClick={() => setApplicationFilter('reviewing')}
        >
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-500">{stats.review}</p>
            <p className="text-xs text-muted-foreground">Reviewing</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${applicationFilter === 'interview' ? 'ring-2 ring-purple-500' : 'hover:bg-secondary/50'}`}
          onClick={() => setApplicationFilter('interview')}
        >
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-purple-500">{stats.interview}</p>
            <p className="text-xs text-muted-foreground">Interview</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${applicationFilter === 'selected' ? 'ring-2 ring-green-500' : 'hover:bg-secondary/50'}`}
          onClick={() => setApplicationFilter('selected')}
        >
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-500">{stats.selected}</p>
            <p className="text-xs text-muted-foreground">Selected</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${applicationFilter === 'rejected' ? 'ring-2 ring-red-500' : 'hover:bg-secondary/50'}`}
          onClick={() => setApplicationFilter('rejected')}
        >
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-red-500">{stats.rejected}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by job title, company, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                className="px-3 py-2 border rounded-md text-sm bg-background min-w-[150px]"
                value={applicationFilter}
                onChange={(e) => setApplicationFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="reviewing">Under Review</option>
                <option value="interview">Interview</option>
                <option value="selected">Selected</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Applications ({filteredApplications.length})
          </CardTitle>
          <CardDescription>
            {applicationFilter !== 'all' 
              ? `Showing ${applicationFilter} applications` 
              : 'All your job applications'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-medium text-foreground mb-2">No applications yet</h3>
              <p className="text-muted-foreground mb-6">
                Start applying to jobs that match your skills and interests
              </p>
              <Link to="/applicant/jobs">
                <Button variant="gradient" size="lg">
                  <Search className="w-4 h-4 mr-2" />
                  Find Jobs
                </Button>
              </Link>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-12">
              <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No matching applications</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters or search query
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  setApplicationFilter('all');
                  setSearchQuery('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApplications.map((application) => (
                <div
                  key={application._id}
                  className="rounded-lg border bg-card overflow-hidden"
                >
                  {/* Application Header - Always Visible */}
                  <div
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                    onClick={() => setExpandedApplication(
                      expandedApplication === application._id ? null : application._id
                    )}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Briefcase className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground text-lg">{application.jobId?.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {application.jobId?.company || application.jobId?.department}
                          </span>
                          {application.jobId?.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {application.jobId.location}
                            </span>
                          )}
                        </div>
                        {application.aiEvaluation?.overallScore && (
                          <div className="flex items-center gap-1 mt-1">
                            <TrendingUp className="w-3 h-3 text-success" />
                            <span className="text-xs text-success font-medium">
                              AI Match Score: {application.aiEvaluation.overallScore}/100
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-3 sm:mt-0">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Applied on</p>
                        <p className="text-sm font-medium text-foreground">
                          {new Date(application.appliedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <Badge variant={getStatusBadgeVariant(application.status) as any} className="text-sm flex items-center gap-1">
                        {getStatusIcon(application.status)}
                        {getStatusDisplayText(application.status)}
                      </Badge>
                      {expandedApplication === application._id ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Job Details */}
                  {expandedApplication === application._id && (
                    <div className="border-t bg-secondary/20 p-4 space-y-4 animate-fade-in">
                      {/* Job Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {application.jobId?.employmentType && (
                          <div className="p-3 bg-background rounded-lg">
                            <p className="text-xs text-muted-foreground">Employment Type</p>
                            <p className="font-medium text-foreground flex items-center gap-1">
                              <Clock className="w-4 h-4 text-primary" />
                              {application.jobId.employmentType}
                            </p>
                          </div>
                        )}
                        {application.jobId?.experienceLevel && (
                          <div className="p-3 bg-background rounded-lg">
                            <p className="text-xs text-muted-foreground">Experience Level</p>
                            <p className="font-medium text-foreground flex items-center gap-1">
                              <GraduationCap className="w-4 h-4 text-primary" />
                              {application.jobId.experienceLevel}
                            </p>
                          </div>
                        )}
                        {application.jobId?.salaryRange && (
                          <div className="p-3 bg-background rounded-lg">
                            <p className="text-xs text-muted-foreground">Salary Range</p>
                            <p className="font-medium text-foreground flex items-center gap-1">
                              <DollarSign className="w-4 h-4 text-success" />
                              {application.jobId.salaryRange.currency} {application.jobId.salaryRange.min.toLocaleString()} - {application.jobId.salaryRange.max.toLocaleString()}
                            </p>
                          </div>
                        )}
                        {application.jobId?.location && (
                          <div className="p-3 bg-background rounded-lg">
                            <p className="text-xs text-muted-foreground">Location</p>
                            <p className="font-medium text-foreground flex items-center gap-1">
                              <MapPin className="w-4 h-4 text-primary" />
                              {application.jobId.location}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Job Description */}
                      {application.jobId?.description && (
                        <div>
                          <p className="text-sm font-medium text-foreground mb-2">Job Description</p>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {application.jobId.description}
                          </p>
                        </div>
                      )}

                      {/* Required Skills */}
                      {application.jobId?.requiredSkills && application.jobId.requiredSkills.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-foreground mb-2">Required Skills</p>
                          <div className="flex flex-wrap gap-2">
                            {application.jobId.requiredSkills.map((skill, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Status Timeline Preview */}
                      {application.statusHistory && application.statusHistory.length > 0 && (
                        <div className="bg-background rounded-lg p-4">
                          <p className="text-sm font-medium text-foreground mb-3">Recent Status Updates</p>
                          <div className="space-y-2">
                            {application.statusHistory.slice(-3).reverse().map((history, idx) => (
                              <div key={idx} className="flex items-center gap-3 text-sm">
                                <div className="w-2 h-2 rounded-full bg-primary"></div>
                                <span className="font-medium">{getStatusDisplayText(history.status)}</span>
                                <span className="text-muted-foreground">
                                  {new Date(history.timestamp).toLocaleDateString()}
                                </span>
                                {history.note && (
                                  <span className="text-muted-foreground italic">- {history.note}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t">
                        {application.statusHistory && application.statusHistory.length > 0 && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Eye className="w-4 h-4 mr-2" />
                                View Full Timeline
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>{application.jobId?.title}</DialogTitle>
                                <DialogDescription>
                                  Complete application progress and status updates
                                </DialogDescription>
                              </DialogHeader>
                              <ApplicationTimeline
                                statusHistory={application.statusHistory}
                                currentStatus={application.status}
                              />
                            </DialogContent>
                          </Dialog>
                        )}
                        
                        {/* Growth Tips button for rejected applications */}
                        {application.status === 'rejected' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950/30"
                            onClick={() => fetchRejectionFeedback(application._id, application.jobId?.title || 'Unknown Position')}
                            disabled={feedbackLoading === application._id}
                          >
                            {feedbackLoading === application._id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Lightbulb className="w-4 h-4 mr-2" />
                            )}
                            View Growth Tips
                          </Button>
                        )}
                        
                        <Link to="/applicant/feedback">
                          <Button size="sm" variant="outline">
                            <FileText className="w-4 h-4 mr-2" />
                            View Feedback
                          </Button>
                        </Link>
                        <Link to="/applicant/jobs">
                          <Button size="sm" variant="ghost">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Browse More Jobs
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejection Feedback Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-orange-500" />
              Growth Tips & Feedback
            </DialogTitle>
            <DialogDescription>
              Personalized guidance to help you improve for future opportunities
            </DialogDescription>
          </DialogHeader>
          {selectedFeedback && (
            <RejectionFeedbackCard
              jobTitle={selectedFeedback.jobTitle}
              feedback={selectedFeedback.feedback}
              onClose={() => setSelectedFeedback(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyApplications;
