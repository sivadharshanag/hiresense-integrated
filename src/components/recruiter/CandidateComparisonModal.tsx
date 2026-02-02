import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  User,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Award,
  Target,
} from 'lucide-react';

interface ComparisonCandidate {
  _id: string;
  applicantId: {
    fullName: string;
    email: string;
  };
  aiInsights: {
    overallScore: number;
    skillMatch: number;
    experienceScore: number;
    githubScore: number;
    recommendation: string;
    confidenceLevel?: string;
    riskFactors?: Array<{ type: string; message: string }>;
    gaps?: Array<{ category: string; description: string }>;
    strengths?: string[];
  };
  status: string;
}

interface CandidateComparisonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: ComparisonCandidate[];
}

export const CandidateComparisonModal = ({
  open,
  onOpenChange,
  candidates,
}: CandidateComparisonModalProps) => {
  if (candidates.length < 2) return null;

  // Find best and worst for each metric
  const getBestWorst = (metric: 'overallScore' | 'skillMatch' | 'experienceScore' | 'githubScore') => {
    const scores = candidates.map((c) => c.aiInsights[metric]);
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    return { max, min };
  };

  const getComparisonIcon = (value: number, metric: 'overallScore' | 'skillMatch' | 'experienceScore' | 'githubScore') => {
    const { max, min } = getBestWorst(metric);
    if (value === max && value !== min) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (value === min && value !== max) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getConfidenceColor = (confidence?: string) => {
    switch (confidence?.toLowerCase()) {
      case 'high':
        return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
      case 'low':
        return 'bg-red-500/10 text-red-700 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation.toLowerCase()) {
      case 'strong_yes':
        return 'bg-green-500/10 text-green-700';
      case 'yes':
        return 'bg-blue-500/10 text-blue-700';
      case 'maybe':
        return 'bg-yellow-500/10 text-yellow-700';
      case 'no':
        return 'bg-red-500/10 text-red-700';
      default:
        return 'bg-gray-500/10 text-gray-700';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Candidate Comparison ({candidates.length} Candidates)
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {candidates.map((candidate) => (
            <Card key={candidate._id} className="border-2">
              <CardContent className="p-6 space-y-4">
                {/* Header */}
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg">{candidate.applicantId.fullName}</h3>
                  <p className="text-xs text-muted-foreground">{candidate.applicantId.email}</p>
                  <Badge className="mt-2 capitalize">{candidate.status.replace('_', ' ')}</Badge>
                </div>

                <Separator />

                {/* Overall Score - Prominent */}
                <div className="text-center bg-primary/5 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Award className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">Overall Score</span>
                  </div>
                  <div className="text-4xl font-bold text-primary flex items-center justify-center gap-2">
                    {candidate.aiInsights.overallScore}
                    {getComparisonIcon(candidate.aiInsights.overallScore, 'overallScore')}
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Skills</div>
                    <div className="text-xl font-bold flex items-center justify-center gap-1">
                      {candidate.aiInsights.skillMatch}%
                      {getComparisonIcon(candidate.aiInsights.skillMatch, 'skillMatch')}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Experience</div>
                    <div className="text-xl font-bold flex items-center justify-center gap-1">
                      {candidate.aiInsights.experienceScore}%
                      {getComparisonIcon(candidate.aiInsights.experienceScore, 'experienceScore')}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg col-span-2">
                    <div className="text-xs text-muted-foreground mb-1">GitHub Score</div>
                    <div className="text-xl font-bold flex items-center justify-center gap-1">
                      {candidate.aiInsights.githubScore}
                      {getComparisonIcon(candidate.aiInsights.githubScore, 'githubScore')}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Confidence & Recommendation */}
                <div className="space-y-2">
                  {candidate.aiInsights.confidenceLevel && (
                    <div>
                      <span className="text-xs text-muted-foreground">Confidence:</span>
                      <Badge
                        variant="outline"
                        className={`ml-2 ${getConfidenceColor(candidate.aiInsights.confidenceLevel)}`}
                      >
                        {candidate.aiInsights.confidenceLevel}
                      </Badge>
                    </div>
                  )}
                  <div>
                    <span className="text-xs text-muted-foreground">Recommendation:</span>
                    <Badge className={`ml-2 ${getRecommendationColor(candidate.aiInsights.recommendation)}`}>
                      {candidate.aiInsights.recommendation.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                {/* Strengths */}
                {candidate.aiInsights.strengths && candidate.aiInsights.strengths.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-semibold text-green-700">Strengths</span>
                      </div>
                      <ul className="space-y-1">
                        {candidate.aiInsights.strengths.slice(0, 3).map((strength, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground pl-5 relative">
                            <span className="absolute left-0">•</span>
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {/* Risk Factors */}
                {candidate.aiInsights.riskFactors && candidate.aiInsights.riskFactors.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        <span className="text-xs font-semibold text-orange-700">Risks</span>
                      </div>
                      <ul className="space-y-1">
                        {candidate.aiInsights.riskFactors.slice(0, 2).map((risk, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground pl-5 relative">
                            <span className="absolute left-0">•</span>
                            {risk.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {/* Gaps */}
                {candidate.aiInsights.gaps && candidate.aiInsights.gaps.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-xs font-semibold text-red-700">Gaps</span>
                      </div>
                      <ul className="space-y-1">
                        {candidate.aiInsights.gaps.slice(0, 2).map((gap, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground pl-5 relative">
                            <span className="absolute left-0">•</span>
                            {gap.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary */}
        <Card className="mt-4 bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h4 className="font-semibold text-sm mb-2 text-blue-900">Quick Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-blue-700 font-medium">Highest Score:</span>
                <p className="font-bold text-blue-900">
                  {candidates.reduce((max, c) => (c.aiInsights.overallScore > max.aiInsights.overallScore ? c : max)).applicantId.fullName} ({candidates.reduce((max, c) => Math.max(max, c.aiInsights.overallScore), 0)})
                </p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Best Skills:</span>
                <p className="font-bold text-blue-900">
                  {candidates.reduce((max, c) => (c.aiInsights.skillMatch > max.aiInsights.skillMatch ? c : max)).applicantId.fullName} ({candidates.reduce((max, c) => Math.max(max, c.aiInsights.skillMatch), 0)}%)
                </p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Most Experienced:</span>
                <p className="font-bold text-blue-900">
                  {candidates.reduce((max, c) => (c.aiInsights.experienceScore > max.aiInsights.experienceScore ? c : max)).applicantId.fullName} ({candidates.reduce((max, c) => Math.max(max, c.aiInsights.experienceScore), 0)}%)
                </p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Best GitHub:</span>
                <p className="font-bold text-blue-900">
                  {candidates.reduce((max, c) => (c.aiInsights.githubScore > max.aiInsights.githubScore ? c : max)).applicantId.fullName} ({candidates.reduce((max, c) => Math.max(max, c.aiInsights.githubScore), 0)})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};
