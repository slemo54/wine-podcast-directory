import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchFilters } from "@/components/search-filters";
import { PodcastCard } from "@/components/podcast-card";
import { CSVImport } from "@/components/csv-import";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Grid, List, Search, Upload, Heart, FileText, LogOut, User as UserIcon, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Podcast, SearchFilters as SearchFiltersType, UserFavorite, User } from "@shared/schema";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"discover" | "favorites" | "notes" | "import">("discover");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchFilters, setSearchFilters] = useState<SearchFiltersType>({});
  const { user, isAuthenticated } = useAuth();

  // Main podcasts query
  const { data: podcasts = [], isLoading } = useQuery<Podcast[]>({
    queryKey: ["/api/podcasts", searchFilters],
    enabled: activeTab === "discover",
  });

  // User favorites query
  const { data: userFavorites = [] } = useQuery<UserFavorite[]>({
    queryKey: ["/api/user/favorites"],
    enabled: isAuthenticated && activeTab === "favorites",
  });

  // Favorite podcast IDs for quick lookup
  const favoriteIds = new Set(userFavorites.map(fav => fav.podcastId));

  // Get favorite podcasts with details
  const { data: favoritePodcasts = [] } = useQuery<Podcast[]>({
    queryKey: ["/api/podcasts", {}],
    select: (data) => data.filter(podcast => favoriteIds.has(podcast.id)),
    enabled: isAuthenticated && activeTab === "favorites" && userFavorites.length > 0,
  });

  const handleFilterChange = (filters: SearchFiltersType) => {
    setSearchFilters(filters);
  };

  const handleTabChange = (tab: "discover" | "favorites" | "notes" | "import") => {
    // Redirect to login if trying to access personal features while unauthenticated
    if (!isAuthenticated && tab !== "discover") {
      window.location.href = "/api/login";
      return;
    }
    setActiveTab(tab);
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getUserDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) {
      return user.firstName;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="wine-gradient text-white relative overflow-hidden">
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h1 className="text-4xl md:text-6xl font-bold mb-4 text-shadow">
                Wine Podcast Directory
              </h1>
              <p className="text-xl md:text-2xl opacity-90">
                Discover premium wine podcasts from around the world
              </p>
            </div>
            
            {/* Navigation - User Menu or Login Button */}
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="text-white hover:bg-white/10 p-2" data-testid="button-user-menu">
                      <Avatar className="w-8 h-8 mr-2">
                        <AvatarImage src={user?.profileImageUrl} />
                        <AvatarFallback className="text-wine-dark">
                          {getUserDisplayName().charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden md:inline">{getUserDisplayName()}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem disabled>
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span data-testid="text-user-email">{user?.email}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => window.location.href = "/api/login"}
                  data-testid="button-login"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="absolute -bottom-1 left-0 right-0 h-8 bg-gradient-to-r from-rose-900/20 to-amber-900/20 transform skew-y-1"></div>
      </header>

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
            {isAuthenticated && (
              <>
                <button 
                  className={`flex items-center gap-2 px-4 py-4 border-b-2 font-medium transition-colors ${
                    activeTab === "favorites" 
                      ? "border-primary text-primary" 
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => handleTabChange("favorites")}
                  data-testid="tab-favorites"
                >
                  <Heart className="w-4 h-4" />
                  <span>Favorites ({userFavorites.length})</span>
                </button>
                <button 
                  className={`flex items-center gap-2 px-4 py-4 border-b-2 font-medium transition-colors ${
                    activeTab === "notes" 
                      ? "border-primary text-primary" 
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => handleTabChange("notes")}
                  data-testid="tab-notes"
                >
                  <FileText className="w-4 h-4" />
                  <span>Notes</span>
                </button>
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
              </>
            )}
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

        {/* Favorites Tab */}
        {activeTab === "favorites" && (
          <>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Your Favorites ({userFavorites.length})</h2>
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

              {favoritePodcasts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Heart className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
                  <p className="text-muted-foreground">Start exploring podcasts and add them to your favorites!</p>
                </div>
              ) : (
                <div className={`grid gap-6 ${
                  viewMode === "grid" 
                    ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
                    : "grid-cols-1"
                }`}>
                  {favoritePodcasts.map((podcast) => (
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

        {/* Notes Tab */}
        {activeTab === "notes" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Your Notes</h2>
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Notes feature coming soon</h3>
              <p className="text-muted-foreground">Add personal notes to your favorite podcasts.</p>
            </div>
          </div>
        )}

        {/* Import Tab */}
        {activeTab === "import" && <CSVImport />}
      </main>

      {/* Podcast detail modal removed per user requirements */}
    </div>
  );
}
