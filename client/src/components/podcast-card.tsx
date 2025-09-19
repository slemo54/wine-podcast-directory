import { useState } from "react";
import { MapPin, Calendar, Clock, Heart, Image, ExternalLink, Youtube } from "lucide-react";
import { SiSpotify, SiInstagram, SiApple, SiX } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import type { Podcast, UserFavorite } from "@shared/schema";

interface PodcastCardProps {
  podcast: Podcast;
  viewMode?: "grid" | "list";
  userFavorites: UserFavorite[];
  isAuthenticated: boolean;
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
  spotify: SiSpotify,
  instagram: SiInstagram, 
  youtube: Youtube,
  website: ExternalLink,
  apple: SiApple,
  twitter: SiX,
};

const SOCIAL_LABELS = {
  spotify: "Listen on Spotify",
  instagram: "Follow on Instagram",
  youtube: "Watch on YouTube", 
  website: "Visit Website",
  apple: "Listen on Apple Podcasts",
  twitter: "Follow on Twitter",
};

const SOCIAL_COLOR_MAP = {
  spotify: "bg-green-600 hover:bg-green-700 shadow-green-600/20",
  instagram: "bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-purple-600/20",
  youtube: "bg-red-600 hover:bg-red-700 shadow-red-600/20",
  website: "bg-gray-600 hover:bg-gray-700 shadow-gray-600/20",
  apple: "bg-gray-900 hover:bg-black shadow-gray-900/20",
  twitter: "bg-blue-500 hover:bg-blue-600 shadow-blue-500/20",
};

export function PodcastCard({ podcast, viewMode = "grid", userFavorites, isAuthenticated }: PodcastCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if this podcast is favorited using the passed-in data
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

  // Helper function to convert Instagram handles to full URLs
  const getSocialUrl = (platform: string, url: string) => {
    if (platform === 'instagram' && url.startsWith('@')) {
      // Convert @username to https://www.instagram.com/username/
      const username = url.slice(1); // Remove @
      return `https://www.instagram.com/${username}/`;
    }
    return url;
  };


  // Get top 3 social links in priority order
  const prioritizedSocials = ["spotify", "instagram", "youtube", "website", "apple", "twitter"];
  const availableSocials = prioritizedSocials
    .filter(platform => podcast.socialLinks?.[platform as keyof typeof podcast.socialLinks])
    .slice(0, 3);

  if (viewMode === "list") {
    return (
      <TooltipProvider>
        <div className="podcast-card group bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-wine-500/10 transition-all duration-500 hover:-translate-y-1 hover:border-wine-300/50">
          <div className="p-6 flex gap-6">
            {/* Left side - Enhanced Podcast image */}
            <div className="relative flex-shrink-0">
              <PodcastImage
                src={podcast.imageUrl ?? undefined}
                alt={`${podcast.title} podcast logo`}
                className="w-28 h-28 rounded-2xl group-hover:scale-105 transition-transform duration-700"
                testId={`img-podcast-list-${podcast.id}`}
              />
              
              
              {/* Favorite Button - Top Right Corner */}
              <div className="absolute -top-2 -right-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleFavoriteToggle}
                      disabled={isAuthenticated && (addFavoriteMutation.isPending || removeFavoriteMutation.isPending)}
                      data-testid={`button-favorite-${podcast.id}`}
                      className="w-8 h-8 bg-wine-100 hover:bg-wine-200 dark:bg-wine-900 dark:hover:bg-wine-800 border border-wine-200 dark:border-wine-700 rounded-full transition-all duration-300 hover:scale-110"
                    >
                      <Heart 
                        className={`w-3.5 h-3.5 transition-all duration-300 ${isAuthenticated && isFavorited ? "fill-red-500 text-red-500 scale-110" : "text-wine-600 dark:text-wine-300 group-hover:text-red-400"}`}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isAuthenticated ? (isFavorited ? "Remove from favorites" : "Add to favorites") : "Sign in to favorite"}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 min-w-0">
              {/* Title and Host */}
              <div className="mb-4">
                <h3 className="font-bold text-xl leading-tight line-clamp-2 text-foreground group-hover:text-wine-700 transition-colors duration-300 mb-2">
                  {podcast.title}
                </h3>
                <p className="text-base text-muted-foreground font-medium">
                  Hosted by {podcast.host}
                </p>
              </div>

              {/* Metadata in organized layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-wine-500 flex-shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-foreground truncate">{podcast.country}</span>
                    <span className="text-xs text-muted-foreground truncate">{podcast.language}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-wine-500 flex-shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-foreground">{podcast.year}</span>
                    <span className="text-xs text-muted-foreground truncate">{podcast.episodes}</span>
                  </div>
                </div>
                
                {podcast.episodeLength && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-wine-500 flex-shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-foreground truncate">{podcast.episodeLength}</span>
                      <span className="text-xs text-muted-foreground">Episode length</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Categories */}
              <div className="flex flex-wrap gap-2 mb-4">
                {podcast.categories.slice(0, 4).map(category => (
                  <Badge 
                    key={category} 
                    variant="secondary" 
                    className="bg-wine-50 text-wine-700 border-wine-200 hover:bg-wine-100 transition-colors duration-200 text-xs px-3 py-1"
                  >
                    {category}
                  </Badge>
                ))}
                {podcast.categories.length > 4 && (
                  <Badge variant="outline" className="text-xs px-3 py-1 text-muted-foreground">
                    +{podcast.categories.length - 4} more
                  </Badge>
                )}
              </div>

              {/* Description */}
              {podcast.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-4">
                  {podcast.description}
                </p>
              )}

              {/* Social Links Footer */}
              <div className="flex items-center justify-end pt-4 border-t border-border/50">
                <div className="flex gap-2">
                  {availableSocials.map(platform => {
                    const IconComponent = SOCIAL_ICON_MAP[platform as keyof typeof SOCIAL_ICON_MAP];
                    return (
                      <Tooltip key={platform}>
                        <TooltipTrigger asChild>
                          <a
                            href={getSocialUrl(platform, podcast.socialLinks?.[platform as keyof typeof podcast.socialLinks] || '')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-110 hover:shadow-lg ${
                              SOCIAL_COLOR_MAP[platform as keyof typeof SOCIAL_COLOR_MAP]
                            }`}
                            data-testid={`link-social-${platform}-${podcast.id}`}
                          >
                            <IconComponent className="w-4 h-4" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{SOCIAL_LABELS[platform as keyof typeof SOCIAL_LABELS]}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // Grid view (default)
  return (
    <TooltipProvider>
      <div className="podcast-card group bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-wine-500/10 transition-all duration-500 hover:-translate-y-1 hover:border-wine-300/50">
        {/* Podcast Image with Enhanced Wine Background */}
        <div className="relative h-48 overflow-hidden">
          <PodcastImage
            src={podcast.imageUrl ?? undefined}
            alt={`${podcast.title} podcast logo`}
            className="h-full group-hover:scale-105 transition-transform duration-700"
            testId={`img-podcast-grid-${podcast.id}`}
          />
          
          
          {/* Favorite Button - Top Right */}
          <div className="absolute top-3 right-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFavoriteToggle}
                  disabled={isAuthenticated && (addFavoriteMutation.isPending || removeFavoriteMutation.isPending)}
                  data-testid={`button-favorite-${podcast.id}`}
                  className="w-9 h-9 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white border-0 rounded-full transition-all duration-300 hover:scale-110"
                >
                  <Heart 
                    className={`w-4 h-4 transition-all duration-300 ${isAuthenticated && isFavorited ? "fill-red-500 text-red-500 scale-110" : "text-white group-hover:text-red-200"}`}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isAuthenticated ? (isFavorited ? "Remove from favorites" : "Add to favorites") : "Sign in to favorite"}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          {/* Gradient Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60"></div>
        </div>

        {/* Card Content */}
        <div className="p-6 space-y-4">
          {/* Title and Host */}
          <div className="space-y-2">
            <h3 className="font-bold text-xl leading-tight line-clamp-2 text-foreground group-hover:text-wine-700 transition-colors duration-300">
              {podcast.title}
            </h3>
            <p className="text-base text-muted-foreground font-medium">
              Hosted by {podcast.host}
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 text-wine-500" />
              <div className="flex flex-col">
                <span className="font-medium text-foreground">{podcast.country}</span>
                <span className="text-xs">{podcast.language}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 text-wine-500" />
              <div className="flex flex-col">
                <span className="font-medium text-foreground">{podcast.year}</span>
                <span className="text-xs">{podcast.episodes}</span>
              </div>
            </div>
          </div>

          {podcast.episodeLength && (
            <div className="flex items-center gap-2 text-sm bg-muted/30 rounded-lg px-3 py-2">
              <Clock className="w-4 h-4 text-wine-500" />
              <span className="font-medium text-foreground">{podcast.episodeLength}</span>
            </div>
          )}

          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            {podcast.categories.slice(0, 2).map(category => (
              <Badge 
                key={category} 
                variant="secondary" 
                className="bg-wine-50 text-wine-700 border-wine-200 hover:bg-wine-100 transition-colors duration-200 text-xs px-3 py-1"
              >
                {category}
              </Badge>
            ))}
            {podcast.categories.length > 2 && (
              <Badge variant="outline" className="text-xs px-3 py-1 text-muted-foreground">
                +{podcast.categories.length - 2} more
              </Badge>
            )}
          </div>

          {/* Description */}
          {podcast.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {podcast.description}
            </p>
          )}

          {/* Social Links */}
          <div className="flex items-center justify-center gap-2 pt-2 border-t border-border/50">
            {availableSocials.map(platform => {
              const IconComponent = SOCIAL_ICON_MAP[platform as keyof typeof SOCIAL_ICON_MAP];
              return (
                <Tooltip key={platform}>
                  <TooltipTrigger asChild>
                    <a
                      href={getSocialUrl(platform, podcast.socialLinks?.[platform as keyof typeof podcast.socialLinks] || '')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-110 hover:shadow-lg ${
                        SOCIAL_COLOR_MAP[platform as keyof typeof SOCIAL_COLOR_MAP]
                      } group-hover:animate-pulse`}
                      data-testid={`link-social-${platform}-${podcast.id}`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{SOCIAL_LABELS[platform as keyof typeof SOCIAL_LABELS]}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
