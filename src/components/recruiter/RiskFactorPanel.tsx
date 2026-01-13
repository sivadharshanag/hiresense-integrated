import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, AlertTriangle, Info, XCircle } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface RiskFactor {
  type: 'warning' | 'concern' | 'blocker';
  message: string;
  category: 'skills' | 'experience' | 'activity' | 'profile';
}

interface RiskFactorPanelProps {
  riskFactors: RiskFactor[];
  className?: string;
}

export function RiskFactorPanel({ riskFactors, className }: RiskFactorPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!riskFactors || riskFactors.length === 0) {
    return (
      <Alert className={cn('border-green-200 bg-green-50', className)}>
        <Info className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          No significant risks identified. Candidate meets all key requirements.
        </AlertDescription>
      </Alert>
    );
  }

  const getRiskIcon = (type: string) => {
    switch (type) {
      case 'blocker':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'concern':
        return <Info className="h-4 w-4 text-blue-600" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getRiskBadgeColor = (type: string) => {
    switch (type) {
      case 'blocker':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'concern':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRiskAlertColor = (type: string) => {
    switch (type) {
      case 'blocker':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'concern':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      skills: 'Skills Gap',
      experience: 'Experience Level',
      activity: 'Code Activity',
      profile: 'Profile Completeness',
    };
    return labels[category] || category;
  };

  // Count risk types
  const blockers = riskFactors.filter((r) => r.type === 'blocker').length;
  const warnings = riskFactors.filter((r) => r.type === 'warning').length;
  const concerns = riskFactors.filter((r) => r.type === 'concern').length;

  return (
    <div className={cn('space-y-2', className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <span className="font-semibold text-gray-900">
              Why this score?
            </span>
            <div className="flex gap-1.5 ml-2">
              {blockers > 0 && (
                <Badge className="bg-red-100 text-red-800 border-red-300 text-xs">
                  {blockers} Blocker{blockers > 1 ? 's' : ''}
                </Badge>
              )}
              {warnings > 0 && (
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">
                  {warnings} Warning{warnings > 1 ? 's' : ''}
                </Badge>
              )}
              {concerns > 0 && (
                <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs">
                  {concerns} Concern{concerns > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-600" />
          )}
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-2 space-y-2">
          {riskFactors.map((risk, index) => (
            <Alert
              key={index}
              className={cn('border', getRiskAlertColor(risk.type))}
            >
              <div className="flex items-start gap-3">
                {getRiskIcon(risk.type)}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn('text-xs capitalize', getRiskBadgeColor(risk.type))}
                    >
                      {getCategoryLabel(risk.category)}
                    </Badge>
                  </div>
                  <AlertDescription className="text-gray-800 leading-relaxed">
                    {risk.message}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          ))}
          
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Risk factors are automatically identified by analyzing candidate data. 
              Consider these alongside strengths when making hiring decisions.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
