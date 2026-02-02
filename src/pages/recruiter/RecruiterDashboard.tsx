import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { recruiterApi } from '@/lib/api';
import {
  Briefcase,
  Users,
  CheckCircle2,
  XCircle,
  Calendar,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['hsl(199, 89%, 32%)', 'hsl(187, 75%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(142, 71%, 45%)', 'hsl(0, 84%, 60%)'];

interface DashboardStats {
  totalJobs: number;
  totalApplicants: number;
  selectedCount: number;
  rejectedCount: number;
  reviewingCount: number;
  pendingCount: number;
  avgScore: number;
}

interface RecentApplication {
  id: string;
  applicantName: string;
  applicantEmail: string;
  jobTitle: string;
  status: string;
  score: number;
  appliedAt: string;
}

const RecruiterDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    totalApplicants: 0,
    selectedCount: 0,
    rejectedCount: 0,
    reviewingCount: 0,
    pendingCount: 0,
    avgScore: 0,
  });
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await recruiterApi.getDashboard();
      if (response.data) {
        setStats(response.data.stats);
        setRecentApplications(response.data.recentApplications || []);
      }
    } catch (error: any) {
      toast({
        title: 'Error loading dashboard',
        description: error.message || 'Failed to fetch dashboard data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const statsCards = [
    { label: 'Total Jobs Posted', value: stats.totalJobs.toString(), icon: Briefcase, color: 'bg-primary' },
    { label: 'Total Applicants', value: stats.totalApplicants.toString(), icon: Users, color: 'bg-info' },
    { label: 'Selected', value: stats.selectedCount.toString(), icon: CheckCircle2, color: 'bg-success' },
    { label: 'Under Review', value: stats.reviewingCount.toString(), icon: Calendar, color: 'bg-warning' },
  ];

  const pipelineData = [
    { name: 'Pending', value: stats.pendingCount },
    { name: 'Reviewing', value: stats.reviewingCount },
    { name: 'Selected', value: stats.selectedCount },
    { name: 'Rejected', value: stats.rejectedCount },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {user?.fullName?.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your recruitment pipeline.
          </p>
        </div>
        <Link to="/recruiter/jobs">
          <Button variant="gradient">
            <Briefcase className="w-4 h-4" />
            Post New Job
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {statsCards.map((stat, index) => (
          <Card key={stat.label} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-primary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Candidate Pipeline</CardTitle>
            <CardDescription>Distribution of candidates by stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pipelineData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pipelineData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {pipelineData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index] }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {item.name}: {item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Average Score Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-success" />
              Average AI Score
            </CardTitle>
            <CardDescription>Overall candidate quality metric</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-[280px]">
              <div className="text-center">
                <div className="text-7xl font-bold text-primary mb-4">
                  {stats.avgScore}
                </div>
                <p className="text-muted-foreground text-lg">Out of 100</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Based on {stats.totalApplicants} total applicants
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Candidates */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              Recent Candidate Evaluations
            </CardTitle>
            <CardDescription>AI-powered hiring readiness assessments</CardDescription>
          </div>
          <Link to="/recruiter/candidates">
            <Button variant="ghost" size="sm" className="gap-2">
              <Users className="w-4 h-4" />
              Search & Filter Candidates
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentApplications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No applications yet</p>
              <p className="text-sm">Applications will appear here once candidates apply</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentApplications.map((application) => (
                <div
                  key={application.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-semibold text-primary">
                        {application.applicantName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{application.applicantName}</p>
                      <p className="text-sm text-muted-foreground">{application.jobTitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">AI Score</p>
                      <p
                        className={`text-lg font-bold ${
                          application.score >= 70
                            ? 'text-success'
                            : application.score >= 50
                            ? 'text-warning'
                            : 'text-destructive'
                        }`}
                      >
                        {application.score > 0 ? `${application.score}%` : 'N/A'}
                      </p>
                    </div>
                    <Badge
                      variant={
                        application.status === 'selected' || application.status === 'shortlisted'
                          ? 'selected'
                          : application.status === 'rejected'
                          ? 'rejected'
                          : 'review'
                      }
                    >
                      {application.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RecruiterDashboard;
