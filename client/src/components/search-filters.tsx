import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X, Eraser } from "lucide-react";
import type { SearchFilters as SearchFiltersType } from "@shared/schema";

interface SearchFiltersProps {
  onFiltersChange: (filters: SearchFiltersType) => void;
  resultsCount: number;
}

const EPISODE_LENGTHS = [
  { value: "Under 10 minutes", label: "Under 10 minutes" },
  { value: "10-20 minutes", label: "10-20 minutes" },
  { value: "20-40 minutes", label: "20-40 minutes" },
  { value: "40+ minutes", label: "40+ minutes" },
];

const CATEGORIES = [
  "Educational",
  "Entertainment",
  "Regional",
  "Wine Business",
];

const SORT_OPTIONS = [
  { value: "title", label: "Name A-Z" },
  { value: "title-desc", label: "Name Z-A" },
  { value: "year", label: "Launch Year" },
  { value: "year-desc", label: "Launch Year (Recent)" },
  { value: "episodes", label: "Episode Count" },
  { value: "episodes-desc", label: "Episode Count (Most)" },
  { value: "country", label: "Country" },
];

export function SearchFilters({ onFiltersChange, resultsCount }: SearchFiltersProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [episodeLength, setEpisodeLength] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("");

  // Update filters when any value changes
  useEffect(() => {
    const filters: SearchFiltersType = {
      query: searchQuery || undefined,
      episodeLength: episodeLength || undefined,
      categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      sortBy: (sortBy as any) || undefined,
    };

    onFiltersChange(filters);
  }, [searchQuery, episodeLength, selectedCategories, sortBy]);

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setEpisodeLength("");
    setSelectedCategories([]);
    setSortBy("");
  };

  return (
    <div className="bg-card rounded-xl p-6 mb-8 search-bar">
      {/* Search Bar */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="text-muted-foreground w-5 h-5" />
        </div>
        <Input
          type="text"
          placeholder="Search podcasts by name, host, keywords, or region..."
          className="w-full pl-12 pr-12 py-4 text-lg"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="input-search"
        />
        {searchQuery && (
          <button 
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground transition-colors"
            onClick={clearSearch}
            data-testid="button-clear-search"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="space-y-4">
        {/* Episode Length Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground min-w-max">Episode Length:</span>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={!episodeLength ? "default" : "outline"}
              size="sm"
              onClick={() => setEpisodeLength("")}
              className={`filter-pill ${!episodeLength ? 'active' : ''}`}
              data-testid="filter-length-all"
            >
              All Lengths
            </Button>
            {EPISODE_LENGTHS.map(length => (
              <Button
                key={length.value}
                variant={episodeLength === length.value ? "default" : "outline"}
                size="sm"
                onClick={() => setEpisodeLength(length.value)}
                className={`filter-pill ${episodeLength === length.value ? 'active' : ''}`}
                data-testid={`filter-length-${length.value}`}
              >
                {length.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground min-w-max">Categories:</span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(category => (
              <Button
                key={category}
                variant={selectedCategories.includes(category) ? "default" : "outline"}
                size="sm"
                onClick={() => handleCategoryToggle(category)}
                className={`filter-pill ${selectedCategories.includes(category) ? 'active' : ''}`}
                data-testid={`filter-category-${category.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Results: <span className="font-semibold text-primary" data-testid="text-results-count">{resultsCount}</span>
            </span>
            <div className="flex items-center gap-2">
              <label htmlFor="sortBy" className="text-sm text-muted-foreground">Sort by:</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48" data-testid="select-sort">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={clearAllFilters}
            className="text-destructive hover:text-destructive/80"
            data-testid="button-clear-all-filters"
          >
            <Eraser className="w-4 h-4 mr-2" />
            Clear All Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
