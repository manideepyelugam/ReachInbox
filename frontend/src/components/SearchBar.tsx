import React from 'react';
import { Search, X, Sparkles } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search emails by recipient, subject, body, or sender...',
}) => {
  return (
    <div className="relative w-full max-w-lg">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
        <Search className="h-4 w-4" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-24 py-2 bg-surface-900 border border-surface-700/70 focus:border-brand-500 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all shadow-inner"
      />
      <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1.5">
        {value && (
          <button
            onClick={() => onChange('')}
            className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-800 text-[10px] text-slate-400 border border-surface-700">
          <Sparkles className="h-2.5 w-2.5 text-indigo-400" />
          ES Index
        </span>
      </div>
    </div>
  );
};
