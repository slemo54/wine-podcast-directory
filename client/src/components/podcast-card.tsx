import { useState } from "react";
import { MapPin, Calendar, Clock, Heart, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import type { Podcast, UserFavorite } from "@shared/schema";

interface PodcastCardProps {
  podcast: Podcast;
  viewMode?: "grid" | "list";
}

// Image component with fallback and lazy loading
interface PodcastImageProps {
  src?: string;
  alt: string;
  className: string;
  testId: string;
}

function PodcastImage({ src, alt, className, testId }: PodcastImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  // If no src or error occurred, show wine gradient fallback
  if (!src || hasError) {
    return (
      <div className={`${className} wine-gradient relative flex items-center justify-center`}>
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        <Image className="w-8 h-8 text-white/60" data-testid={`${testId}-fallback`} />
      </div>
    );
  }

  return (
    <div className={`${className} relative overflow-hidden bg-wine-gradient`}>
      {isLoading && (
        <div className="absolute inset-0 wine-gradient flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-20"></div>
          <Image className="w-8 h-8 text-white/60" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={handleError}
        onLoad={handleLoad}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        data-testid={testId}
      />
      <div className="absolute inset-0 bg-black bg-opacity-10"></div>
    </div>
  );
}

const SOCIAL_ICON_MAP = {
  spotify: "fab fa-spotify",
  instagram: "fab fa-instagram", 
  youtube: "fab fa-youtube",
  website: "fas fa-external-link-alt",
  apple: "fab fa-apple",
  twitter: "fab fa-twitter",
};

const SOCIAL_COLOR_MAP = {
  spotify: "bg-green-600 hover:bg-green-700",
  instagram: "bg-gradient-to-br from-purple-600 to-pink-600 hover:opacity-80",
  youtube: "bg-red-600 hover:bg-red-700",
  website: "bg-gray-600 hover:bg-gray-700",
  apple: "bg-gray-900 hover:bg-black",
  twitter: "bg-blue-500 hover:bg-blue-600",
};

export function PodcastCard({ podcast, viewMode = "grid" }: PodcastCardProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user favorites to check if this podcast is favorited
  const { data: userFavorites = [] } = useQuery<UserFavorite[]>({
    queryKey: ["/api/user/favorites"],
    enabled: isAuthenticated,
  });

  const isFavorited = userFavorites.some(fav => fav.podcastId === podcast.id);

  // Add favorite mutation
  const addFavoriteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/user/favorites", { podcastId: podcast.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/favorites"] });
      toast({
        title: "Added to favorites",
        description: `${podcast.title} has been added to your favorites.`,
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to add to favorites. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Remove favorite mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/user/favorites/${podcast.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/favorites"] });
      toast({
        title: "Removed from favorites",
        description: `${podcast.title} has been removed from your favorites.`,
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to remove from favorites. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFavoriteToggle = () => {
    // Redirect to login if user is not authenticated
    if (!isAuthenticated) {
      window.location.href = "/api/login";
      return;
    }
    
    if (isFavorited) {
      removeFavoriteMutation.mutate();
    } else {
      addFavoriteMutation.mutate();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-400";
      case "on hiatus":
        return "bg-yellow-400";
      case "ended":
        return "bg-red-400";
      default:
        return "bg-gray-400";
    }
  };

  // Get top 3 social links in priority order
  const prioritizedSocials = ["spotify", "instagram", "youtube", "website", "apple", "twitter"];
  const availableSocials = prioritizedSocials
    .filter(platform => podcast.socialLinks?.[platform as keyof typeof podcast.socialLinks])
    .slice(0, 3);

  if (viewMode === "list") {
    return (
      <div className="podcast-card bg-card rounded-xl border border-border p-6 flex gap-6">
        {/* Left side - Podcast image */}
        <div className="relative">
          <PodcastImage
            src={podcast.imageUrl ?? undefined}
            alt={`${podcast.title} podcast logo`}
            className="w-24 h-24 rounded-lg flex-shrink-0"
            testId={`img-podcast-list-${podcast.id}`}
          />
          <div className="absolute top-2 right-2">
            <div className={`w-2 h-2 ${getStatusColor(podcast.status)} rounded-full`}></div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold text-lg mb-1">{podcast.title}</h3>
              <p className="text-sm text-muted-foreground">{podcast.host}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFavoriteToggle}
              disabled={isAuthenticated && (addFavoriteMutation.isPending || removeFavoriteMutation.isPending)}
              data-testid={`button-favorite-${podcast.id}`}
              className="flex items-center gap-2"
            >
              <Heart 
                className={`w-4 h-4 ${isAuthenticated && isFavorited ? "fill-red-500 text-red-500" : "text-muted-foreground"}`}
              />
              <span className="hidden md:inline">
                {isAuthenticated ? (isFavorited ? "Remove from favorites" : "Add to favorites") : "Sign in to favorite"}
              </span>
            </Button>
          </div>

          <div className="flex flex-wrap gap-4 text-sm mb-3">
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{podcast.country} • {podcast.language}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{podcast.year} • {podcast.episodes}</span>
            </div>
            {podcast.episodeLength && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{podcast.episodeLength}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1 mb-3">
            {podcast.categories.slice(0, 3).map(category => (
              <span key={category} className="px-2 py-1 bg-accent/20 text-accent-foreground rounded-md text-xs">
                {category}
              </span>
            ))}
          </div>

          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {availableSocials.map(platform => (
                <a
                  key={platform}
                  href={podcast.socialLinks?.[platform as keyof typeof podcast.socialLinks]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors ${
                    SOCIAL_COLOR_MAP[platform as keyof typeof SOCIAL_COLOR_MAP]
                  }`}
                  title={platform}
                  data-testid={`link-social-${platform}-${podcast.id}`}
                >
                  <i className={`${SOCIAL_ICON_MAP[platform as keyof typeof SOCIAL_ICON_MAP]} text-sm`}></i>
                </a>
              ))}
            </div>
            {/* View Details functionality removed per user requirements */}
          </div>
        </div>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div className="podcast-card bg-card rounded-xl border border-border overflow-hidden">
      {/* Podcast Image with Wine Background */}
      <div className="relative">
        <PodcastImage
          src={podcast.imageUrl ?? undefined}
          alt={`${podcast.title} podcast logo`}
          className="h-32"
          testId={`img-podcast-grid-${podcast.id}`}
        />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-2 text-white">
            <div className={`w-2 h-2 ${getStatusColor(podcast.status)} rounded-full`}></div>
            <span className="text-xs font-medium">{podcast.status}</span>
          </div>
        </div>
        <div className="absolute top-4 right-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFavoriteToggle}
            disabled={isAuthenticated && (addFavoriteMutation.isPending || removeFavoriteMutation.isPending)}
            data-testid={`button-favorite-${podcast.id}`}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white border-0"
          >
            <Heart 
              className={`w-4 h-4 ${isAuthenticated && isFavorited ? "fill-red-500 text-red-500" : "text-white"}`}
            />
          </Button>
        </div>
      </div>

      <div className="p-5">
        <div className="mb-3">
          <h3 className="font-semibold text-lg mb-1 line-clamp-2">{podcast.title}</h3>
          <p className="text-sm text-muted-foreground">{podcast.host}</p>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="text-muted-foreground w-4" />
            <span>{podcast.country}</span>
            <span className="text-muted-foreground">•</span>
            <span>{podcast.language}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="text-muted-foreground w-4" />
            <span>{podcast.year}</span>
            <span className="text-muted-foreground">•</span>
            <span>{podcast.episodes}</span>
          </div>
          {podcast.episodeLength && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="text-muted-foreground w-4" />
              <span>{podcast.episodeLength}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {podcast.categories.slice(0, 2).map(category => (
            <span key={category} className="px-2 py-1 bg-accent/20 text-accent-foreground rounded-md text-xs">
              {category}
            </span>
          ))}
        </div>

        {podcast.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {podcast.description}
          </p>
        )}

        {/* Social Links (Max 3) */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {availableSocials.map(platform => (
              <a
                key={platform}
                href={podcast.socialLinks?.[platform as keyof typeof podcast.socialLinks]}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors ${
                  SOCIAL_COLOR_MAP[platform as keyof typeof SOCIAL_COLOR_MAP]
                }`}
                title={platform}
                data-testid={`link-social-${platform}-${podcast.id}`}
              >
                <i className={`${SOCIAL_ICON_MAP[platform as keyof typeof SOCIAL_ICON_MAP]} text-sm`}></i>
              </a>
            ))}
          </div>
          {/* View Details functionality removed per user requirements */}
        </div>
      </div>
    </div>
  );
}
