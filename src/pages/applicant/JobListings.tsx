import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Briefcase,
  MapPin,
  Clock,
  Building2,
  Search,
  Filter,
  CheckCircle,
  Loader2,
  Globe,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { jobsApi, applicationsApi } from '@/lib/api';

interface Job {
  _id: string;
  title: string;
  description: string;
  department: string;
  requiredSkills: string[];
  experienceLevel: string;
  jobCategory?: string;
  location: string;
  employmentType: string;
  salaryMin?: number;
  salaryMax?: number;
  applicantCount: number;
  status: string;
  createdAt: string;
  recruiterId: {
    fullName: string;
    email: string;
  };
  // Company details
  company?: string;
  companyDescription?: string;
  companyWebsite?: string;
  companyLocation?: string;
}

const JobListings = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [viewDetailsJob, setViewDetailsJob] = useState<Job | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchJobs();
    fetchAppliedJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      const response = await jobsApi.getAll({ status: 'active' });
      if (response.data?.jobs) {
        setJobs(response.data.jobs);
      }
    } catch (error: any) {
      toast({
        title: 'Error loading jobs',
        description: error.message || 'Failed to fetch job listings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAppliedJobs = async () => {
    try {
      const response = await applicationsApi.getMyApplications();
      if (response.data?.applications) {
        const appliedIds = new Set<string>(
          response.data.applications.map((app: any) => app.jobId?._id || app.jobId)
        );
        setAppliedJobIds(appliedIds);
      }
    } catch (error) {
      // Silently fail - user might not have any applications yet
      console.log('No applications found or error fetching');
    }
  };

  const filteredJobs = jobs.filter(
    (job) =>
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.requiredSkills.some((skill) => skill.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleApply = async () => {
    if (!selectedJob) return;

    try {
      setIsApplying(true);
      await applicationsApi.apply(selectedJob._id, coverLetter);
      
      // Add to applied jobs set
      setAppliedJobIds(prev => new Set([...prev, selectedJob._id]));
      
      toast({
        title: 'Application submitted!',
        description: `Your application for ${selectedJob.title} has been submitted successfully.`,
      });

      setSelectedJob(null);
      setCoverLetter('');
      fetchJobs(); // Refresh to update applicant counts
    } catch (error: any) {
      toast({
        title: 'Application failed',
        description: error.message || 'Failed to submit application',
        variant: 'destructive',
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Job Listings</h1>
        <p className="text-muted-foreground">Discover opportunities that match your skills</p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search jobs, departments, or skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'}
      </p>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Jobs Grid */}
      {!isLoading && filteredJobs.length > 0 && (
        <div className="grid gap-4">
          {filteredJobs.map((job) => (
            <Card key={job._id} className="hover:shadow-card-hover transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-foreground">{job.title}</h3>
                        <div className="flex items-center gap-2">
                          <p className="text-primary font-medium">{job.company || job.department}</p>
                          {job.company && (
                            <span className="text-muted-foreground">• {job.department}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {job.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {job.employmentType}
                          </span>
                          <span className="flex items-center gap-1 capitalize">
                            <Briefcase className="w-4 h-4" />
                            {job.experienceLevel}
                          </span>
                          {job.jobCategory && (
                            <Badge variant={job.jobCategory === 'non-technical' || job.jobCategory === 'business' ? 'secondary' : 'default'} className="text-xs">
                              {job.jobCategory === 'software' ? '💻 Technical' :
                               job.jobCategory === 'data-science' ? '📊 Data Science' :
                               job.jobCategory === 'qa-automation' ? '🧪 QA' :
                               job.jobCategory === 'non-technical' ? '📋 Non-Tech' :
                               job.jobCategory === 'business' ? '💼 Business' : job.jobCategory}
                            </Badge>
                          )}
                          {(job.salaryMin || job.salaryMax) && (
                            <span className="flex items-center gap-1">
                              <span className="text-sm font-medium">₹</span>
                              {job.salaryMin && job.salaryMax
                                ? `${job.salaryMin.toLocaleString()} - ₹${job.salaryMax.toLocaleString()}`
                                : job.salaryMin
                                ? `From ₹${job.salaryMin.toLocaleString()}`
                                : `Up to ₹${job.salaryMax?.toLocaleString()}`}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                          {job.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {job.requiredSkills.map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                          <span>{job.applicantCount} applicant{job.applicantCount !== 1 ? 's' : ''}</span>
                          <span>•</span>
                          <span>Posted by {job.recruiterId.fullName}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setViewDetailsJob(job)}>
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                      {appliedJobIds.has(job._id) ? (
                        <Button variant="outline" disabled className="bg-green-50 text-green-600 border-green-200 cursor-default">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Applied
                        </Button>
                      ) : (
                        <Button variant="gradient" onClick={() => setSelectedJob(job)}>
                          Apply Now
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredJobs.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No jobs found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? 'Try adjusting your search terms' : 'No active job listings at the moment'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Application Dialog */}
      <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Apply for {selectedJob?.title}</DialogTitle>
            <DialogDescription>
              Submit your application with an optional cover letter
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-semibold">{selectedJob?.title}</h4>
              <p className="text-sm text-muted-foreground">{selectedJob?.department}</p>
              <div className="flex gap-2 flex-wrap">
                {selectedJob?.requiredSkills.slice(0, 5).map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coverLetter">Cover Letter (optional)</Label>
              <Textarea
                id="coverLetter"
                placeholder="Tell the recruiter why you're a great fit for this role..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={6}
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setSelectedJob(null)} disabled={isApplying}>
                Cancel
              </Button>
              <Button variant="gradient" onClick={handleApply} disabled={isApplying}>
                {isApplying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Job Details Dialog */}
      <Dialog open={!!viewDetailsJob} onOpenChange={(open) => !open && setViewDetailsJob(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{viewDetailsJob?.title}</DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              {viewDetailsJob?.company || viewDetailsJob?.department}
              {viewDetailsJob?.company && (
                <span className="text-muted-foreground">• {viewDetailsJob?.department}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            {/* Job Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-medium flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" />
                  {viewDetailsJob?.location}
                </p>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Employment Type</p>
                <p className="font-medium flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  {viewDetailsJob?.employmentType}
                </p>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Experience Level</p>
                <p className="font-medium capitalize flex items-center gap-1 mt-1">
                  <Briefcase className="w-3 h-3" />
                  {viewDetailsJob?.experienceLevel}
                </p>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Job Category</p>
                <p className="font-medium flex items-center gap-1 mt-1">
                  {viewDetailsJob?.jobCategory === 'software' ? '💻 Technical' :
                   viewDetailsJob?.jobCategory === 'data-science' ? '📊 Data Science' :
                   viewDetailsJob?.jobCategory === 'qa-automation' ? '🧪 QA/Automation' :
                   viewDetailsJob?.jobCategory === 'non-technical' ? '📋 Non-Technical' :
                   viewDetailsJob?.jobCategory === 'business' ? '💼 Business' : '💻 Technical'}
                </p>
              </div>
            </div>
            {/* Note for non-technical roles */}
            {(viewDetailsJob?.jobCategory === 'non-technical' || viewDetailsJob?.jobCategory === 'business') && (
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
                ℹ️ This is a non-technical role. GitHub and project profiles are optional for this position.
              </div>
            )}
            {(viewDetailsJob?.salaryMin || viewDetailsJob?.salaryMax) && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Salary Range</p>
                <p className="font-medium mt-1">
                  {viewDetailsJob.salaryMin && viewDetailsJob.salaryMax
                    ? `₹${viewDetailsJob.salaryMin.toLocaleString()} - ₹${viewDetailsJob.salaryMax.toLocaleString()}`
                    : viewDetailsJob.salaryMin
                      ? `From ₹${viewDetailsJob.salaryMin.toLocaleString()}`
                      : `Up to ₹${viewDetailsJob.salaryMax?.toLocaleString()}`}
                </p>
              </div>
            )}

            {/* Job Description */}
            <div>
              <h4 className="font-semibold mb-2">Job Description</h4>
              <p className="text-muted-foreground whitespace-pre-wrap">{viewDetailsJob?.description}</p>
            </div>

            {/* Required Skills */}
            <div>
              <h4 className="font-semibold mb-2">Required Skills</h4>
              <div className="flex gap-2 flex-wrap">
                {viewDetailsJob?.requiredSkills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Company Details Section - Always show */}
            <div className="border-t pt-6">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                About the Company
              </h4>
              <div className="space-y-4">
                <div>
                  <h5 className="text-lg font-medium text-primary">
                    {viewDetailsJob?.company || viewDetailsJob?.department || 'Company'}
                  </h5>
                </div>
                {viewDetailsJob?.companyDescription && (
                  <p className="text-muted-foreground">{viewDetailsJob.companyDescription}</p>
                )}
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {viewDetailsJob?.companyLocation || viewDetailsJob?.location || 'Location not specified'}
                  </span>
                  {viewDetailsJob?.companyWebsite && (
                    <a 
                      href={viewDetailsJob.companyWebsite.startsWith('http') ? viewDetailsJob.companyWebsite : `https://${viewDetailsJob.companyWebsite}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <Globe className="w-4 h-4" />
                      Visit Website
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Recruiter Info */}
            <div className="border-t pt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>Posted by {viewDetailsJob?.recruiterId.fullName}</span>
              <span>{viewDetailsJob?.createdAt && new Date(viewDetailsJob.createdAt).toLocaleDateString()}</span>
            </div>

            {/* Apply Button */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setViewDetailsJob(null)}>
                Close
              </Button>
              <Button 
                variant="gradient" 
                onClick={() => {
                  setViewDetailsJob(null);
                  setSelectedJob(viewDetailsJob);
                }}
              >
                Apply for this Job
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobListings;
