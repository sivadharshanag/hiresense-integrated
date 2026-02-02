import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { X, Filter, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Job {
  _id: string;
  title: string;
}

interface FilterState {
  status: string[];
  jobId: string;
  scoreRange: [number, number];
  recommendation: string;
  confidenceLevel: string;
  hasInterview: string;
  interviewStatus: string;
}

interface CandidateFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  jobs: Job[];
  onClearAll: () => void;
  resultsCount?: number;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-gray-500' },
  { value: 'under_review', label: 'Under Review', color: 'bg-blue-500' },
  { value: 'reviewing', label: 'Reviewing', color: 'bg-blue-500' },
  { value: 'selected', label: 'Selected', color: 'bg-green-500' },
  { value: 'shortlisted', label: 'Shortlisted', color: 'bg-green-500' },
  { value: 'interview', label: 'Interview', color: 'bg-purple-500' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-500' },
  { value: 'hired', label: 'Hired', color: 'bg-emerald-500' },
];

const INTERVIEW_STATUS_OPTIONS = [
  { value: 'all', label: 'All Candidates' },
  { value: 'scheduled', label: 'Interview Scheduled' },
  { value: 'completed', label: 'Interview Completed' },
  { value: 'none', label: 'No Interview' },
];

const RECOMMENDATION_OPTIONS = [
  { value: 'all', label: 'All Recommendations' },
  { value: 'select', label: '✅ Recommend Select', color: 'text-success' },
  { value: 'review', label: '🤔 Needs Review', color: 'text-warning' },
  { value: 'reject', label: '❌ Recommend Reject', color: 'text-destructive' },
];

const CONFIDENCE_OPTIONS = [
  { value: 'all', label: 'All Confidence Levels' },
  { value: 'high', label: '🟢 High Confidence' },
  { value: 'medium', label: '🟡 Medium Confidence' },
  { value: 'low', label: '🔴 Low Confidence' },
];

export const CandidateFilters = ({
  filters,
  onChange,
  jobs,
  onClearAll,
  resultsCount,
}: CandidateFiltersProps) => {
  const toggleStatus = (status: string) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    onChange({ ...filters, status: newStatuses });
  };

  const hasActiveFilters = 
    filters.status.length > 0 ||
    filters.jobId !== 'all' ||
    filters.scoreRange[0] > 0 ||
    filters.scoreRange[1] < 100 ||
    filters.recommendation !== 'all' ||
    filters.confidenceLevel !== 'all' ||
    filters.hasInterview !== 'all' ||
    filters.interviewStatus !== 'all';

  const getScoreRangeLabel = () => {
    if (filters.scoreRange[0] === 0 && filters.scoreRange[1] === 100) {
      return 'All Scores';
    }
    return `${filters.scoreRange[0]} - ${filters.scoreRange[1]}`;
  };

  const getScoreRangeIcon = () => {
    const avg = (filters.scoreRange[0] + filters.scoreRange[1]) / 2;
    if (avg >= 70) return <TrendingUp className="w-4 h-4 text-success" />;
    if (avg >= 40) return <Minus className="w-4 h-4 text-warning" />;
    return <TrendingDown className="w-4 h-4 text-destructive" />;
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Filters</h3>
              {resultsCount !== undefined && (
                <Badge variant="secondary" className="ml-2">
                  {resultsCount} {resultsCount === 1 ? 'result' : 'results'}
                </Badge>
              )}
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          {/* Quick Status Filters */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Application Status</Label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => {
                const isSelected = filters.status.includes(option.value);
                return (
                  <Badge
                    key={option.value}
                    variant={isSelected ? 'default' : 'outline'}
                    className={`cursor-pointer transition-all ${
                      isSelected ? option.color + ' text-white hover:opacity-90' : 'hover:bg-secondary'
                    }`}
                    onClick={() => toggleStatus(option.value)}
                  >
                    {option.label}
                    {isSelected && <X className="w-3 h-3 ml-1" />}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Advanced Filters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Job Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Job Position</Label>
              <Select
                value={filters.jobId}
                onValueChange={(value) => onChange({ ...filters, jobId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Jobs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jobs</SelectItem>
                  {jobs.map((job) => (
                    <SelectItem key={job._id} value={job._id}>
                      {job.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Interview Status Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Interview Status</Label>
              <Select
                value={filters.interviewStatus}
                onValueChange={(value) => onChange({ ...filters, interviewStatus: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  {INTERVIEW_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* AI Recommendation Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">AI Recommendation</Label>
              <Select
                value={filters.recommendation}
                onValueChange={(value) => onChange({ ...filters, recommendation: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  {RECOMMENDATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Confidence Level Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Confidence Level</Label>
              <Select
                value={filters.confidenceLevel}
                onValueChange={(value) => onChange({ ...filters, confidenceLevel: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  {CONFIDENCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* AI Score Range Filter */}
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                {getScoreRangeIcon()}
                AI Score Range: {getScoreRangeLabel()}
              </Label>
              <Slider
                min={0}
                max={100}
                step={5}
                value={filters.scoreRange}
                onValueChange={(value) => onChange({ ...filters, scoreRange: value as [number, number] })}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 (Low)</span>
                <span>50 (Average)</span>
                <span>100 (Excellent)</span>
              </div>
            </div>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="pt-4 border-t">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {filters.status.length > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    Status: {filters.status.length}
                    <button onClick={() => onChange({ ...filters, status: [] })}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {filters.jobId !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Job: {jobs.find(j => j._id === filters.jobId)?.title}
                    <button onClick={() => onChange({ ...filters, jobId: 'all' })}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {(filters.scoreRange[0] > 0 || filters.scoreRange[1] < 100) && (
                  <Badge variant="secondary" className="gap-1">
                    Score: {filters.scoreRange[0]}-{filters.scoreRange[1]}
                    <button onClick={() => onChange({ ...filters, scoreRange: [0, 100] })}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {filters.recommendation !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    {RECOMMENDATION_OPTIONS.find(r => r.value === filters.recommendation)?.label}
                    <button onClick={() => onChange({ ...filters, recommendation: 'all' })}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {filters.confidenceLevel !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    {CONFIDENCE_OPTIONS.find(c => c.value === filters.confidenceLevel)?.label}
                    <button onClick={() => onChange({ ...filters, confidenceLevel: 'all' })}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {filters.interviewStatus !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    {INTERVIEW_STATUS_OPTIONS.find(i => i.value === filters.interviewStatus)?.label}
                    <button onClick={() => onChange({ ...filters, interviewStatus: 'all' })}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
