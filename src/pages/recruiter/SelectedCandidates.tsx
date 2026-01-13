import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { applicationsApi } from '@/lib/api';
import {
  Users,
  UserCheck,
  Calendar,
  Star,
  Search,
  Mail,
  MapPin,
  Briefcase,
  TrendingUp,
  Award,
  CheckCircle2,
  Clock,
  ThumbsUp,
  Loader2,
} from 'lucide-react';

interface SelectedCandidate {
  id: string;
  applicantId: string;
  name: string;
  email: string;
  jobTitle: string;
  department: string;
  status: string;
  score: number;
  skills: string[];
  experience: number;
  githubScore: number;
  hiredAt: string | null;
  shortlistedAt: string;
}

interface Stats {
  hired: number;
  interviewing: number;
  shortlisted: number;
}

const SelectedCandidates = () => {
  const [candidates, setCandidates] = useState<SelectedCandidate[]>([]);
  const [stats, setStats] = useState<Stats>({ hired: 0, interviewing: 0, shortlisted: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const response = await applicationsApi.getSelectedCandidates();
      setCandidates(response.data?.candidates || []);
      setStats(response.data?.stats || { hired: 0, interviewing: 0, shortlisted: 0 });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch candidates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any; label: string }> = {
      hired: { variant: 'default', icon: CheckCircle2, label: 'Hired' },
      interview: { variant: 'secondary', icon: Calendar, label: 'Interviewing' },
      shortlisted: { variant: 'outline', icon: ThumbsUp, label: 'Shortlisted' },
      selected: { variant: 'outline', icon: Star, label: 'Selected' },
    };

    const config = statusConfig[status] || statusConfig.shortlisted;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch = 
      candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || candidate.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const hiredCandidates = filteredCandidates.filter(c => c.status === 'hired');
  const interviewingCandidates = filteredCandidates.filter(c => c.status === 'interview');
  const shortlistedCandidates = filteredCandidates.filter(c => c.status === 'shortlisted' || c.status === 'selected');

  const CandidateCard = ({ candidate }: { candidate: SelectedCandidate }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="w-12 h-12">
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {getInitials(candidate.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-foreground truncate">{candidate.name}</h3>
              {getStatusBadge(candidate.status)}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Mail className="w-3 h-3" />
              <span className="truncate">{candidate.email}</span>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                <span>{candidate.jobTitle}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{candidate.experience} yrs exp</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1 text-sm">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="font-medium">{candidate.score}%</span>
                <span className="text-muted-foreground">AI Score</span>
              </div>
              {candidate.githubScore > 0 && (
                <div className="flex items-center gap-1 text-sm">
                  <Award className="w-4 h-4 text-purple-500" />
                  <span className="font-medium">{candidate.githubScore}%</span>
                  <span className="text-muted-foreground">GitHub</span>
                </div>
              )}
            </div>
            
            {candidate.skills.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {candidate.skills.slice(0, 4).map((skill, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {candidate.skills.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{candidate.skills.length - 4}
                  </Badge>
                )}
              </div>
            )}

            {candidate.hiredAt && (
              <div className="mt-2 text-xs text-muted-foreground">
                Hired on {new Date(candidate.hiredAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Selected Candidates</h1>
          <p className="text-muted-foreground">View and manage your shortlisted and hired candidates</p>
        </div>
        <Button onClick={fetchCandidates} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.hired}</p>
                <p className="text-sm text-muted-foreground">Hired</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.interviewing}</p>
                <p className="text-sm text-muted-foreground">Interviewing</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Star className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats.shortlisted}</p>
                <p className="text-sm text-muted-foreground">Shortlisted</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by name, email, or position..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="hired">Hired</SelectItem>
                <SelectItem value="interview">Interviewing</SelectItem>
                <SelectItem value="shortlisted">Shortlisted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Candidates Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            All ({filteredCandidates.length})
          </TabsTrigger>
          <TabsTrigger value="hired" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Hired ({hiredCandidates.length})
          </TabsTrigger>
          <TabsTrigger value="interviewing" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Interviewing ({interviewingCandidates.length})
          </TabsTrigger>
          <TabsTrigger value="shortlisted" className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            Shortlisted ({shortlistedCandidates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {filteredCandidates.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No candidates found</h3>
                <p className="text-muted-foreground">
                  Start shortlisting candidates from your job applications
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCandidates.map((candidate) => (
                <CandidateCard key={candidate.id} candidate={candidate} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="hired">
          {hiredCandidates.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <UserCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No hired candidates yet</h3>
                <p className="text-muted-foreground">
                  Mark candidates as hired to see them here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hiredCandidates.map((candidate) => (
                <CandidateCard key={candidate.id} candidate={candidate} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="interviewing">
          {interviewingCandidates.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No interviews scheduled</h3>
                <p className="text-muted-foreground">
                  Schedule interviews with shortlisted candidates
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {interviewingCandidates.map((candidate) => (
                <CandidateCard key={candidate.id} candidate={candidate} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="shortlisted">
          {shortlistedCandidates.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No shortlisted candidates</h3>
                <p className="text-muted-foreground">
                  Shortlist candidates from job applications
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shortlistedCandidates.map((candidate) => (
                <CandidateCard key={candidate.id} candidate={candidate} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SelectedCandidates;
