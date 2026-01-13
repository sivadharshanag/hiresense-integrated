import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Lightbulb, AlertTriangle } from 'lucide-react';

interface InterviewQuestion {
  category: 'technical' | 'behavioral' | 'experience';
  question: string;
  whatToLookFor: string;
  priority: 'high' | 'medium' | 'low';
}

interface InterviewFocusData {
  summary: string;
  questions: InterviewQuestion[];
  keyAreasToProbe: string[];
  redFlags: string[];
}

interface InterviewFocusPanelProps {
  interviewFocus: InterviewFocusData;
}

const categoryColors = {
  technical: 'bg-blue-500',
  behavioral: 'bg-purple-500',
  experience: 'bg-green-500',
};

const categoryLabels = {
  technical: 'Technical',
  behavioral: 'Behavioral',
  experience: 'Experience',
};

const priorityColors = {
  high: 'border-red-500 bg-red-50',
  medium: 'border-yellow-500 bg-yellow-50',
  low: 'border-gray-500 bg-gray-50',
};

const priorityIcons = {
  high: <AlertCircle className="w-4 h-4 text-red-500" />,
  medium: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
  low: <CheckCircle className="w-4 h-4 text-gray-500" />,
};

export function InterviewFocusPanel({ interviewFocus }: InterviewFocusPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-primary" />
          <CardTitle>AI-Generated Interview Focus</CardTitle>
        </div>
        <CardDescription>{interviewFocus.summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Interview Questions */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Interview Questions ({interviewFocus.questions.length})</h3>
          {interviewFocus.questions.map((q, index) => (
            <div
              key={index}
              className={`border-l-4 p-4 rounded-r-lg ${priorityColors[q.priority]}`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  {priorityIcons[q.priority]}
                  <Badge
                    variant="outline"
                    className={`${categoryColors[q.category]} text-white border-none`}
                  >
                    {categoryLabels[q.category]}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {q.priority.toUpperCase()} Priority
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">Q{index + 1}</span>
              </div>
              <p className="font-medium text-sm mb-2">{q.question}</p>
              <div className="bg-white/50 p-2 rounded text-xs text-muted-foreground">
                <span className="font-semibold">What to look for: </span>
                {q.whatToLookFor}
              </div>
            </div>
          ))}
        </div>

        {/* Key Areas to Probe */}
        {interviewFocus.keyAreasToProbe.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-500" />
              Key Areas to Probe
            </h3>
            <ul className="space-y-1 ml-6">
              {interviewFocus.keyAreasToProbe.map((area, index) => (
                <li key={index} className="text-sm text-muted-foreground list-disc">
                  {area}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Red Flags */}
        {interviewFocus.redFlags.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              Red Flags to Address
            </h3>
            <ul className="space-y-1 ml-6">
              {interviewFocus.redFlags.map((flag, index) => (
                <li key={index} className="text-sm text-destructive list-disc">
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-xs text-muted-foreground pt-4 border-t">
          💡 Tip: Use these questions as a starting point. Feel free to adapt them based on the
          candidate's responses and your specific needs.
        </div>
      </CardContent>
    </Card>
  );
}
