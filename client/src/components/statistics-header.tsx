import { useQuery } from "@tanstack/react-query";
import { Wine } from "lucide-react";

interface Statistics {
  totalPodcasts: number;
  activePodcasts: number;
  countriesCount: number;
  languagesCount: number;
}

export function StatisticsHeader() {
  const { data: stats } = useQuery<Statistics>({
    queryKey: ["/api/statistics"],
  });

  return (
    <header className="wine-gradient text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-10"></div>
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          {/* Branding Section */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Wine className="text-3xl" aria-hidden="true" />
              <h1 className="font-serif text-3xl lg:text-4xl font-bold">Wine Podcast Directory</h1>
            </div>
            <p className="text-lg opacity-90">Discover premium wine podcasts from around the world</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="glass-morphism px-3 py-1 rounded-full text-sm">2025 Collection</span>
              <span className="glass-morphism px-3 py-1 rounded-full text-sm">Global Network</span>
            </div>
          </div>

          {/* Statistics Dashboard */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full lg:w-auto">
            <div className="glass-morphism p-4 rounded-lg text-center">
              <div className="text-2xl font-bold" data-testid="stat-total">
                {stats?.totalPodcasts ?? 0}
              </div>
              <div className="text-sm opacity-80">Total Podcasts</div>
            </div>
            <div className="glass-morphism p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-300" data-testid="stat-active">
                {stats?.activePodcasts ?? 0}
              </div>
              <div className="text-sm opacity-80">Active</div>
            </div>
            <div className="glass-morphism p-4 rounded-lg text-center">
              <div className="text-2xl font-bold" data-testid="stat-countries">
                {stats?.countriesCount ?? 0}
              </div>
              <div className="text-sm opacity-80">Countries</div>
            </div>
            <div className="glass-morphism p-4 rounded-lg text-center">
              <div className="text-2xl font-bold" data-testid="stat-languages">
                {stats?.languagesCount ?? 0}
              </div>
              <div className="text-sm opacity-80">Languages</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
