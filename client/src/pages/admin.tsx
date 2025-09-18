import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { SearchFilters } from "@/components/search-filters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, Plus, Settings, ExternalLink, Globe, Music, Instagram, Youtube } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPodcastSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Podcast, SearchFilters as SearchFiltersType, InsertPodcast } from "@shared/schema";
import { z } from "zod";

// Form schema for editing podcasts
const editPodcastFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  host: z.string().min(1, "Host is required"),
  country: z.string().min(1, "Country is required"),
  language: z.string().min(1, "Language is required"),
  year: z.coerce.number().min(1900).max(2100),
  status: z.string().min(1, "Status is required"),
  categories: z.string().transform((val) => val ? val.split(',').map(s => s.trim()).filter(Boolean) : []),
  episodeLength: z.string().optional(),
  episodes: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  socialLinks: z.object({
    spotify: z.string().optional(),
    instagram: z.string().optional(),
    youtube: z.string().optional(),
    website: z.string().optional(),
    apple: z.string().optional(),
    twitter: z.string().optional(),
  }),
});

type EditPodcastFormData = z.infer<typeof editPodcastFormSchema>;

export default function Admin() {
  const [searchFilters, setSearchFilters] = useState<SearchFiltersType>({});
  const [editingPodcast, setEditingPodcast] = useState<Podcast | null>(null);
  const [deletingPodcast, setDeletingPodcast] = useState<Podcast | null>(null);
  const { user, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Redirect if not authenticated (fallback, should be handled by ProtectedRoute)
  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = "/auth";
    }
  }, [isAuthenticated]);

  // Podcasts query with search filters
  const { data: podcasts = [], isLoading, error } = useQuery<Podcast[]>({
    queryKey: ["/api/podcasts", searchFilters],
    enabled: isAuthenticated,
  });

  // Edit form setup
  const editForm = useForm({
    resolver: zodResolver(editPodcastFormSchema),
    defaultValues: {
      title: "",
      host: "",
      country: "",
      language: "",
      year: new Date().getFullYear(),
      status: "Active",
      categories: "",
      episodeLength: "",
      episodes: "",
      description: "",
      imageUrl: "",
      socialLinks: {
        spotify: "",
        instagram: "",
        youtube: "",
        website: "",
        apple: "",
        twitter: "",
      },
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertPodcast }) => {
      return apiRequest("PATCH", `/api/podcasts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/podcasts"] });
      setEditingPodcast(null);
      editForm.reset();
      toast({
        title: "Success",
        description: "Podcast updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update podcast",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/podcasts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/podcasts"] });
      setDeletingPodcast(null);
      toast({
        title: "Success",
        description: "Podcast deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete podcast",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (podcast: Podcast) => {
    setEditingPodcast(podcast);
    editForm.reset({
      title: podcast.title,
      host: podcast.host,
      country: podcast.country,
      language: podcast.language,
      year: podcast.year,
      status: podcast.status,
      categories: Array.isArray(podcast.categories) ? podcast.categories.join(', ') : "",
      episodeLength: podcast.episodeLength || "",
      episodes: podcast.episodes || "",
      description: podcast.description || "",
      imageUrl: podcast.imageUrl || "",
      socialLinks: {
        spotify: podcast.socialLinks?.spotify || "",
        instagram: podcast.socialLinks?.instagram || "",
        youtube: podcast.socialLinks?.youtube || "",
        website: podcast.socialLinks?.website || "",
        apple: podcast.socialLinks?.apple || "",
        twitter: podcast.socialLinks?.twitter || "",
      },
    });
  };

  const handleDelete = (podcast: Podcast) => {
    setDeletingPodcast(podcast);
  };

  const onSubmitEdit = async (data: any) => {
    if (!editingPodcast) return;

    const submitData: InsertPodcast = {
      ...data,
      categories: data.categories,
      socialLinks: data.socialLinks,
    };

    updateMutation.mutate({
      id: editingPodcast.id,
      data: submitData,
    });
  };

  const onConfirmDelete = () => {
    if (!deletingPodcast) return;
    deleteMutation.mutate(deletingPodcast.id);
  };

  const handleFilterChange = useCallback((filters: SearchFiltersType) => {
    setSearchFilters(filters);
  }, []);

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'spotify':
        return <Music className="w-4 h-4" />;
      case 'instagram':
        return <Instagram className="w-4 h-4" />;
      case 'youtube':
        return <Youtube className="w-4 h-4" />;
      case 'website':
        return <Globe className="w-4 h-4" />;
      default:
        return <ExternalLink className="w-4 h-4" />;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground mb-4">Please sign in to access the admin panel.</p>
          <Button onClick={() => window.location.href = "/auth"} data-testid="button-login">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error Loading Podcasts</h1>
          <p className="text-muted-foreground">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">Podcast Admin</h1>
            </div>
            <div className="text-sm text-muted-foreground">
              {podcasts.length} podcast{podcasts.length !== 1 ? 's' : ''} total
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="mb-8">
          <SearchFilters onFiltersChange={handleFilterChange} resultsCount={podcasts.length} />
        </div>

        {/* Podcasts List */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-3 bg-muted rounded w-full mb-2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : podcasts.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">No podcasts found</h3>
            <p className="text-muted-foreground">Try adjusting your search filters.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {podcasts.map((podcast) => (
              <Card key={podcast.id} className="group hover:shadow-md transition-shadow" data-testid={`card-podcast-${podcast.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base leading-tight truncate" data-testid={`text-title-${podcast.id}`}>
                        {podcast.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1 truncate" data-testid={`text-host-${podcast.id}`}>
                        by {podcast.host}
                      </p>
                    </div>
                    {podcast.imageUrl && (
                      <Avatar className="w-12 h-12 rounded-md">
                        <AvatarImage src={podcast.imageUrl} alt={podcast.title} />
                        <AvatarFallback className="rounded-md text-xs">
                          {podcast.title.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">{podcast.country}</Badge>
                      <Badge variant="outline" className="text-xs">{podcast.status}</Badge>
                      {podcast.episodeLength && (
                        <Badge variant="outline" className="text-xs">{podcast.episodeLength}</Badge>
                      )}
                    </div>
                    
                    {podcast.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {podcast.categories.slice(0, 3).map((category) => (
                          <Badge key={category} variant="default" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                        {podcast.categories.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{podcast.categories.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {podcast.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2" data-testid={`text-description-${podcast.id}`}>
                        {podcast.description}
                      </p>
                    )}

                    {/* Social Links */}
                    {podcast.socialLinks && Object.entries(podcast.socialLinks).some(([_, url]) => url) && (
                      <div className="flex gap-1 flex-wrap">
                        {Object.entries(podcast.socialLinks).map(([platform, url]) => 
                          url ? (
                            <a
                              key={platform}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded hover:bg-muted transition-colors"
                              data-testid={`link-${platform}-${podcast.id}`}
                            >
                              {getSocialIcon(platform)}
                            </a>
                          ) : null
                        )}
                      </div>
                    )}

                    {/* Admin Actions */}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(podcast)}
                        data-testid={`button-edit-${podcast.id}`}
                        className="flex-1"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(podcast)}
                        data-testid={`button-delete-${podcast.id}`}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Edit Dialog */}
      <Dialog open={!!editingPodcast} onOpenChange={(open) => !open && setEditingPodcast(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto" data-testid="dialog-edit-podcast">
          <DialogHeader>
            <DialogTitle>Edit Podcast</DialogTitle>
            <DialogDescription>
              Update the podcast information below.
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-4">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="host"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Host *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-host" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={editForm.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-country" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Language *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-language" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-year"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="On Hiatus">On Hiatus</SelectItem>
                          <SelectItem value="Ended">Ended</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="episodeLength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Episode Length</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-episode-length">
                            <SelectValue placeholder="Select length" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Unspecified">None</SelectItem>
                          <SelectItem value="Under 10min">Under 10min</SelectItem>
                          <SelectItem value="10-20min">10-20min</SelectItem>
                          <SelectItem value="20-40min">20-40min</SelectItem>
                          <SelectItem value="40min+">40min+</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="categories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categories</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Wine, Food, Culture" data-testid="input-categories" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="episodes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Episodes</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="50+ episodes" data-testid="input-episodes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} data-testid="textarea-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://..." data-testid="input-image-url" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Social Links */}
              <div>
                <h4 className="font-medium mb-3">Social Links</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="socialLinks.spotify"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Spotify</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://spotify.com/..." data-testid="input-spotify" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="socialLinks.instagram"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instagram</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://instagram.com/..." data-testid="input-instagram" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="socialLinks.youtube"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>YouTube</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://youtube.com/..." data-testid="input-youtube" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="socialLinks.website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://..." data-testid="input-website" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="socialLinks.apple"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Apple Podcasts</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://podcasts.apple.com/..." data-testid="input-apple" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="socialLinks.twitter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Twitter</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://twitter.com/..." data-testid="input-twitter" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingPodcast(null)} data-testid="button-cancel-edit">
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-podcast">
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingPodcast} onOpenChange={(open) => !open && setDeletingPodcast(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Podcast</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingPodcast?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}