import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, XCircle, TrendingUp } from 'lucide-react';

interface SkillGapData {
  skill: string;
  required: boolean;
  candidateLevel: number;
  matchStatus: 'strong' | 'moderate' | 'weak' | 'missing';
  gap: number;
}

interface SkillGapAnalysis {
  overallMatch: number;
  strongSkills: SkillGapData[];
  moderateSkills: SkillGapData[];
  weakSkills: SkillGapData[];
  missingSkills: SkillGapData[];
  summary: string;
}

interface SkillGapHeatmapProps {
  skillGapAnalysis: SkillGapAnalysis;
}

const getBarColor = (level: number): string => {
  if (level >= 80) return 'bg-green-500';
  if (level >= 50) return 'bg-yellow-500';
  if (level > 0) return 'bg-orange-500';
  return 'bg-red-500';
};

const getTextColor = (level: number): string => {
  if (level >= 80) return 'text-green-600';
  if (level >= 50) return 'text-yellow-600';
  if (level > 0) return 'text-orange-600';
  return 'text-red-600';
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'strong':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'moderate':
      return <TrendingUp className="w-4 h-4 text-yellow-500" />;
    case 'weak':
      return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    case 'missing':
      return <XCircle className="w-4 h-4 text-red-500" />;
  }
};

const SkillBar = ({ skill }: { skill: SkillGapData }) => {
  const barColor = getBarColor(skill.candidateLevel);
  const textColor = getTextColor(skill.candidateLevel);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon(skill.matchStatus)}
          <span className="text-sm font-medium">
            {skill.skill}
            {skill.required && <span className="text-red-500 ml-1">*</span>}
          </span>
        </div>
        <span className={`text-sm font-semibold ${textColor}`}>
          {skill.candidateLevel}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className={`${barColor} h-2.5 rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${skill.candidateLevel}%` }}
        />
      </div>
    </div>
  );
};

export function SkillGapHeatmap({ skillGapAnalysis }: SkillGapHeatmapProps) {
  const allSkills = [
    ...skillGapAnalysis.strongSkills,
    ...skillGapAnalysis.moderateSkills,
    ...skillGapAnalysis.weakSkills,
    ...skillGapAnalysis.missingSkills,
  ];

  // Separate required and bonus skills
  const requiredSkills = allSkills.filter(s => s.required);
  const bonusSkills = allSkills.filter(s => !s.required);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Skill Gap Analysis
            </CardTitle>
            <CardDescription>{skillGapAnalysis.summary}</CardDescription>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">
              {skillGapAnalysis.overallMatch}%
            </div>
            <div className="text-xs text-muted-foreground">Overall Match</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Legend */}
        <div className="flex flex-wrap gap-4 p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-xs">Strong (80%+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span className="text-xs">Moderate (50-80%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span className="text-xs">Weak (&lt;50%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-xs">Missing (0%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-500 text-xs font-bold">*</span>
            <span className="text-xs">Required Skill</span>
          </div>
        </div>

        {/* Required Skills */}
        {requiredSkills.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              Required Skills ({requiredSkills.length})
            </h3>
            <div className="space-y-3">
              {requiredSkills.map((skill, index) => (
                <SkillBar key={index} skill={skill} />
              ))}
            </div>
          </div>
        )}

        {/* Bonus Skills */}
        {bonusSkills.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Bonus Skills ({bonusSkills.length})
              </Badge>
            </h3>
            <div className="space-y-3">
              {bonusSkills.slice(0, 5).map((skill, index) => (
                <SkillBar key={index} skill={skill} />
              ))}
              {bonusSkills.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{bonusSkills.length - 5} more skills
                </p>
              )}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {skillGapAnalysis.strongSkills.filter(s => s.required).length}
            </div>
            <div className="text-xs text-muted-foreground">Strong</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {skillGapAnalysis.moderateSkills.filter(s => s.required).length}
            </div>
            <div className="text-xs text-muted-foreground">Moderate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {skillGapAnalysis.weakSkills.filter(s => s.required).length}
            </div>
            <div className="text-xs text-muted-foreground">Weak</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {skillGapAnalysis.missingSkills.filter(s => s.required).length}
            </div>
            <div className="text-xs text-muted-foreground">Missing</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
