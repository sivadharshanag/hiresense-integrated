import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { applicationsApi, aiApi } from '@/lib/api';
import { StatusUpdateDialog } from '@/components/recruiter/StatusUpdateDialog';
import { InterviewFocusPanel } from '@/components/recruiter/InterviewFocusPanel';
import { SkillGapHeatmap } from '@/components/recruiter/SkillGapHeatmap';
import { interviewTopics } from '@/data/interviewQuestions';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  FileText,
  Briefcase,
  GraduationCap,
  AlertTriangle,
  ThumbsUp,
  Lightbulb,
  Loader2,
  Users,
  TrendingUp,
  Download,
  Mail,
  Calendar,
  Clock,
  Award,
  Target,
  Github,
  BookOpen,
  Zap,
  Star,
  BarChart3,
  Brain,
  Shield,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  CircleDot,
  Layers,
  Code2,
  Gauge,
  Heart,
  ChevronDown,
  ChevronRight,
  MessageSquare,
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
    requiredSkills: string[];
    experienceLevel?: string;
    jobCategory?: string;
  };
  status: string;
  coverLetter?: string;
  appliedAt: string;
  aiInsights?: {
    // Core Scores
    overallScore: number;
    skillMatch: number;
    experienceScore: number;
    githubScore: number;
    educationScore?: number;
    // GCC Evaluation Scores
    aiMatchScore?: number;
    hiringReadinessScore?: number;
    projectAlignmentScore?: number;
    // Analysis Results
    strengths: string[];
    gaps: string[];
    riskFactorsList?: string[];
    projectAnalysis?: string;
    improvementSuggestions?: string[];
    recommendation: 'select' | 'review' | 'reject';
    // AI Summary
    aiSummary?: string;
    interviewQuestions?: string[];
    // Confidence
    confidence: number;
    confidenceLevel?: 'low' | 'medium' | 'high';
  };
}

const CandidateEvaluation = () => {
  const [searchParams] = useSearchParams();
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  // Status update dialog state for Phase 3
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>('');
  const [pendingApplicationId, setPendingApplicationId] = useState<string>('');

  // Phase 4: Interview Focus state
  const [interviewFocus, setInterviewFocus] = useState<any>(null);
  const [generatingInterview, setGeneratingInterview] = useState(false);

  // Phase 5: Skill Gap state
  const [skillGapAnalysis, setSkillGapAnalysis] = useState<any>(null);
  const [generatingSkillGap, setGeneratingSkillGap] = useState(false);

  useEffect(() => {
    loadApplications();
  }, [searchParams]);

  const loadApplications = async () => {
    try {
      setIsLoading(true);
      const applicationId = searchParams.get('id');
      const jobId = searchParams.get('jobId');

      if (applicationId) {
        const response = await applicationsApi.getById(applicationId);
        if (response.data?.application) {
          const app = response.data.application;
          setApplications([app]);
          setSelectedApplication(app);
        }
      } else if (jobId) {
        const response = await applicationsApi.getByJob(jobId);
        if (response.data?.applications) {
          setApplications(response.data.applications);
          if (response.data.applications.length > 0) {
            setSelectedApplication(response.data.applications[0]);
          }
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error loading applications',
        description: error.message || 'Failed to fetch application data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Open dialog for status update with AI-generated justification
  const openStatusDialog = (applicationId: string, status: string) => {
    console.log('Opening status dialog:', { applicationId, status });
    setPendingApplicationId(applicationId);
    setPendingStatus(status);
    setStatusDialogOpen(true);
    console.log('Dialog state should be true now');
  };

  // Handle dialog confirmation with note
  const handleStatusConfirm = async (note: string) => {
    await handleDecision(pendingApplicationId, pendingStatus as 'selected' | 'rejected', note);
  };

  const handleDecision = async (applicationId: string, decision: 'selected' | 'rejected', note?: string) => {
    try {
      await applicationsApi.updateStatus(applicationId, decision, note);
      setApplications(applications.map(app => 
        app._id === applicationId ? { ...app, status: decision } : app
      ));
      if (selectedApplication?._id === applicationId) {
        setSelectedApplication({ ...selectedApplication, status: decision });
      }
      toast({
        title: decision === 'selected' ? 'Candidate Selected' : 'Candidate Rejected',
        description: decision === 'selected' 
          ? 'The candidate will be notified and moved to the interview stage.'
          : 'Feedback has been sent to the candidate.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update application status',
        variant: 'destructive',
      });
      throw error; // Re-throw for dialog handling
    }
  };

  const handleEvaluate = async (applicationId: string) => {
    try {
      toast({ title: 'Evaluating...', description: 'AI is analyzing the candidate profile' });
      await aiApi.evaluateApplication(applicationId);
      await loadApplications();
      toast({ title: 'Evaluation Complete', description: 'AI insights have been generated' });
    } catch (error: any) {
      toast({
        title: 'Evaluation Error',
        description: error.message || 'Failed to evaluate candidate',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateInterviewFocus = async (applicationId: string) => {
    try {
      setGeneratingInterview(true);
      toast({ title: 'Generating...', description: 'AI is creating focused interview questions' });
      const response = await applicationsApi.generateInterviewFocus(applicationId);
      setInterviewFocus(response.data);
      toast({ title: 'Interview Focus Generated', description: 'Review the AI-generated questions below' });
    } catch (error: any) {
      toast({
        title: 'Generation Error',
        description: error.message || 'Failed to generate interview focus',
        variant: 'destructive',
      });
    } finally {
      setGeneratingInterview(false);
    }
  };

  const handleGenerateSkillGapAnalysis = async (applicationId: string) => {
    try {
      setGeneratingSkillGap(true);
      toast({ title: 'Analyzing...', description: 'AI is analyzing skill gaps' });
      const response = await applicationsApi.generateSkillGapAnalysis(applicationId);
      setSkillGapAnalysis(response.data);
      toast({ title: 'Skill Gap Analysis Complete', description: 'Review the visual breakdown below' });
    } catch (error: any) {
      toast({
        title: 'Analysis Error',
        description: error.message || 'Failed to generate skill gap analysis',
        variant: 'destructive',
      });
    } finally {
      setGeneratingSkillGap(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreRing = (score: number) => {
    if (score >= 80) return 'stroke-success';
    if (score >= 60) return 'stroke-warning';
    return 'stroke-destructive';
  };

  // Chart data for radar
  const getRadarData = () => {
    if (!selectedApplication?.aiInsights) return [];
    const insights = selectedApplication.aiInsights;
    return [
      { metric: 'Skills', value: insights.skillMatch, fullMark: 100 },
      { metric: 'Experience', value: insights.experienceScore, fullMark: 100 },
      { metric: 'GitHub', value: insights.githubScore, fullMark: 100 },
      { metric: 'Education', value: insights.educationScore || 70, fullMark: 100 },
      { metric: 'Overall', value: insights.overallScore, fullMark: 100 },
    ];
  };

  // Chart data for bar
  const getBarData = () => {
    if (!selectedApplication?.aiInsights) return [];
    const insights = selectedApplication.aiInsights;
    return [
      { name: 'Skills', value: insights.skillMatch, color: '#3b82f6' },
      { name: 'Experience', value: insights.experienceScore, color: '#10b981' },
      { name: 'GitHub', value: insights.githubScore, color: '#8b5cf6' },
      { name: 'Education', value: insights.educationScore || 70, color: '#f59e0b' },
    ];
  };

  // Pie chart data for recommendation breakdown
  const getPieData = () => {
    if (!selectedApplication?.aiInsights) return [];
    const insights = selectedApplication.aiInsights;
    return [
      { name: 'Strengths', value: insights.strengths?.length || 0, color: '#10b981' },
      { name: 'Gaps', value: insights.gaps?.length || 0, color: '#ef4444' },
    ];
  };

  // PDF Report state
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Professional PDF Report generation
  const handleDownloadReport = () => {
    if (!selectedApplication || !selectedApplication.aiInsights) {
      toast({
        title: 'Cannot Generate Report',
        description: 'Please run AI evaluation first before generating the report.',
        variant: 'destructive',
      });
      return;
    }

    setGeneratingPdf(true);
    
    const app = selectedApplication;
    const insights = app.aiInsights;
    
    // Create a styled HTML document for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'Popup Blocked',
        description: 'Please allow popups to download the PDF report.',
        variant: 'destructive',
      });
      setGeneratingPdf(false);
      return;
    }

    const getScoreColor = (score: number) => score >= 80 ? '#059669' : score >= 60 ? '#d97706' : '#dc2626';
    const getScoreBg = (score: number) => score >= 80 ? '#ecfdf5' : score >= 60 ? '#fffbeb' : '#fef2f2';
    const getRecColor = (rec: string) => rec === 'select' ? '#059669' : rec === 'reject' ? '#dc2626' : '#d97706';
    const getRecBg = (rec: string) => rec === 'select' ? '#ecfdf5' : rec === 'reject' ? '#fef2f2' : '#fffbeb';
    const getRecText = (rec: string) => rec === 'select' ? 'RECOMMENDED FOR HIRE' : rec === 'reject' ? 'NOT RECOMMENDED' : 'FURTHER REVIEW NEEDED';
    const reportId = `HR-${Date.now().toString(36).toUpperCase()}`;
    const currentDate = new Date();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Candidate Evaluation Report - ${app.applicantId.fullName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
            color: #1f2937; 
            line-height: 1.5; 
            background: #f9fafb;
            font-size: 14px;
          }
          
          .page { 
            max-width: 800px; 
            margin: 0 auto; 
            background: white; 
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          
          /* Header */
          .header { 
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #0ea5e9 100%); 
            color: white; 
            padding: 32px 40px;
            position: relative;
            overflow: hidden;
          }
          
          .header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -20%;
            width: 400px;
            height: 400px;
            background: rgba(255,255,255,0.05);
            border-radius: 50%;
          }
          
          .header-top { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start;
            margin-bottom: 24px;
            position: relative;
            z-index: 1;
          }
          
          .logo { 
            font-size: 24px; 
            font-weight: 700; 
            letter-spacing: -0.5px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .logo-icon {
            width: 36px;
            height: 36px;
            background: white;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #1e40af;
            font-weight: 700;
            font-size: 18px;
          }
          
          .report-meta { 
            text-align: right; 
            font-size: 12px; 
            opacity: 0.9;
          }
          
          .report-meta .report-id { 
            font-family: monospace; 
            background: rgba(255,255,255,0.2); 
            padding: 4px 10px; 
            border-radius: 4px;
            font-size: 11px;
            margin-bottom: 4px;
            display: inline-block;
          }
          
          .header-content {
            position: relative;
            z-index: 1;
          }
          
          .doc-title { 
            font-size: 28px; 
            font-weight: 700; 
            margin-bottom: 4px;
            letter-spacing: -0.5px;
          }
          
          .doc-subtitle { 
            font-size: 14px; 
            opacity: 0.85;
            font-weight: 400;
          }
          
          /* Content */
          .content { 
            padding: 32px 40px; 
          }
          
          /* Executive Summary */
          .executive-summary {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 28px;
          }
          
          .summary-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }
          
          .summary-title {
            font-size: 13px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .recommendation-badge {
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .summary-grid {
            display: grid;
            grid-template-columns: 140px 1fr;
            gap: 20px;
            align-items: center;
          }
          
          .overall-score-circle {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
            background: white;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          }
          
          .overall-score-circle::before {
            content: '';
            position: absolute;
            inset: 4px;
            border-radius: 50%;
            border: 4px solid;
            border-color: currentColor;
          }
          
          .score-value { 
            font-size: 42px; 
            font-weight: 700; 
            line-height: 1;
          }
          
          .score-label { 
            font-size: 10px; 
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 4px;
          }
          
          .summary-details h3 {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 8px;
          }
          
          .summary-details p {
            font-size: 13px;
            color: #64748b;
            line-height: 1.6;
          }
          
          .confidence-bar {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-top: 12px;
          }
          
          .confidence-track {
            flex: 1;
            height: 6px;
            background: #e2e8f0;
            border-radius: 3px;
            overflow: hidden;
          }
          
          .confidence-fill {
            height: 100%;
            background: #3b82f6;
            border-radius: 3px;
          }
          
          .confidence-text {
            font-size: 12px;
            color: #64748b;
            white-space: nowrap;
          }
          
          /* Section */
          .section { 
            margin-bottom: 28px;
            page-break-inside: avoid;
          }
          
          .section-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 16px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e2e8f0;
          }
          
          .section-icon {
            width: 32px;
            height: 32px;
            background: #eff6ff;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #3b82f6;
            font-size: 16px;
          }
          
          .section-title { 
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
          }
          
          /* Candidate Info */
          .candidate-card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            overflow: hidden;
          }
          
          .candidate-main {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1px;
            background: #e2e8f0;
          }
          
          .info-cell {
            background: white;
            padding: 14px 18px;
          }
          
          .info-label {
            font-size: 11px;
            font-weight: 500;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          
          .info-value {
            font-size: 14px;
            font-weight: 500;
            color: #1f2937;
          }
          
          .status-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
          }
          
          /* Score Cards */
          .scores-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
          }
          
          .score-card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 16px;
            text-align: center;
          }
          
          .score-card-value {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 4px;
          }
          
          .score-card-label {
            font-size: 11px;
            color: #64748b;
            font-weight: 500;
          }
          
          .score-card-bar {
            height: 4px;
            background: #e2e8f0;
            border-radius: 2px;
            margin-top: 10px;
            overflow: hidden;
          }
          
          .score-card-fill {
            height: 100%;
            border-radius: 2px;
          }
          
          /* Analysis Columns */
          .analysis-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          
          .analysis-card {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            overflow: hidden;
          }
          
          .analysis-header {
            padding: 12px 16px;
            font-size: 13px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .analysis-header.strengths {
            background: #ecfdf5;
            color: #059669;
            border-bottom: 1px solid #a7f3d0;
          }
          
          .analysis-header.gaps {
            background: #fffbeb;
            color: #d97706;
            border-bottom: 1px solid #fde68a;
          }
          
          .analysis-list {
            list-style: none;
            padding: 8px 0;
          }
          
          .analysis-list li {
            padding: 10px 16px;
            font-size: 13px;
            color: #374151;
            display: flex;
            align-items: flex-start;
            gap: 10px;
            border-bottom: 1px solid #f3f4f6;
          }
          
          .analysis-list li:last-child {
            border-bottom: none;
          }
          
          .list-icon {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            flex-shrink: 0;
            margin-top: 1px;
          }
          
          .list-icon.green {
            background: #d1fae5;
            color: #059669;
          }
          
          .list-icon.yellow {
            background: #fef3c7;
            color: #d97706;
          }
          
          /* Skills Section */
          .skills-container {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 20px;
          }
          
          .skills-row {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          
          .skill-tag {
            background: #f1f5f9;
            color: #475569;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
            border: 1px solid #e2e8f0;
          }
          
          /* AI Summary */
          .ai-summary {
            background: linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%);
            border: 1px solid #bfdbfe;
            border-radius: 10px;
            padding: 20px;
          }
          
          .ai-summary-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
            font-size: 13px;
            font-weight: 600;
            color: #1e40af;
          }
          
          .ai-summary p {
            font-size: 13px;
            color: #1e3a8a;
            line-height: 1.7;
            font-style: italic;
          }
          
          /* Footer */
          .footer {
            background: #1f2937;
            color: white;
            padding: 20px 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .footer-left {
            font-size: 12px;
            opacity: 0.8;
          }
          
          .footer-right {
            font-size: 11px;
            opacity: 0.6;
          }
          
          /* Print styles */
          @media print {
            body { 
              background: white;
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            .page { 
              box-shadow: none;
              max-width: none;
            }
            .section {
              page-break-inside: avoid;
            }
          }
          
          @page {
            size: A4;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <!-- Header -->
          <div class="header">
            <div class="header-top">
              <div class="logo">
                <div class="logo-icon">H</div>
                HireSense
              </div>
              <div class="report-meta">
                <div class="report-id">Report ID: ${reportId}</div>
                <div>${currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              </div>
            </div>
            <div class="header-content">
              <h1 class="doc-title">Candidate Evaluation Report</h1>
              <p class="doc-subtitle">AI-Powered Assessment for ${app.jobId.title} Position</p>
            </div>
          </div>
          
          <div class="content">
            <!-- Executive Summary -->
            <div class="executive-summary">
              <div class="summary-header">
                <span class="summary-title">Executive Summary</span>
                <span class="recommendation-badge" style="background: ${getRecBg(insights.recommendation)}; color: ${getRecColor(insights.recommendation)};">
                  ${getRecText(insights.recommendation)}
                </span>
              </div>
              <div class="summary-grid">
                <div class="overall-score-circle" style="color: ${getScoreColor(insights.overallScore)};">
                  <span class="score-value">${insights.overallScore}</span>
                  <span class="score-label">Overall</span>
                </div>
                <div class="summary-details">
                  <h3>${app.applicantId.fullName}</h3>
                  <p>${insights.aiSummary || `Based on comprehensive AI analysis, this candidate demonstrates ${insights.overallScore >= 70 ? 'strong' : insights.overallScore >= 50 ? 'moderate' : 'limited'} alignment with the ${app.jobId.title} position requirements.`}</p>
                  <div class="confidence-bar">
                    <div class="confidence-track">
                      <div class="confidence-fill" style="width: ${insights.confidence}%;"></div>
                    </div>
                    <span class="confidence-text">AI Confidence: ${insights.confidence}%</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Candidate Information -->
            <div class="section">
              <div class="section-header">
                <div class="section-icon">👤</div>
                <h2 class="section-title">Candidate Information</h2>
              </div>
              <div class="candidate-card">
                <div class="candidate-main">
                  <div class="info-cell">
                    <div class="info-label">Full Name</div>
                    <div class="info-value">${app.applicantId.fullName}</div>
                  </div>
                  <div class="info-cell">
                    <div class="info-label">Email Address</div>
                    <div class="info-value">${app.applicantId.email}</div>
                  </div>
                  <div class="info-cell">
                    <div class="info-label">Position Applied</div>
                    <div class="info-value">${app.jobId.title}</div>
                  </div>
                  <div class="info-cell">
                    <div class="info-label">Application Date</div>
                    <div class="info-value">${new Date(app.appliedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  </div>
                  <div class="info-cell">
                    <div class="info-label">Current Status</div>
                    <div class="info-value">
                      <span class="status-badge" style="background: ${app.status === 'selected' ? '#ecfdf5' : app.status === 'rejected' ? '#fef2f2' : '#eff6ff'}; color: ${app.status === 'selected' ? '#059669' : app.status === 'rejected' ? '#dc2626' : '#3b82f6'};">
                        ${app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div class="info-cell">
                    <div class="info-label">Experience Level</div>
                    <div class="info-value">${app.jobId.experienceLevel || 'Not Specified'}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Performance Metrics -->
            <div class="section">
              <div class="section-header">
                <div class="section-icon">📊</div>
                <h2 class="section-title">Performance Metrics</h2>
              </div>
              <div class="scores-grid">
                <div class="score-card">
                  <div class="score-card-value" style="color: #059669;">${insights.skillMatch}%</div>
                  <div class="score-card-label">Skills Match</div>
                  <div class="score-card-bar">
                    <div class="score-card-fill" style="width: ${insights.skillMatch}%; background: #059669;"></div>
                  </div>
                </div>
                <div class="score-card">
                  <div class="score-card-value" style="color: #3b82f6;">${insights.experienceScore}%</div>
                  <div class="score-card-label">Experience</div>
                  <div class="score-card-bar">
                    <div class="score-card-fill" style="width: ${insights.experienceScore}%; background: #3b82f6;"></div>
                  </div>
                </div>
                <div class="score-card">
                  <div class="score-card-value" style="color: #8b5cf6;">${insights.githubScore}%</div>
                  <div class="score-card-label">Technical</div>
                  <div class="score-card-bar">
                    <div class="score-card-fill" style="width: ${insights.githubScore}%; background: #8b5cf6;"></div>
                  </div>
                </div>
                <div class="score-card">
                  <div class="score-card-value" style="color: #f59e0b;">${insights.educationScore || 70}%</div>
                  <div class="score-card-label">Education</div>
                  <div class="score-card-bar">
                    <div class="score-card-fill" style="width: ${insights.educationScore || 70}%; background: #f59e0b;"></div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- GCC Evaluation Metrics -->
            ${insights.aiMatchScore || insights.hiringReadinessScore || insights.projectAlignmentScore ? `
            <div class="section">
              <div class="section-header">
                <div class="section-icon">🎯</div>
                <h2 class="section-title">GCC Evaluation Metrics</h2>
              </div>
              <div class="scores-grid">
                ${insights.aiMatchScore ? `
                <div class="score-card">
                  <div class="score-card-value" style="color: #6366f1;">${insights.aiMatchScore}%</div>
                  <div class="score-card-label">AI Match Score</div>
                  <div class="score-card-bar">
                    <div class="score-card-fill" style="width: ${insights.aiMatchScore}%; background: #6366f1;"></div>
                  </div>
                </div>
                ` : ''}
                ${insights.hiringReadinessScore ? `
                <div class="score-card">
                  <div class="score-card-value" style="color: #14b8a6;">${insights.hiringReadinessScore}%</div>
                  <div class="score-card-label">Hiring Readiness</div>
                  <div class="score-card-bar">
                    <div class="score-card-fill" style="width: ${insights.hiringReadinessScore}%; background: #14b8a6;"></div>
                  </div>
                </div>
                ` : ''}
                ${insights.projectAlignmentScore ? `
                <div class="score-card">
                  <div class="score-card-value" style="color: #f97316;">${insights.projectAlignmentScore}%</div>
                  <div class="score-card-label">Project Alignment</div>
                  <div class="score-card-bar">
                    <div class="score-card-fill" style="width: ${insights.projectAlignmentScore}%; background: #f97316;"></div>
                  </div>
                </div>
                ` : ''}
              </div>
            </div>
            ` : ''}
            
            <!-- Risk Factors -->
            ${insights.riskFactorsList && insights.riskFactorsList.length > 0 ? `
            <div class="section">
              <div class="section-header">
                <div class="section-icon">⚠️</div>
                <h2 class="section-title">Risk Factors</h2>
              </div>
              <div class="analysis-card" style="background: #fef2f2; border-color: #fecaca;">
                <ul class="analysis-list">
                  ${insights.riskFactorsList.map(risk => `
                    <li>
                      <span class="list-icon" style="background: #fee2e2; color: #dc2626;">!</span>
                      <span>${risk}</span>
                    </li>
                  `).join('')}
                </ul>
              </div>
            </div>
            ` : ''}
            
            <!-- Project Analysis -->
            ${insights.projectAnalysis ? `
            <div class="section">
              <div class="section-header">
                <div class="section-icon">💼</div>
                <h2 class="section-title">Project Analysis</h2>
              </div>
              <div class="ai-summary" style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border-color: #86efac;">
                <p style="color: #166534; font-style: normal;">${insights.projectAnalysis}</p>
              </div>
            </div>
            ` : ''}
            
            <!-- Improvement Suggestions -->
            ${insights.improvementSuggestions && insights.improvementSuggestions.length > 0 ? `
            <div class="section">
              <div class="section-header">
                <div class="section-icon">💡</div>
                <h2 class="section-title">Improvement Suggestions</h2>
              </div>
              <div class="analysis-card" style="background: #fffbeb; border-color: #fde68a;">
                <ul class="analysis-list">
                  ${insights.improvementSuggestions.map((suggestion, idx) => `
                    <li>
                      <span class="list-icon" style="background: #fef3c7; color: #d97706;">${idx + 1}</span>
                      <span>${suggestion}</span>
                    </li>
                  `).join('')}
                </ul>
              </div>
            </div>
            ` : ''}
            
            <!-- Strengths & Areas for Development -->
            <div class="section">
              <div class="section-header">
                <div class="section-icon">📋</div>
                <h2 class="section-title">Detailed Analysis</h2>
              </div>
              <div class="analysis-grid">
                <div class="analysis-card">
                  <div class="analysis-header strengths">
                    <span>✓</span> Key Strengths
                  </div>
                  <ul class="analysis-list">
                    ${insights.strengths.map(s => `
                      <li>
                        <span class="list-icon green">✓</span>
                        <span>${s}</span>
                      </li>
                    `).join('')}
                  </ul>
                </div>
                <div class="analysis-card">
                  <div class="analysis-header gaps">
                    <span>!</span> Areas for Development
                  </div>
                  <ul class="analysis-list">
                    ${insights.gaps.length > 0 ? insights.gaps.map(g => `
                      <li>
                        <span class="list-icon yellow">!</span>
                        <span>${g}</span>
                      </li>
                    `).join('') : '<li><span class="list-icon yellow">—</span><span>No significant gaps identified</span></li>'}
                  </ul>
                </div>
              </div>
            </div>
            
            <!-- Required Skills -->
            <div class="section">
              <div class="section-header">
                <div class="section-icon">🎯</div>
                <h2 class="section-title">Required Skills for Position</h2>
              </div>
              <div class="skills-container">
                <div class="skills-row">
                  ${app.jobId.requiredSkills?.map(skill => `<span class="skill-tag">${skill}</span>`).join('') || '<span class="skill-tag">No specific skills listed</span>'}
                </div>
              </div>
            </div>
            
            <!-- AI Summary -->
            ${insights.aiSummary ? `
            <div class="section">
              <div class="ai-summary">
                <div class="ai-summary-header">
                  <span>🤖</span> AI Assessment Summary
                </div>
                <p>"${insights.aiSummary}"</p>
              </div>
            </div>
            ` : ''}
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <div class="footer-left">
              <strong>HireSense AI</strong> — Intelligent Recruitment Platform
            </div>
            <div class="footer-right">
              Report generated on ${currentDate.toLocaleString()} • Confidential
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 800);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    toast({
      title: 'Report Ready',
      description: 'Use "Save as PDF" in the print dialog to download.',
    });
    
    setGeneratingPdf(false);
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
      'Confidence',
      'Strengths',
      'Skill Gaps',
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
        insights?.confidence ? `${insights.confidence}%` : 'N/A',
        insights?.strengths?.join('; ') ?? '',
        insights?.gaps?.join('; ') ?? '',
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
    link.download = `candidates-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Successful',
      description: `${applications.length} candidate${applications.length !== 1 ? 's' : ''} exported to CSV.`,
    });
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
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <Users className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
        <h2 className="text-xl font-semibold text-foreground mb-2">No Applications Found</h2>
        <p className="text-muted-foreground">No applications available for evaluation.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-accent" />
            AI-Powered Candidate Evaluation
          </h1>
          <p className="text-muted-foreground">Review candidates with AI-generated insights and hiring recommendations</p>
        </div>

      </div>

      {/* Horizontal Candidate Selector */}
      {applications.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Select Candidate</CardTitle>
            <CardDescription>{applications.length} application{applications.length !== 1 ? 's' : ''} to review</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {applications.map((app) => (
                <div
                  key={app._id}
                  onClick={() => setSelectedApplication(app)}
                  className={`flex-shrink-0 p-4 rounded-lg cursor-pointer transition-all min-w-[200px] ${
                    selectedApplication?._id === app._id
                      ? 'bg-primary/10 border-2 border-primary'
                      : 'bg-secondary/50 hover:bg-secondary border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                        <circle
                          cx="50" cy="50" r="40" fill="none"
                          className={getScoreRing(app.aiInsights?.overallScore || 0)}
                          strokeWidth="8" strokeLinecap="round"
                          strokeDasharray={`${(app.aiInsights?.overallScore || 0) * 2.51} 251`}
                        />
                      </svg>
                      <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${getScoreColor(app.aiInsights?.overallScore || 0)}`}>
                        {app.aiInsights?.overallScore || 0}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{app.applicantId.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">{app.jobId.title}</p>
                      <Badge
                        variant={
                          app.status === 'selected' || app.status === 'shortlisted'
                            ? 'selected'
                            : app.status === 'rejected'
                            ? 'rejected'
                            : 'review'
                        }
                        className="text-xs mt-1"
                      >
                        {app.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Width Application Details */}
      {selectedApplication && (
        <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="relative w-32 h-32 flex-shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        className={getScoreRing(selectedApplication.aiInsights?.overallScore || 0)}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${(selectedApplication.aiInsights?.overallScore || 0) * 2.83} 283`}
                        style={{ transition: 'stroke-dasharray 1s ease-out' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-3xl font-bold ${getScoreColor(selectedApplication.aiInsights?.overallScore || 0)}`}>
                        {selectedApplication.aiInsights?.overallScore || 0}
                      </span>
                      <span className="text-xs text-muted-foreground">AI Score</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-foreground">{selectedApplication.applicantId.fullName}</h2>
                    <p className="text-muted-foreground">{selectedApplication.applicantId.email}</p>
                    <p className="text-primary font-medium mt-1">{selectedApplication.jobId.title}</p>
                    <div className="flex gap-3 mt-4 flex-wrap">
                      {!selectedApplication.aiInsights && (
                        <Button variant="default" onClick={() => handleEvaluate(selectedApplication._id)}>
                          <Sparkles className="w-4 h-4" />
                          Run AI Evaluation
                        </Button>
                      )}
                      {selectedApplication.status !== 'selected' && selectedApplication.status !== 'rejected' ? (
                        <>
                          <Button variant="success" onClick={() => openStatusDialog(selectedApplication._id, 'selected')}>
                            <CheckCircle2 className="w-4 h-4" />
                            Select
                          </Button>
                          <Button variant="destructive" onClick={() => openStatusDialog(selectedApplication._id, 'rejected')}>
                            <XCircle className="w-4 h-4" />
                            Reject
                          </Button>
                        </>
                      ) : (
                        <Badge
                          variant={selectedApplication.status === 'selected' ? 'selected' : 'rejected'}
                          className="text-sm py-2 px-4"
                        >
                          {selectedApplication.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Download Report Button */}
            {selectedApplication.aiInsights && (
              <div className="flex justify-end">
                <Button variant="outline" onClick={handleDownloadReport} disabled={generatingPdf}>
                  {generatingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF Report
                    </>
                  )}
                </Button>
              </div>
            )}

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-12">
                <TabsTrigger value="overview" className="text-base font-medium">Overview</TabsTrigger>
                <TabsTrigger value="skills" className="text-base font-medium">Skills Analysis</TabsTrigger>
                <TabsTrigger value="ai" className="text-base font-medium">AI Insights</TabsTrigger>
                <TabsTrigger value="interview" className="text-base font-medium">Interview Focus</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                {/* Score Charts Row */}
                {selectedApplication.aiInsights && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Radar Chart */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Target className="w-5 h-5 text-primary" />
                          Performance Radar
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <RadarChart data={getRadarData()}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                            <Radar
                              name="Score"
                              dataKey="value"
                              stroke="#3b82f6"
                              fill="#3b82f6"
                              fillOpacity={0.3}
                              strokeWidth={2}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Bar Chart */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Award className="w-5 h-5 text-primary" />
                          Score Breakdown
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={getBarData()} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" domain={[0, 100]} />
                            <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                              {getBarData().map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Quick Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-4 text-center">
                      <Target className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                      <div className="text-2xl font-bold text-blue-700">
                        {selectedApplication.aiInsights?.skillMatch || 0}%
                      </div>
                      <div className="text-xs text-blue-600">Skills Match</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="p-4 text-center">
                      <Briefcase className="w-8 h-8 mx-auto mb-2 text-green-600" />
                      <div className="text-2xl font-bold text-green-700">
                        {selectedApplication.aiInsights?.experienceScore || 0}%
                      </div>
                      <div className="text-xs text-green-600">Experience</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardContent className="p-4 text-center">
                      <Github className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                      <div className="text-2xl font-bold text-purple-700">
                        {selectedApplication.aiInsights?.githubScore || 0}
                      </div>
                      <div className="text-xs text-purple-600">GitHub Score</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                    <CardContent className="p-4 text-center">
                      <GraduationCap className="w-8 h-8 mx-auto mb-2 text-amber-600" />
                      <div className="text-2xl font-bold text-amber-700">
                        {selectedApplication.aiInsights?.educationScore || 70}
                      </div>
                      <div className="text-xs text-amber-600">Education</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Application Timeline */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      Application Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">Applied</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(selectedApplication.appliedAt).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'long', day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="h-0.5 flex-1 bg-gray-200 mx-4" />
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          selectedApplication.aiInsights ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <Sparkles className={`w-5 h-5 ${
                            selectedApplication.aiInsights ? 'text-green-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium">AI Evaluated</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedApplication.aiInsights ? 'Complete' : 'Pending'}
                          </p>
                        </div>
                      </div>
                      <div className="h-0.5 flex-1 bg-gray-200 mx-4" />
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          selectedApplication.status === 'selected' ? 'bg-green-100' :
                          selectedApplication.status === 'rejected' ? 'bg-red-100' : 'bg-yellow-100'
                        }`}>
                          {selectedApplication.status === 'selected' ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : selectedApplication.status === 'rejected' ? (
                            <XCircle className="w-5 h-5 text-red-600" />
                          ) : (
                            <Clock className="w-5 h-5 text-yellow-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">Decision</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {selectedApplication.status.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Required Skills */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-primary" />
                      Required Skills for This Role
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedApplication.jobId.requiredSkills?.map((skill, idx) => (
                        <Badge key={idx} variant="secondary" className="text-sm py-1 px-3">
                          {skill}
                        </Badge>
                      )) || <p className="text-muted-foreground">No specific skills listed.</p>}
                    </div>
                  </CardContent>
                </Card>

                {/* Cover Letter */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Cover Letter
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {selectedApplication.coverLetter || 'No cover letter provided.'}
                    </p>
                  </CardContent>
                </Card>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-primary" />
                        Application Date
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {new Date(selectedApplication.appliedAt).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'long', day: 'numeric'
                        })}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-primary" />
                        Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge variant={
                        selectedApplication.status === 'selected' || selectedApplication.status === 'shortlisted'
                          ? 'selected' : selectedApplication.status === 'rejected' ? 'rejected' : 'review'
                      }>
                        {selectedApplication.status}
                      </Badge>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="skills" className="mt-4 space-y-4">
                {selectedApplication.aiInsights ? (
                  <>
                    {/* Skills Overview Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 dark:from-emerald-950 dark:to-emerald-900 dark:border-emerald-800">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Skill Match</p>
                              <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{selectedApplication.aiInsights.skillMatch}%</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center">
                              <Target className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="w-full bg-emerald-200 dark:bg-emerald-800 rounded-full h-2">
                              <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${selectedApplication.aiInsights.skillMatch}%` }} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 dark:from-blue-950 dark:to-blue-900 dark:border-blue-800">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Technical Score</p>
                              <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{selectedApplication.aiInsights.githubScore}</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center">
                              <Code2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                              <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${selectedApplication.aiInsights.githubScore}%` }} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-violet-50 to-violet-100 border-violet-200 dark:from-violet-950 dark:to-violet-900 dark:border-violet-800">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-medium text-violet-600 dark:text-violet-400 uppercase tracking-wide">Experience</p>
                              <p className="text-3xl font-bold text-violet-700 dark:text-violet-300">{selectedApplication.aiInsights.experienceScore}%</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-violet-200 dark:bg-violet-800 flex items-center justify-center">
                              <Briefcase className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="w-full bg-violet-200 dark:bg-violet-800 rounded-full h-2">
                              <div className="bg-violet-500 h-2 rounded-full transition-all duration-500" style={{ width: `${selectedApplication.aiInsights.experienceScore}%` }} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Required Skills with Match Indicators */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Layers className="w-5 h-5 text-primary" />
                          Required Skills Assessment
                        </CardTitle>
                        <CardDescription>How candidate's skills align with job requirements</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {selectedApplication.jobId.requiredSkills?.map((skill, idx) => {
                            // Simulate match level based on overall score (in real app, this would come from AI)
                            const matchLevel = Math.min(100, Math.max(30, selectedApplication.aiInsights!.skillMatch + (Math.random() * 30 - 15)));
                            const getMatchColor = (level: number) => {
                              if (level >= 80) return { bg: 'bg-emerald-100 dark:bg-emerald-900/50', text: 'text-emerald-700 dark:text-emerald-400', bar: 'bg-emerald-500', icon: 'text-emerald-500' };
                              if (level >= 60) return { bg: 'bg-amber-100 dark:bg-amber-900/50', text: 'text-amber-700 dark:text-amber-400', bar: 'bg-amber-500', icon: 'text-amber-500' };
                              return { bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-700 dark:text-red-400', bar: 'bg-red-500', icon: 'text-red-500' };
                            };
                            const colors = getMatchColor(matchLevel);
                            return (
                              <div key={idx} className={`p-3 rounded-lg ${colors.bg} border border-transparent hover:border-primary/20 transition-all`}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className={`font-medium text-sm ${colors.text}`}>{skill}</span>
                                  <span className={`text-xs font-bold ${colors.text}`}>{Math.round(matchLevel)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                  <div className={`${colors.bar} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${matchLevel}%` }} />
                                </div>
                              </div>
                            );
                          }) || <p className="text-muted-foreground col-span-full">No specific skills required.</p>}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Skill Gap Analysis Section */}
                    {!skillGapAnalysis && !generatingSkillGap && (
                      <Card className="border-dashed border-2">
                        <CardContent className="p-8 text-center">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                            <Brain className="w-8 h-8 text-primary" />
                          </div>
                          <h3 className="text-lg font-semibold text-foreground mb-2">Deep Skill Analysis</h3>
                          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                            Generate an AI-powered detailed breakdown showing exactly how the candidate's skills match each requirement.
                          </p>
                          <Button onClick={() => handleGenerateSkillGapAnalysis(selectedApplication._id)} size="lg">
                            <Zap className="w-4 h-4 mr-2" />
                            Generate Deep Analysis
                          </Button>
                        </CardContent>
                      </Card>
                    )}

                    {generatingSkillGap && (
                      <Card>
                        <CardContent className="p-12 text-center">
                          <div className="relative w-20 h-20 mx-auto mb-4">
                            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                            <Brain className="absolute inset-0 m-auto w-8 h-8 text-primary" />
                          </div>
                          <h3 className="text-lg font-semibold text-foreground mb-2">Analyzing Skills...</h3>
                          <p className="text-muted-foreground">AI is performing deep analysis of candidate skills</p>
                        </CardContent>
                      </Card>
                    )}

                    {skillGapAnalysis && !generatingSkillGap && (
                      <>
                        <SkillGapHeatmap skillGapAnalysis={skillGapAnalysis} />
                        <div className="flex justify-center">
                          <Button variant="outline" onClick={() => handleGenerateSkillGapAnalysis(selectedApplication._id)}>
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Regenerate Analysis
                          </Button>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <Card className="border-dashed border-2">
                    <CardContent className="p-12 text-center">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <AlertTriangle className="w-10 h-10 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">Evaluation Required</h3>
                      <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                        Run AI evaluation first to unlock skill analysis features.
                      </p>
                      <Button onClick={() => handleEvaluate(selectedApplication._id)} size="lg">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Run AI Evaluation
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="ai" className="space-y-4 mt-4">
                {selectedApplication.aiInsights ? (
                  <>
                    {/* AI Confidence & Overall Assessment */}
                    <Card className="overflow-hidden">
                      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <div className="w-20 h-20 rounded-full bg-background flex items-center justify-center shadow-lg">
                                <span className="text-2xl font-bold text-primary">{selectedApplication.aiInsights.overallScore}</span>
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                                <Brain className="w-4 h-4 text-primary-foreground" />
                              </div>
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-foreground">AI Assessment Score</h3>
                              <p className="text-muted-foreground">Based on comprehensive profile analysis</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">AI Confidence</p>
                              <p className="text-lg font-bold text-foreground">{selectedApplication.aiInsights.confidence}%</p>
                            </div>
                            <div className="w-16 h-16">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={[{ value: selectedApplication.aiInsights.confidence }, { value: 100 - selectedApplication.aiInsights.confidence }]}
                                    cx="50%" cy="50%" innerRadius={20} outerRadius={28}
                                    startAngle={90} endAngle={-270} dataKey="value"
                                  >
                                    <Cell fill="#3b82f6" />
                                    <Cell fill="#e5e7eb" />
                                  </Pie>
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Score Breakdown */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: 'Skills Match', value: selectedApplication.aiInsights.skillMatch, icon: Target, color: 'emerald' },
                        { label: 'Experience', value: selectedApplication.aiInsights.experienceScore, icon: Briefcase, color: 'blue' },
                        { label: 'Technical', value: selectedApplication.aiInsights.githubScore, icon: Code2, color: 'violet' },
                        { label: 'Education', value: selectedApplication.aiInsights.educationScore || 70, icon: GraduationCap, color: 'amber' },
                      ].map((item, idx) => {
                        const Icon = item.icon;
                        const colorMap: Record<string, string> = {
                          emerald: 'from-emerald-500 to-emerald-600',
                          blue: 'from-blue-500 to-blue-600',
                          violet: 'from-violet-500 to-violet-600',
                          amber: 'from-amber-500 to-amber-600',
                        };
                        return (
                          <Card key={idx} className="overflow-hidden">
                            <CardContent className="p-0">
                              <div className={`h-1.5 bg-gradient-to-r ${colorMap[item.color]}`} style={{ width: `${item.value}%` }} />
                              <div className="p-4">
                                <div className="flex items-center justify-between mb-1">
                                  <Icon className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">{item.value}%</span>
                                </div>
                                <p className="font-semibold text-foreground">{item.label}</p>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    {/* Strengths & Gaps */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <Card className="border-l-4 border-l-emerald-500">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                            </div>
                            Strengths
                            <Badge variant="secondary" className="ml-auto">{selectedApplication.aiInsights.strengths.length}</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {selectedApplication.aiInsights.strengths.length > 0 ? (
                            <ul className="space-y-3">
                              {selectedApplication.aiInsights.strengths.map((strength, index) => (
                                <li key={index} className="flex items-start gap-3 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors">
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm text-foreground">{strength}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No specific strengths identified.</p>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="border-l-4 border-l-amber-500">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                              <ArrowDownRight className="w-4 h-4 text-amber-600" />
                            </div>
                            Areas for Growth
                            <Badge variant="secondary" className="ml-auto">{selectedApplication.aiInsights.gaps.length}</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {selectedApplication.aiInsights.gaps.length > 0 ? (
                            <ul className="space-y-3">
                              {selectedApplication.aiInsights.gaps.map((gap, index) => (
                                <li key={index} className="flex items-start gap-3 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                                  <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm text-foreground">{gap}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No significant gaps identified.</p>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* AI Recommendation */}
                    <Card className={`overflow-hidden ${
                      selectedApplication.aiInsights.recommendation === 'select' 
                        ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950 dark:to-emerald-900/50 border-emerald-200 dark:border-emerald-800' 
                        : selectedApplication.aiInsights.recommendation === 'reject'
                        ? 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950 dark:to-red-900/50 border-red-200 dark:border-red-800'
                        : 'bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950 dark:to-amber-900/50 border-amber-200 dark:border-amber-800'
                    }`}>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            selectedApplication.aiInsights.recommendation === 'select'
                              ? 'bg-emerald-200 dark:bg-emerald-800'
                              : selectedApplication.aiInsights.recommendation === 'reject'
                              ? 'bg-red-200 dark:bg-red-800'
                              : 'bg-amber-200 dark:bg-amber-800'
                          }`}>
                            {selectedApplication.aiInsights.recommendation === 'select' ? (
                              <ThumbsUp className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                            ) : selectedApplication.aiInsights.recommendation === 'reject' ? (
                              <XCircle className="w-7 h-7 text-red-600 dark:text-red-400" />
                            ) : (
                              <Lightbulb className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-bold text-lg text-foreground">AI Recommendation</h3>
                              <Badge variant={
                                selectedApplication.aiInsights.recommendation === 'select' ? 'selected' :
                                selectedApplication.aiInsights.recommendation === 'reject' ? 'rejected' : 'review'
                              }>
                                {selectedApplication.aiInsights.recommendation.toUpperCase()}
                              </Badge>
                              {selectedApplication.aiInsights.confidenceLevel && (
                                <Badge variant="outline" className={
                                  selectedApplication.aiInsights.confidenceLevel === 'high' ? 'border-emerald-500 text-emerald-600' :
                                  selectedApplication.aiInsights.confidenceLevel === 'medium' ? 'border-amber-500 text-amber-600' :
                                  'border-red-500 text-red-600'
                                }>
                                  {selectedApplication.aiInsights.confidenceLevel.toUpperCase()} Confidence
                                </Badge>
                              )}
                            </div>
                            <p className="text-muted-foreground">
                              {selectedApplication.aiInsights.aiSummary || (
                                selectedApplication.aiInsights.recommendation === 'select'
                                  ? 'This candidate shows strong alignment with the role requirements. Recommend proceeding with interview scheduling.'
                                  : selectedApplication.aiInsights.recommendation === 'reject'
                                  ? 'This candidate does not meet the minimum requirements for this role. Consider providing constructive feedback.'
                                  : 'This candidate shows potential but has some gaps. Consider a technical assessment to evaluate further.'
                              )}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* GCC Evaluation Metrics */}
                    {(selectedApplication.aiInsights.aiMatchScore || selectedApplication.aiInsights.hiringReadinessScore) && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Brain className="w-4 h-4 text-primary" />
                            </div>
                            GCC Evaluation Metrics
                          </CardTitle>
                          <CardDescription>Advanced AI scoring aligned with Global Capability Center standards</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border border-blue-200 dark:border-blue-800">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">AI Match Score</span>
                                <Target className="w-4 h-4 text-blue-500" />
                              </div>
                              <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{selectedApplication.aiInsights.aiMatchScore || selectedApplication.aiInsights.overallScore}%</p>
                              <p className="text-xs text-blue-600/70 mt-1">Job requirement alignment</p>
                            </div>
                            <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border border-emerald-200 dark:border-emerald-800">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Hiring Readiness</span>
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              </div>
                              <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{selectedApplication.aiInsights.hiringReadinessScore || selectedApplication.aiInsights.overallScore}%</p>
                              <p className="text-xs text-emerald-600/70 mt-1">Overall hiring suitability</p>
                            </div>
                            <div className="p-4 rounded-lg bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950 dark:to-violet-900 border border-violet-200 dark:border-violet-800">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-violet-600 dark:text-violet-400">Project Alignment</span>
                                <Layers className="w-4 h-4 text-violet-500" />
                              </div>
                              <p className="text-3xl font-bold text-violet-700 dark:text-violet-300">{selectedApplication.aiInsights.projectAlignmentScore || 0}%</p>
                              <p className="text-xs text-violet-600/70 mt-1">Project tech stack match</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Risk Factors */}
                    {selectedApplication.aiInsights.riskFactorsList && selectedApplication.aiInsights.riskFactorsList.length > 0 && (
                      <Card className="border-l-4 border-l-red-500">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                            </div>
                            Risk Factors
                            <Badge variant="destructive" className="ml-auto">{selectedApplication.aiInsights.riskFactorsList.length}</Badge>
                          </CardTitle>
                          <CardDescription>Potential concerns identified during evaluation</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {selectedApplication.aiInsights.riskFactorsList.map((risk, index) => (
                              <li key={index} className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                                <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-foreground">{risk}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Project Analysis */}
                    {selectedApplication.aiInsights.projectAnalysis && (
                      <Card className="border-l-4 border-l-violet-500">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                              <Layers className="w-4 h-4 text-violet-600" />
                            </div>
                            Project Analysis
                          </CardTitle>
                          <CardDescription>How candidate's projects align with role requirements</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-foreground bg-violet-50 dark:bg-violet-900/20 p-4 rounded-lg border border-violet-100 dark:border-violet-800">
                            {selectedApplication.aiInsights.projectAnalysis}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Improvement Suggestions */}
                    {selectedApplication.aiInsights.improvementSuggestions && selectedApplication.aiInsights.improvementSuggestions.length > 0 && (
                      <Card className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                              <Lightbulb className="w-4 h-4 text-blue-600" />
                            </div>
                            Improvement Suggestions
                            <Badge variant="secondary" className="ml-auto">{selectedApplication.aiInsights.improvementSuggestions.length}</Badge>
                          </CardTitle>
                          <CardDescription>Recommendations for candidate development</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {selectedApplication.aiInsights.improvementSuggestions.map((suggestion, index) => (
                              <li key={index} className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                                <ArrowUpRight className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-foreground">{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">No AI Insights Yet</h3>
                      <p className="text-muted-foreground mb-4">Run the AI evaluation to get detailed insights about this candidate.</p>
                      <Button onClick={() => handleEvaluate(selectedApplication._id)}>
                        <Sparkles className="w-4 h-4" />
                        Run AI Evaluation
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Phase 4: Interview Focus Tab - Question Bank */}
              <TabsContent value="interview" className="space-y-4 mt-4">
                {/* Header Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
                    <CardContent className="p-4 text-center">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">160</p>
                      <p className="text-xs text-blue-600/80">Total Questions</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border-green-200 dark:border-green-800">
                    <CardContent className="p-4 text-center">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-600" />
                      <p className="text-2xl font-bold text-green-700 dark:text-green-400">7</p>
                      <p className="text-xs text-green-600/80">Topics Covered</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30 border-purple-200 dark:border-purple-800">
                    <CardContent className="p-4 text-center">
                      <Target className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                      <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">3</p>
                      <p className="text-xs text-purple-600/80">Difficulty Levels</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/30 border-amber-200 dark:border-amber-800">
                    <CardContent className="p-4 text-center">
                      <Clock className="w-8 h-8 mx-auto mb-2 text-amber-600" />
                      <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">~2h</p>
                      <p className="text-xs text-amber-600/80">Full Coverage</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Question Topics */}
                <div className="space-y-3">
                  {interviewTopics.map((topic) => {
                    const IconComponent = {
                      Code2: Code2,
                      Layers: Layers,
                      Brain: Brain,
                      Users: Users,
                      Briefcase: Briefcase,
                      BookOpen: BookOpen,
                      Heart: Heart,
                    }[topic.icon] || Code2;

                    const topicColors: Record<string, string> = {
                      'Technical Skills Assessment': 'from-blue-500 to-blue-600',
                      'System Design & Architecture': 'from-purple-500 to-purple-600',
                      'Problem Solving & Algorithms': 'from-emerald-500 to-emerald-600',
                      'Behavioral & Soft Skills': 'from-pink-500 to-pink-600',
                      'Project Experience Deep-Dive': 'from-amber-500 to-amber-600',
                      'Domain Knowledge': 'from-cyan-500 to-cyan-600',
                      'Culture Fit & Motivation': 'from-rose-500 to-rose-600',
                    };

                    return (
                      <Collapsible key={topic.id}>
                        <Card className="overflow-hidden">
                          <CollapsibleTrigger className="w-full">
                            <CardHeader className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${topicColors[topic.topic] || 'from-gray-500 to-gray-600'} flex items-center justify-center shadow-lg`}>
                                    <IconComponent className="w-6 h-6 text-white" />
                                  </div>
                                  <div className="text-left">
                                    <CardTitle className="text-base">{topic.topic}</CardTitle>
                                    <CardDescription className="text-sm">{topic.description}</CardDescription>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <Badge variant="secondary" className="font-semibold">
                                    {topic.questionCount} Questions
                                  </Badge>
                                  <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                </div>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="pt-0 pb-4 px-4">
                              <Separator className="mb-4" />
                              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                                {topic.questions.map((q, idx) => (
                                  <div
                                    key={q.id}
                                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                                  >
                                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                                      {idx + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-foreground">{q.question}</p>
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className={`flex-shrink-0 text-xs ${
                                        q.difficulty === 'easy'
                                          ? 'border-green-500 text-green-600 bg-green-50 dark:bg-green-950/30'
                                          : q.difficulty === 'medium'
                                          ? 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30'
                                          : 'border-red-500 text-red-600 bg-red-50 dark:bg-red-950/30'
                                      }`}
                                    >
                                      {q.difficulty}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                              {/* Difficulty breakdown */}
                              <div className="mt-4 pt-4 border-t">
                                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                                  <span>Difficulty Distribution</span>
                                </div>
                                <div className="flex gap-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                    <span className="text-xs">Easy: {topic.questions.filter(q => q.difficulty === 'easy').length}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                                    <span className="text-xs">Medium: {topic.questions.filter(q => q.difficulty === 'medium').length}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <span className="text-xs">Hard: {topic.questions.filter(q => q.difficulty === 'hard').length}</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })}
                </div>

                {/* AI Generated Questions Section */}
                {selectedApplication.aiInsights && (
                  <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold">AI-Tailored Questions</h4>
                            <p className="text-sm text-muted-foreground">Generate questions based on candidate's specific gaps</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleGenerateInterviewFocus(selectedApplication._id)}
                          disabled={generatingInterview}
                        >
                          {generatingInterview ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Lightbulb className="w-4 h-4" />
                              Generate Custom Questions
                            </>
                          )}
                        </Button>
                      </div>
                      {interviewFocus && !generatingInterview && (
                        <div className="mt-4 pt-4 border-t">
                          <InterviewFocusPanel interviewFocus={interviewFocus} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

      {/* Phase 3: Status Update Dialog with AI-generated justification */}
      <StatusUpdateDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        applicationId={pendingApplicationId}
        targetStatus={pendingStatus}
        candidateName={selectedApplication?.applicantId?.fullName || 'Candidate'}
        onConfirm={handleStatusConfirm}
      />
    </div>
  );
};

export default CandidateEvaluation;
