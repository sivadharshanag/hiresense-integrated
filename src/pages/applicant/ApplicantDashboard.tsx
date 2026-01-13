import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Link, useSearchParams } from 'react-router-dom';
import { applicantApi, applicationsApi, jobsApi, interviewsApi } from '@/lib/api';
import { ApplicationTimeline } from '@/components/applicant/ApplicationTimeline';
import { StatCard, StatCardWithProgress } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { DashboardSkeleton } from '@/components/ui/skeleton-loaders';
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
  CheckCircle2,
  XCircle,
  FileText,
  ArrowRight,
  Sparkles,
  Calendar,
  TrendingUp,
  Target,
  Loader2,
  Eye,
  Video,
  Play,
} from 'lucide-react';

interface Application {
  _id: string;
  jobId: {
    _id: string;
    title: string;
    company?: string;
    department?: string;
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
}

interface Job {
  _id: string;
  title: string;
  company?: string;
  department?: string;
  location: string;
  employmentType: string;
  requiredSkills: string[];
}

interface ProfileData {
  skills: string[];
  resumeUrl?: string;
  githubUsername?: string;
  yearsOfExperience?: number;
  bio?: string;
  location?: string;
  linkedinUrl?: string;
}

const ApplicantDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [confirmingInterview, setConfirmingInterview] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    review: 0,
    interview: 0,
    selected: 0,
    rejected: 0,
  });

  // Handle interview confirmation from email link
  useEffect(() => {
    const interviewId = searchParams.get('confirmInterview');
    if (interviewId) {
      handleConfirmInterview(interviewId);
    }
  }, [searchParams]);

  const handleConfirmInterview = async (interviewId: string) => {
    setConfirmingInterview(true);
    try {
      await interviewsApi.confirmAttendance(interviewId);
      toast({
        title: '✅ Interview Confirmed!',
        description: 'Thank you for confirming your attendance. Good luck with your interview!',
      });
      // Remove the query param
      setSearchParams({});
    } catch (error: any) {
      toast({
        title: 'Confirmation Failed',
        description: error.message || 'Could not confirm interview. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setConfirmingInterview(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch applications, profile, and jobs in parallel with individual error handling
      const [appsResponse, profileResponse, jobsResponse] = await Promise.allSettled([
        applicationsApi.getMyApplications().catch(() => ({ data: { applications: [] } })),
        applicantApi.getProfile().catch(() => ({ data: { profile: null } })),
        jobsApi.getAll({ status: 'open' }).catch(() => ({ data: { jobs: [] } })),
      ]);

      // Process applications
      const apps = (appsResponse.status === 'fulfilled' ? appsResponse.value.data?.applications : []) || [];
      setApplications(apps);

      // Calculate statistics
      const statsData = {
        total: apps.length,
        pending: apps.filter((a: Application) => a.status === 'pending').length,
        review: apps.filter((a: Application) => a.status === 'reviewing').length,
        interview: apps.filter((a: Application) => a.status === 'interview').length,
        selected: apps.filter((a: Application) => a.status === 'selected').length,
        rejected: apps.filter((a: Application) => a.status === 'rejected').length,
      };
      setStats(statsData);

      // Set profile
      const profileData = profileResponse.status === 'fulfilled' ? profileResponse.value.data?.profile : null;
      setProfile(profileData);

      // Recommend jobs based on skills
      const allJobs = (jobsResponse.status === 'fulfilled' ? jobsResponse.value.data?.jobs : []) || [];
      const userSkills = profileData?.skills || [];
      
      // Filter and score jobs based on skill match
      const scoredJobs = allJobs
        .map((job: Job) => {
          const matchingSkills = job.requiredSkills?.filter((skill: string) =>
            userSkills.some((userSkill: string) =>
              userSkill.toLowerCase().includes(skill.toLowerCase()) ||
              skill.toLowerCase().includes(userSkill.toLowerCase())
            )
          ) || [];
          
          return {
            ...job,
            matchScore: matchingSkills.length,
          };
        })
        .filter((job: any) => job.matchScore > 0)
        .sort((a: any, b: any) => b.matchScore - a.matchScore)
        .slice(0, 5);

      setRecommendedJobs(scoredJobs);
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error loading dashboard',
        description: error.message || 'Could not load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateProfileCompletion = () => {
    if (!profile) return 0;
    
    const fields = [
      profile.skills?.length > 0,
      profile.resumeUrl,
      profile.yearsOfExperience !== undefined && profile.yearsOfExperience > 0,
      profile.bio,
      profile.location,
      profile.linkedinUrl,
      profile.githubUsername,
    ];
    
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'selected':
        return 'selected';
      case 'rejected':
        return 'rejected';
      case 'interview':
        return 'selected';
      default:
        return 'review';
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

  if (loading || confirmingInterview) {
    return (
      <div className="space-y-6">
        {/* Always show Virtual Interview access even while loading */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}!
            </h1>
            <p className="text-muted-foreground">Track your job applications and career progress.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/applicant/virtual-interview">
              <Button size="lg" className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700">
                <Video className="w-4 h-4 mr-2" />
                AI Interview
              </Button>
            </Link>
            <Link to="/applicant/jobs">
              <Button size="lg" variant="outline">
                <Briefcase className="w-4 h-4 mr-2" />
                Browse Jobs
              </Button>
            </Link>
          </div>
        </div>
        
        {confirmingInterview ? (
          <div className="flex flex-col items-center justify-center h-96 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Confirming your interview attendance...</p>
          </div>
        ) : (
          <DashboardSkeleton />
        )}
      </div>
    );
  }

  const profileCompletion = calculateProfileCompletion();

  return (
    <div className="space-y-6 reveal-stagger">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {user?.fullName?.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground">Track your job applications and career progress.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/applicant/virtual-interview">
            <Button size="lg" className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-0 hover:from-purple-600 hover:to-indigo-700 shadow-lg">
              <Video className="w-4 h-4 mr-2" />
              AI Interview
            </Button>
          </Link>
          <Link to="/applicant/jobs">
            <Button size="lg" variant="outline">
              <Briefcase className="w-4 h-4 mr-2" />
              Browse Jobs
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid - Enhanced with storytelling */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Applications"
          value={stats.total}
          icon={FileText}
          iconColor="text-primary"
          iconBgColor="bg-primary/10"
          trend={stats.total > 0 ? {
            value: stats.pending + stats.review,
            label: 'Active applications',
            direction: 'neutral'
          } : undefined}
          subtitle={stats.total === 0 ? 'Start applying today!' : undefined}
        />
        <StatCard
          title="Under Review"
          value={stats.review + stats.pending}
          icon={Clock}
          iconColor="text-amber-600"
          iconBgColor="bg-amber-100"
          trend={(stats.review + stats.pending) > 0 ? {
            value: stats.review + stats.pending,
            label: 'Being reviewed by recruiters',
            direction: 'up'
          } : undefined}
        />
        <StatCard
          title="Interviews"
          value={stats.interview + stats.selected}
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBgColor="bg-emerald-100"
          trend={(stats.interview + stats.selected) > 0 ? {
            value: stats.selected,
            label: stats.selected > 0 ? `${stats.selected} selected!` : 'Interview stage',
            direction: 'up'
          } : undefined}
        />
        <StatCard
          title="Rejected"
          value={stats.rejected}
          icon={XCircle}
          iconColor="text-red-600"
          iconBgColor="bg-red-100"
          subtitle={stats.rejected > 0 ? 'View feedback to improve' : 'None yet'}
        />
      </div>

      {/* Profile Completion */}
      {profileCompletion < 100 && (
        <Card className="border-border bg-gradient-to-r from-muted/50 to-background card-glow overflow-hidden">
          <CardContent className="p-6 relative">
            {/* Decorative background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-muted/30 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 relative">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-lg">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Complete your profile</h3>
                  <span className="text-sm font-medium text-primary">{profileCompletion}%</span>
                </div>
                <Progress value={profileCompletion} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  A complete profile increases your chances of getting noticed by recruiters.
                </p>
              </div>
              <Link to="/applicant/profile">
                <Button variant="outline">
                  Complete Profile
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Applications */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Recent Applications</CardTitle>
            <CardDescription>Track the status of your job applications</CardDescription>
          </div>
          <Link to="/applicant/my-applications">
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No applications yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start applying to jobs that match your skills
              </p>
              <Link to="/applicant/jobs">
                <Button variant="gradient">
                  Browse Jobs
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.slice(0, 5).map((application) => (
                <div
                  key={application._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors gap-4"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{application.jobId?.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {application.jobId?.company || application.jobId?.department}
                      </p>
                      {application.aiEvaluation?.overallScore && (
                        <div className="flex items-center gap-1 mt-1">
                          <TrendingUp className="w-3 h-3 text-success" />
                          <span className="text-xs text-success font-medium">
                            AI Score: {application.aiEvaluation.overallScore}/100
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Applied</p>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(application.appliedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(application.status)}>
                      {getStatusDisplayText(application.status)}
                    </Badge>
                    {application.statusHistory && application.statusHistory.length > 0 && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4 mr-2" />
                            Timeline
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{application.jobId?.title}</DialogTitle>
                            <DialogDescription>
                              View your application progress and status updates
                            </DialogDescription>
                          </DialogHeader>
                          <ApplicationTimeline
                            statusHistory={application.statusHistory}
                            currentStatus={application.status}
                          />
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommended Jobs */}
      {recommendedJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Recommended for You
            </CardTitle>
            <CardDescription>Jobs matching your skills and preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendedJobs.map((job) => (
                <div
                  key={job._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{job.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {job.company || job.department} • {job.location}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {job.requiredSkills?.slice(0, 3).map((skill, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Link to={`/applicant/jobs`}>
                    <Button size="sm" variant="outline">
                      View Details
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ApplicantDashboard;
