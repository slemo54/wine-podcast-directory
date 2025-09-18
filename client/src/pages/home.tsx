import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatisticsHeader } from "@/components/statistics-header";
import { SearchFilters } from "@/components/search-filters";
import { PodcastCard } from "@/components/podcast-card";
import { CSVImport } from "@/components/csv-import";
import { Button } from "@/components/ui/button";
import { Grid, List, Search, Upload } from "lucide-react";
import type { Podcast, SearchFilters as SearchFiltersType } from "@shared/schema";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"discover" | "import">("discover");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchFilters, setSearchFilters] = useState<SearchFiltersType>({});

  // Main podcasts query
  const { data: podcasts = [], isLoading } = useQuery<Podcast[]>({
    queryKey: ["/api/podcasts", searchFilters],
    enabled: activeTab === "discover",
  });

  // Favorites functionality removed per user requirements

  const handleFilterChange = (filters: SearchFiltersType) => {
    setSearchFilters(filters);
  };

  const handleTabChange = (tab: "discover" | "import") => {
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header with Statistics */}
      <StatisticsHeader />

      {/* Navigation Tabs */}
      <nav className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8">
            <button 
              className={`flex items-center gap-2 px-4 py-4 border-b-2 font-medium transition-colors ${
                activeTab === "discover" 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => handleTabChange("discover")}
              data-testid="tab-discover"
            >
              <Search className="w-4 h-4" />
              <span>Discover</span>
            </button>
            {/* Favorites tab removed per user requirements */}
            <button 
              className={`flex items-center gap-2 px-4 py-4 border-b-2 font-medium transition-colors ${
                activeTab === "import" 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => handleTabChange("import")}
              data-testid="tab-import"
            >
              <Upload className="w-4 h-4" />
              <span>Import CSV</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {/* Discover Tab */}
        {activeTab === "discover" && (
          <>
            {/* Search and Filters */}
            <SearchFilters 
              onFiltersChange={handleFilterChange}
              resultsCount={podcasts.length}
            />

            {/* Podcast Grid */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Discover Podcasts</h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    data-testid="button-grid-view"
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    data-testid="button-list-view"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-96 bg-muted animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : podcasts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No podcasts found</h3>
                  <p className="text-muted-foreground">Try adjusting your search criteria or import some podcast data.</p>
                </div>
              ) : (
                <div className={`grid gap-6 ${
                  viewMode === "grid" 
                    ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
                    : "grid-cols-1"
                }`}>
                  {podcasts.map((podcast) => (
                    <PodcastCard
                      key={podcast.id}
                      podcast={podcast}
                      viewMode={viewMode}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Favorites functionality removed per user requirements */}

        {/* Import Tab */}
        {activeTab === "import" && <CSVImport />}
      </main>

      {/* Podcast detail modal removed per user requirements */}
    </div>
  );
}
