import React from 'react';
import { Search, X, SlidersHorizontal, RotateCw } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onRefresh: () => void;
  loading?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onRefresh,
  loading = false,
}) => {
  return (
    <div className="flex items-center gap-3 w-full max-w-3xl">
      {/* Pill Search Input */}
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
          <Search className="h-3.5 w-3.5" />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search"
          className="w-full pl-9 pr-8 py-2 bg-[#F3F4F6] border-none rounded-full text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 transition-all"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filter Icon */}
      <button
        type="button"
        className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
        title="Filter emails"
      >
        <SlidersHorizontal className="h-4 w-4" />
      </button>

      {/* Refresh Icon */}
      <button
        type="button"
        onClick={onRefresh}
        className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
        title="Refresh emails"
      >
        <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin text-[#00A651]' : ''}`} />
      </button>
    </div>
  );
};
