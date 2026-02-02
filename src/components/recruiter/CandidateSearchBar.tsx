import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface CandidateSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const CandidateSearchBar = ({ 
  value, 
  onChange, 
  placeholder = "Search by candidate name or email..." 
}: CandidateSearchBarProps) => {
  return (
    <div className="relative flex-1 max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 pr-10"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
