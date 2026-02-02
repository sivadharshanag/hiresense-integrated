import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ConfidenceBadgeProps {
  level: 'low' | 'medium' | 'high';
  score?: number;
  className?: string;
}

export function ConfidenceBadge({ level, score, className }: ConfidenceBadgeProps) {
  const getVariant = () => {
    switch (level) {
      case 'high':
        return 'default'; // Green
      case 'medium':
        return 'secondary'; // Yellow
      case 'low':
        return 'destructive'; // Red
      default:
        return 'secondary';
    }
  };

  const getIcon = () => {
    switch (level) {
      case 'high':
        return '✓';
      case 'medium':
        return '○';
      case 'low':
        return '!';
      default:
        return '○';
    }
  };

  const getLabel = () => {
    switch (level) {
      case 'high':
        return 'High Confidence';
      case 'medium':
        return 'Medium Confidence';
      case 'low':
        return 'Low Confidence';
      default:
        return 'Medium Confidence';
    }
  };

  const getColorClasses = () => {
    switch (level) {
      case 'high':
        return 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200';
      case 'low':
        return 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200';
    }
  };

  return (
    <Badge
      variant={getVariant()}
      className={cn(
        'px-3 py-1 text-sm font-medium border',
        getColorClasses(),
        className
      )}
    >
      <span className="mr-1">{getIcon()}</span>
      {getLabel()}
      {score !== undefined && (
        <span className="ml-1 opacity-75">({score}%)</span>
      )}
    </Badge>
  );
}
