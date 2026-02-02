import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { applicationsApi, aiApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { ConfidenceBadge } from '@/components/recruiter/ConfidenceBadge';
import { RiskFactorPanel } from '@/components/recruiter/RiskFactorPanel';
import { StatusUpdateDialog } from '@/components/recruiter/StatusUpdateDialog';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Github,
  Target,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';

const CandidateEvaluation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const applicationId = searchParams.get('id');
  const { toast } = useToast();

  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  
  // Status update dialog state
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>('');

  useEffect(() => {
    if (applicationId) {
      loadApplication();
    }
  }, [applicationId]);

  const loadApplication = async () => {
    try {
      setLoading(true);
      const response = await applicationsApi.getById(applicationId!);
      setApplication(response.data.application);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load application',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    if (!applicationId) return;

    setEvaluating(true);
    try {
      const response = await aiApi.evaluateApplication(applicationId);
      setApplication({ ...application, aiInsights: response.data.aiInsights });
      toast({
        title: 'Evaluation Complete',
        description: 'AI analysis has been completed successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Evaluation Failed',
        description: error.message || 'Failed to evaluate application',
        variant: 'destructive',
      });
    } finally {
      setEvaluating(false);
    }
  };

  const handleUpdateStatus = async (status: string, note?: string) => {
    try {
      await applicationsApi.updateStatus(applicationId!, status, note);
      setApplication({ ...application, status });
      toast({
        title: 'Status Updated',
        description: `Application status changed to ${status}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      });
      throw error; // Re-throw for dialog handling
    }
  };

  // Open dialog for status update with AI-generated justification
  const openStatusDialog = (status: string) => {
    setPendingStatus(status);
    setStatusDialogOpen(true);
  };

  // Handle dialog confirmation
  const handleStatusConfirm = async (note: string) => {
    await handleUpdateStatus(pendingStatus, note);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Application Not Found</h2>
        <p className="text-muted-foreground">The application you're looking for doesn't exist.</p>
        <Button className="mt-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const aiInsights = application.aiInsights;
  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'strong-yes':
        return 'bg-green-500';
      case 'yes':
        return 'bg-blue-500';
      case 'maybe':
        return 'bg-yellow-500';
      default:
        return 'bg-red-500';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Candidate Evaluation</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered candidate analysis and assessment
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleEvaluate}
            disabled={evaluating}
          >
            {evaluating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Evaluating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {aiInsights ? 'Re-evaluate' : 'Run AI Analysis'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* AI Insights Overview */}
      {aiInsights && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Evaluation Summary
            </CardTitle>
            <CardDescription>
              Automated analysis based on skills, experience, and GitHub activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="text-center md:col-span-2">
                <div className="flex flex-col items-center gap-2">
                  <div className="text-5xl font-bold text-primary">
                    {aiInsights.overallScore}
                    <span className="text-2xl text-muted-foreground">/100</span>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Hiring Readiness Score</p>
                  {aiInsights.confidenceLevel && (
                    <ConfidenceBadge 
                      level={aiInsights.confidenceLevel}
                      score={aiInsights.confidenceScore}
                      className="mt-1"
                    />
                  )}
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-500 mb-2">
                  {aiInsights.skillMatch}%
                </div>
                <p className="text-sm text-muted-foreground">Skill Match</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-500 mb-2">
                  {aiInsights.experienceScore}
                </div>
                <p className="text-sm text-muted-foreground">Experience</p>
              </div>
            </div>

            {/* Risk Factor Panel */}
            {aiInsights.riskFactors && aiInsights.riskFactors.length > 0 && (
              <div className="mb-6">
                <RiskFactorPanel riskFactors={aiInsights.riskFactors} />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-green-500 mb-2">
                  {aiInsights.githubScore}
                </div>
                <p className="text-sm text-muted-foreground">GitHub Score</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-500 mb-2">
                  {aiInsights.educationScore}
                </div>
                <p className="text-sm text-muted-foreground">Education</p>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Recommendation</span>
                <Badge
                  className={`${getRecommendationColor(aiInsights.recommendation)} text-white`}
                >
                  {aiInsights.recommendation.toUpperCase().replace('-', ' ')}
                </Badge>
              </div>
              <Progress value={aiInsights.overallScore} className="h-3" />
            </div>

            {aiInsights.strengths?.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Strengths
                </h4>
                <ul className="space-y-2">
                  {aiInsights.strengths.map((strength: string, idx: number) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aiInsights.gaps?.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-yellow-500" />
                  Areas for Improvement
                </h4>
                <ul className="space-y-2">
                  {aiInsights.gaps.map((gap: string, idx: number) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-yellow-500 mt-0.5">!</span>
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!aiInsights && (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <p className="text-sm">
                This application hasn't been evaluated yet. Click "Run AI Analysis" to generate insights.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Candidate Details */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="application">Application</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Candidate Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{application.applicantId?.fullName || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{application.applicantId?.email || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="application" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Application Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Job Position</p>
                  <p className="text-sm text-muted-foreground">
                    {application.jobId?.title || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Cover Letter</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {application.coverLetter || 'No cover letter provided'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Application Status</p>
                  <Badge>{application.status}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Applied On</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(application.appliedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manage Application</CardTitle>
              <CardDescription>Update application status and take actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => openStatusDialog('reviewing')}
                disabled={application.status === 'reviewing'}
              >
                <Target className="w-4 h-4 mr-2" />
                Mark as Reviewing
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => openStatusDialog('shortlisted')}
                disabled={application.status === 'shortlisted'}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Shortlist Candidate
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => openStatusDialog('interview')}
                disabled={application.status === 'interview'}
              >
                <User className="w-4 h-4 mr-2" />
                Schedule Interview
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={() => openStatusDialog('rejected')}
                disabled={application.status === 'rejected'}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject Application
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status Update Dialog with AI-generated justification */}
      <StatusUpdateDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        applicationId={applicationId || ''}
        targetStatus={pendingStatus}
        candidateName={application?.applicant?.name || 'Candidate'}
        onConfirm={handleStatusConfirm}
      />
    </div>
  );
};

export default CandidateEvaluation;
