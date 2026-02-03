import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Briefcase, Users, Eye, Edit, Trash2, MapPin, Clock, Loader2, AlertTriangle, UserX, Target } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { jobsApi, applicationsApi } from '@/lib/api';

interface Job {
  _id: string;
  title: string;
  description: string;
  department: string;
  requiredSkills: string[];
  experienceLevel: string;
  jobCategory: string;
  location: string;
  employmentType: string;
  salaryMin?: number;
  salaryMax?: number;
  applicantCount: number;
  openings: number;
  hiredCount: number;
  status: 'active' | 'closed' | 'draft';
  applicationDeadline?: string;
  createdAt: string;
}

const JobManagement = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bulkRejectDialog, setBulkRejectDialog] = useState<{ open: boolean; job: Job | null }>({ open: false, job: null });
  const [confirmationText, setConfirmationText] = useState('');
  const [isBulkRejecting, setIsBulkRejecting] = useState(false);
  const [newJob, setNewJob] = useState({
    title: '',
    description: '',
    department: '',
    requiredSkills: '',
    experienceLevel: '',
    jobCategory: 'software',
    location: 'Remote',
    employmentType: 'Full-time',
    salaryMin: '',
    salaryMax: '',
    openings: '1',
    applicationDeadline: '',
    matchThreshold: 50,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      const response = await jobsApi.getAll();
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

  const handleCreateJob = async () => {
    if (!newJob.title || !newJob.description || !newJob.experienceLevel) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const jobData = {
        title: newJob.title,
        description: newJob.description,
        department: newJob.department || 'Engineering',
        requiredSkills: newJob.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean),
        experienceLevel: newJob.experienceLevel,
        jobCategory: newJob.jobCategory,
        location: newJob.location,
        employmentType: newJob.employmentType,
        salaryMin: newJob.salaryMin ? parseInt(newJob.salaryMin) : undefined,
        salaryMax: newJob.salaryMax ? parseInt(newJob.salaryMax) : undefined,
        openings: newJob.openings ? parseInt(newJob.openings) : 1,
        applicationDeadline: newJob.applicationDeadline ? new Date(newJob.applicationDeadline).toISOString() : undefined,
        matchThreshold: newJob.matchThreshold,
      };

      await jobsApi.create(jobData);
      
      toast({
        title: 'Job posted successfully',
        description: 'Your job listing is now live and visible to applicants.',
      });

      setNewJob({
        title: '',
        description: '',
        department: '',
        requiredSkills: '',
        experienceLevel: '',
        jobCategory: 'software',
        location: 'Remote',
        employmentType: 'Full-time',
        salaryMin: '',
        salaryMax: '',
        openings: '1',
        applicationDeadline: '',
        matchThreshold: 50,
      });
      setIsDialogOpen(false);
      fetchJobs(); // Refresh the list
    } catch (error: any) {
      toast({
        title: 'Failed to create job',
        description: error.message || 'An error occurred while posting the job',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      await jobsApi.delete(jobId);
      toast({
        title: 'Job deleted',
        description: 'The job listing has been removed.',
      });
      fetchJobs(); // Refresh the list
    } catch (error: any) {
      toast({
        title: 'Failed to delete job',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Job Management</h1>
          <p className="text-muted-foreground">Create and manage your job listings</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient">
              <Plus className="w-4 h-4" />
              Post New Job
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Job Listing</DialogTitle>
              <DialogDescription>
                Fill in the details to post a new job opportunity.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title *</Label>
                <Input
                  id="jobTitle"
                  placeholder="e.g., Senior Frontend Developer"
                  value={newJob.title}
                  onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  placeholder="e.g., Engineering, Product, Design"
                  value={newJob.department}
                  onChange={(e) => setNewJob({ ...newJob, department: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobDescription">Job Description *</Label>
                <Textarea
                  id="jobDescription"
                  placeholder="Describe the role, responsibilities, and what you're looking for..."
                  value={newJob.description}
                  onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skills">Required Skills (comma-separated)</Label>
                <Input
                  id="skills"
                  placeholder="React, TypeScript, Node.js"
                  value={newJob.requiredSkills}
                  onChange={(e) => setNewJob({ ...newJob, requiredSkills: e.target.value })}
                />
              </div>
              
              {/* Match Threshold Slider */}
              <div className="space-y-3 bg-gradient-to-br from-primary/5 to-secondary/5 p-4 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  <Label htmlFor="matchThreshold" className="text-base font-semibold">
                    Candidate Match Threshold: {newJob.matchThreshold}%
                  </Label>
                </div>
                <Slider
                  id="matchThreshold"
                  min={0}
                  max={100}
                  step={5}
                  value={[newJob.matchThreshold]}
                  onValueChange={(value) => setNewJob({ ...newJob, matchThreshold: value[0] })}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  Candidates with <strong>{newJob.matchThreshold}%</strong> or higher skill match will be automatically notified via email about this job posting.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="experience">Experience Level *</Label>
                  <Select
                    value={newJob.experienceLevel}
                    onValueChange={(value) => setNewJob({ ...newJob, experienceLevel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fresher">Fresher (0-1 years)</SelectItem>
                      <SelectItem value="junior">Junior (1-3 years)</SelectItem>
                      <SelectItem value="mid">Mid Level (3-6 years)</SelectItem>
                      <SelectItem value="senior">Senior (6+ years)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobCategory">Job Category *</Label>
                  <Select
                    value={newJob.jobCategory}
                    onValueChange={(value) => setNewJob({ ...newJob, jobCategory: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="software">Software/Engineering</SelectItem>
                      <SelectItem value="data-science">Data Science/ML</SelectItem>
                      <SelectItem value="qa-automation">QA/Automation</SelectItem>
                      <SelectItem value="non-technical">Non-Technical (HR/Ops)</SelectItem>
                      <SelectItem value="business">Business/Finance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(newJob.jobCategory === 'non-technical' || newJob.jobCategory === 'business') && (
                <div className="bg-muted/50 border border-border rounded-lg p-3 text-sm text-muted-foreground">
                  ℹ️ <strong>Note:</strong> For non-technical roles, GitHub & project analysis will be skipped during candidate evaluation.
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employmentType">Employment Type</Label>
                  <Select
                    value={newJob.employmentType}
                    onValueChange={(value) => setNewJob({ ...newJob, employmentType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full-time">Full-time</SelectItem>
                      <SelectItem value="Part-time">Part-time</SelectItem>
                      <SelectItem value="Contract">Contract</SelectItem>
                      <SelectItem value="Internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="Remote, New York, etc."
                    value={newJob.location}
                    onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="openings">Number of Openings *</Label>
                  <Input
                    id="openings"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={newJob.openings}
                    onChange={(e) => setNewJob({ ...newJob, openings: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="applicationDeadline">Application Deadline (optional)</Label>
                  <Input
                    id="applicationDeadline"
                    type="date"
                    value={newJob.applicationDeadline}
                    onChange={(e) => setNewJob({ ...newJob, applicationDeadline: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salaryMin">Minimum Salary (optional)</Label>
                  <Input
                    id="salaryMin"
                    type="number"
                    placeholder="50000"
                    value={newJob.salaryMin}
                    onChange={(e) => setNewJob({ ...newJob, salaryMin: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salaryMax">Maximum Salary (optional)</Label>
                  <Input
                    id="salaryMax"
                    type="number"
                    placeholder="80000"
                    value={newJob.salaryMax}
                    onChange={(e) => setNewJob({ ...newJob, salaryMax: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button variant="gradient" onClick={handleCreateJob} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    'Post Job'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && jobs.length === 0 && (
        <Card className="p-12 text-center">
          <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No jobs posted yet</h3>
          <p className="text-muted-foreground mb-4">Create your first job listing to start receiving applications</p>
          <Button variant="gradient" onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            Post Your First Job
          </Button>
        </Card>
      )}

      {/* Jobs Grid */}
      {!isLoading && jobs.length > 0 && (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <Card key={job._id} className="hover:shadow-card-hover transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-foreground">{job.title}</h3>
                          <Badge
                            variant={job.status === 'active' ? 'success' : job.status === 'closed' ? 'destructive' : 'secondary'}
                          >
                            {job.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {job.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {job.employmentType}
                          </span>
                          <span className="capitalize">{job.experienceLevel} level</span>
                          {job.department && <span>• {job.department}</span>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {job.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {job.requiredSkills.slice(0, 4).map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {job.requiredSkills.length > 4 && (
                            <Badge variant="secondary" className="text-xs">
                              +{job.requiredSkills.length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 lg:flex-col lg:items-end">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="w-5 h-5" />
                        <span className="font-medium text-foreground">{job.applicantCount}</span>
                        <span className="text-sm">applicants</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium text-primary">{job.hiredCount || 0}</span>
                        <span> / {job.openings || 1} positions filled</span>
                      </div>
                    </div>
                    {/* Show bulk reject button when at least 1 hired and there are remaining applicants */}
                    {(job.hiredCount || 0) >= 1 && job.applicantCount > (job.hiredCount || 0) && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setBulkRejectDialog({ open: true, job })}
                        className="mb-2"
                      >
                        <UserX className="w-4 h-4" />
                        Reject Remaining
                      </Button>
                    )}
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.location.href = `/recruiter/jobs/applications?jobId=${job._id}`}
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteJob(job._id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Bulk Rejection Confirmation Dialog */}
      <AlertDialog open={bulkRejectDialog.open} onOpenChange={(open) => {
        if (!open) {
          setBulkRejectDialog({ open: false, job: null });
          setConfirmationText('');
        }
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Bulk Rejection Confirmation
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to reject all remaining applicants for the position:
              </p>
              <p className="font-semibold text-foreground">
                {bulkRejectDialog.job?.title}
              </p>
              <p>
                This will reject{' '}
                <span className="font-semibold text-destructive">
                  {(bulkRejectDialog.job?.applicantCount || 0) - (bulkRejectDialog.job?.hiredCount || 0)}
                </span>{' '}
                applicant(s) and send them a polite rejection email.
              </p>
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                <strong>⚠️ This action cannot be undone.</strong>
              </div>
              <div className="mt-4">
                <Label htmlFor="confirmation" className="text-sm font-medium">
                  Type <span className="font-mono bg-muted px-1 rounded">CONFIRM REJECTION</span> to proceed:
                </Label>
                <Input
                  id="confirmation"
                  className="mt-2"
                  placeholder="CONFIRM REJECTION"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkRejecting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={confirmationText !== 'CONFIRM REJECTION' || isBulkRejecting}
              onClick={async () => {
                if (!bulkRejectDialog.job) return;
                setIsBulkRejecting(true);
                try {
                  const response = await applicationsApi.bulkReject(
                    bulkRejectDialog.job._id,
                    confirmationText
                  );
                  toast({
                    title: 'Bulk Rejection Complete',
                    description: response.message || `Successfully rejected remaining applicants. Emails are being sent.`,
                  });
                  setBulkRejectDialog({ open: false, job: null });
                  setConfirmationText('');
                  fetchJobs(); // Refresh job list
                } catch (error: any) {
                  toast({
                    title: 'Bulk Rejection Failed',
                    description: error.message || 'An error occurred',
                    variant: 'destructive',
                  });
                } finally {
                  setIsBulkRejecting(false);
                }
              }}
            >
              {isBulkRejecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject All Remaining'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default JobManagement;
