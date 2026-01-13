import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { talentPoolApi, jobsApi } from '@/lib/api';
import {
  Users,
  Search,
  Mail,
  Briefcase,
  TrendingUp,
  Award,
  Tag,
  RefreshCw,
  Trash2,
  UserPlus,
  Clock,
  CheckCircle,
  MessageSquare,
  Loader2,
  Sparkles,
  Star,
  ArrowRight,
} from 'lucide-react';

interface SmartTag {
  tag: string;
  confidence: number;
  category: string;
}

interface SuggestedJob {
  jobId: string;
  title: string;
  status: string;
  matchScore: number;
  matchedSkills: string[];
}

interface TalentPoolEntry {
  id: string;
  applicantId: string;
  name: string;
  email: string;
  originalJob: string;
  smartTags: SmartTag[];
  suggestedJobs: SuggestedJob[];
  status: string;
  notes: string;
  addedAt: string;
  skills: string[];
  experience: number;
  githubScore: number;
  location: string;
}

interface Stats {
  total: number;
  active: number;
  contacted: number;
  hired: number;
}

const TalentPool = () => {
  const [entries, setEntries] = useState<TalentPoolEntry[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, contacted: 0, hired: 0 });
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<TalentPoolEntry | null>(null);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [newNotes, setNewNotes] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchTalentPool();
    fetchJobs();
  }, [statusFilter, tagFilter]);

  const fetchTalentPool = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (tagFilter !== 'all') params.tag = tagFilter;
      
      const response = await talentPoolApi.getAll(params);
      setEntries(response.data?.entries || []);
      setStats(response.data?.stats || { total: 0, active: 0, contacted: 0, hired: 0 });
      setTags(response.data?.tags || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch talent pool',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await jobsApi.getAll({ status: 'active' });
      setJobs(response.data?.jobs || []);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    }
  };

  const handleUpdateStatus = async (entryId: string, status: string) => {
    try {
      await talentPoolApi.updateStatus(entryId, status);
      toast({
        title: 'Status Updated',
        description: `Candidate status changed to ${status}`,
      });
      fetchTalentPool();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const handleRemove = async (entryId: string) => {
    try {
      await talentPoolApi.remove(entryId);
      toast({
        title: 'Removed',
        description: 'Candidate removed from talent pool',
      });
      fetchTalentPool();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove candidate',
        variant: 'destructive',
      });
    }
  };

  const handleApplyToJob = async () => {
    if (!selectedEntry || !selectedJobId) return;
    
    try {
      await talentPoolApi.applyToJob(selectedEntry.id, selectedJobId);
      toast({
        title: 'Success! 🎉',
        description: 'Candidate added to job as shortlisted',
      });
      setApplyDialogOpen(false);
      setSelectedJobId('');
      fetchTalentPool();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to apply candidate to job',
        variant: 'destructive',
      });
    }
  };

  const handleRefreshSuggestions = async (entryId: string) => {
    try {
      await talentPoolApi.refreshSuggestions(entryId);
      toast({
        title: 'Refreshed',
        description: 'Job suggestions updated',
      });
      fetchTalentPool();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to refresh suggestions',
        variant: 'destructive',
      });
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedEntry) return;
    
    try {
      await talentPoolApi.updateStatus(selectedEntry.id, selectedEntry.status, newNotes);
      toast({
        title: 'Notes Saved',
        description: 'Candidate notes updated',
      });
      setNotesDialogOpen(false);
      fetchTalentPool();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save notes',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'outline'; color: string }> = {
      active: { variant: 'outline', color: 'text-blue-600' },
      contacted: { variant: 'secondary', color: 'text-yellow-600' },
      hired: { variant: 'default', color: 'text-green-600' },
      archived: { variant: 'outline', color: 'text-gray-600' },
    };
    const c = config[status] || config.active;
    return <Badge variant={c.variant}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      skills: 'bg-blue-100 text-blue-700',
      leadership: 'bg-purple-100 text-purple-700',
      potential: 'bg-green-100 text-green-700',
      experience: 'bg-orange-100 text-orange-700',
      culture: 'bg-pink-100 text-pink-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = 
      entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

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
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-500" />
            Talent Pool
          </h1>
          <p className="text-muted-foreground">
            Candidates with potential for other roles. AI-tagged and auto-matched.
          </p>
        </div>
        <Button onClick={fetchTalentPool} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.contacted}</p>
                <p className="text-xs text-muted-foreground">Contacted</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.hired}</p>
                <p className="text-xs text-muted-foreground">Hired</p>
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
                placeholder="Search by name, email, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="hired">Hired</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            {tags.length > 0 && (
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {tags.map((tag) => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Talent Pool Entries */}
      {filteredEntries.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Talent Pool is Empty</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              When you reject candidates who might be a good fit for other roles, 
              they'll automatically appear here with AI-generated smart tags and job suggestions.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredEntries.map((entry) => (
            <Card key={entry.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white font-semibold">
                      {getInitials(entry.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-foreground">{entry.name}</h3>
                      {getStatusBadge(entry.status)}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{entry.email}</span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        From: {entry.originalJob}
                      </span>
                      {entry.experience > 0 && (
                        <span>{entry.experience} yrs exp</span>
                      )}
                    </div>

                    {/* Smart Tags */}
                    {entry.smartTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {entry.smartTags.map((tag, index) => (
                          <span
                            key={index}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(tag.category)}`}
                          >
                            <Tag className="w-3 h-3" />
                            {tag.tag}
                            <span className="opacity-60">{tag.confidence}%</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Suggested Jobs */}
                    {entry.suggestedJobs.length > 0 && (
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-3">
                        <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-2 flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          Potential Fit For:
                        </p>
                        <div className="space-y-1">
                          {entry.suggestedJobs.slice(0, 2).map((job, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <span className="font-medium">{job.title}</span>
                              <Badge variant="secondary" className="text-xs">
                                {job.matchScore}% match
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Skills */}
                    {entry.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {entry.skills.slice(0, 4).map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {entry.skills.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{entry.skills.length - 4}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Scores */}
                    <div className="flex items-center gap-3 mb-3 text-sm">
                      {entry.githubScore > 0 && (
                        <span className="flex items-center gap-1">
                          <Award className="w-4 h-4 text-purple-500" />
                          <span className="font-medium">{entry.githubScore}%</span>
                          <span className="text-muted-foreground">GitHub</span>
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedEntry(entry);
                          setApplyDialogOpen(true);
                        }}
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        Add to Job
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(entry.id, 'contacted')}
                        disabled={entry.status === 'contacted'}
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Mark Contacted
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRefreshSuggestions(entry.id)}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleRemove(entry.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Notes */}
                    {entry.notes && (
                      <div className="mt-3 p-2 bg-muted rounded text-sm">
                        <p className="text-muted-foreground">{entry.notes}</p>
                      </div>
                    )}

                    <p className="mt-2 text-xs text-muted-foreground">
                      Added {new Date(entry.addedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Apply to Job Dialog */}
      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Job</DialogTitle>
            <DialogDescription>
              Add {selectedEntry?.name} to a job posting. They will be automatically shortlisted.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a job posting" />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((job) => (
                  <SelectItem key={job._id} value={job._id}>
                    {job.title} ({job.department})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedEntry?.suggestedJobs.length > 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                  AI Suggested Matches:
                </p>
                {selectedEntry.suggestedJobs.map((job, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between"
                    onClick={() => setSelectedJobId(job.jobId)}
                  >
                    <span>{job.title}</span>
                    <Badge>{job.matchScore}%</Badge>
                  </Button>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyToJob} disabled={!selectedJobId}>
              <ArrowRight className="w-4 h-4 mr-2" />
              Add to Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TalentPool;
