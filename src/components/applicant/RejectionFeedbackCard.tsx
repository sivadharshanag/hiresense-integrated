import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  XCircle,
  Lightbulb,
  BookOpen,
  ArrowRight,
  Sparkles,
  Heart,
  Target,
  TrendingUp,
} from 'lucide-react';

interface RejectionFeedback {
  status: string;
  statusMessage: string;
  reasons: string[];
  improvementAreas: string[];
  learningFocus: string[];
  encouragement: string;
}

interface RejectionFeedbackCardProps {
  jobTitle: string;
  feedback: RejectionFeedback;
  onClose?: () => void;
}

const RejectionFeedbackCard = ({ jobTitle, feedback, onClose }: RejectionFeedbackCardProps) => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Status Header */}
      <div className="text-center py-4 px-6 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 rounded-lg border border-orange-200 dark:border-orange-900/30">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
        </div>
        <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700 mb-2">
          {feedback.status || 'Not Selected'}
        </Badge>
        <h3 className="font-semibold text-foreground text-lg mt-2">{jobTitle}</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          {feedback.statusMessage}
        </p>
      </div>

      {/* Reasons Section */}
      {feedback.reasons && feedback.reasons.length > 0 && (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-slate-600" />
              What Influenced This Decision
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {feedback.reasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                  <span className="text-muted-foreground">{reason}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Improvement Suggestions */}
      {feedback.improvementAreas && feedback.improvementAreas.length > 0 && (
        <Card className="border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Lightbulb className="w-4 h-4" />
              Recommended Areas to Strengthen
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-3">
              {feedback.improvementAreas.map((area, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <TrendingUp className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm text-foreground">{area}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Learning Focus */}
      {feedback.learningFocus && feedback.learningFocus.length > 0 && (
        <Card className="border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-purple-700 dark:text-purple-400">
              <BookOpen className="w-4 h-4" />
              Suggested Learning Focus
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {feedback.learningFocus.map((topic, idx) => (
                <Badge 
                  key={idx} 
                  variant="secondary" 
                  className="bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {topic}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Encouragement Footer */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg p-4 border border-green-200 dark:border-green-900/30">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
            <Heart className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-green-800 dark:text-green-300 font-medium">
              {feedback.encouragement || 'This feedback is provided to help you prepare for future opportunities. Keep learning and growing!'}
            </p>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-center pt-2">
        <Link to="/applicant/jobs">
          <Button variant="gradient" className="gap-2">
            Browse More Opportunities
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-center text-muted-foreground italic">
        This feedback is AI-generated guidance to help you grow. Every application is a learning opportunity.
      </p>
    </div>
  );
};

export default RejectionFeedbackCard;
