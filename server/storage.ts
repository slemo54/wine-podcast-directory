import { type Podcast, type InsertPodcast, type SearchFilters } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Podcast management
  createPodcast(podcast: InsertPodcast): Promise<Podcast>;
  getAllPodcasts(): Promise<Podcast[]>;
  getPodcastById(id: string): Promise<Podcast | undefined>;
  searchPodcasts(filters: SearchFilters): Promise<Podcast[]>;
  bulkCreatePodcasts(podcasts: InsertPodcast[]): Promise<Podcast[]>;
  
  // Favorites functionality removed per user requirements
  
  // Statistics
  getStatistics(): Promise<{
    totalPodcasts: number;
    activePodcasts: number;
    countriesCount: number;
    languagesCount: number;
  }>;
}

export class MemStorage implements IStorage {
  private podcasts: Map<string, Podcast>;

  constructor() {
    this.podcasts = new Map();
  }

  async createPodcast(insertPodcast: InsertPodcast): Promise<Podcast> {
    const id = randomUUID();
    const podcast: Podcast = { 
      ...insertPodcast, 
      id,
      categories: insertPodcast.categories || [],
      description: insertPodcast.description || null,
      episodeLength: insertPodcast.episodeLength || null,
      episodes: insertPodcast.episodes || null,
      socialLinks: insertPodcast.socialLinks ? {
        spotify: insertPodcast.socialLinks.spotify as string | undefined,
        instagram: insertPodcast.socialLinks.instagram as string | undefined,
        youtube: insertPodcast.socialLinks.youtube as string | undefined,
        website: insertPodcast.socialLinks.website as string | undefined,
        apple: insertPodcast.socialLinks.apple as string | undefined,
        twitter: insertPodcast.socialLinks.twitter as string | undefined,
      } : null
    };
    this.podcasts.set(id, podcast);
    return podcast;
  }

  async getAllPodcasts(): Promise<Podcast[]> {
    return Array.from(this.podcasts.values());
  }

  async getPodcastById(id: string): Promise<Podcast | undefined> {
    return this.podcasts.get(id);
  }

  async searchPodcasts(filters: SearchFilters): Promise<Podcast[]> {
    let results = Array.from(this.podcasts.values());

    // Text search
    if (filters.query) {
      const query = filters.query.toLowerCase();
      results = results.filter(p => 
        p.title.toLowerCase().includes(query) ||
        p.host.toLowerCase().includes(query) ||
        p.country.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.categories.some(cat => cat.toLowerCase().includes(query))
      );
    }

    // Episode length filter
    if (filters.episodeLength) {
      results = results.filter(p => p.episodeLength === filters.episodeLength);
    }

    // Categories filter
    if (filters.categories && filters.categories.length > 0) {
      results = results.filter(p => 
        filters.categories!.some(cat => p.categories.includes(cat))
      );
    }

    // Status filter
    if (filters.status) {
      results = results.filter(p => p.status === filters.status);
    }

    // Country filter
    if (filters.country) {
      results = results.filter(p => p.country === filters.country);
    }

    // Sorting
    if (filters.sortBy) {
      results.sort((a, b) => {
        switch (filters.sortBy) {
          case "title":
            return a.title.localeCompare(b.title);
          case "title-desc":
            return b.title.localeCompare(a.title);
          case "year":
            return a.year - b.year;
          case "year-desc":
            return b.year - a.year;
          case "country":
            return a.country.localeCompare(b.country);
          default:
            return 0;
        }
      });
    }

    return results;
  }

  async bulkCreatePodcasts(insertPodcasts: InsertPodcast[]): Promise<Podcast[]> {
    const createdPodcasts: Podcast[] = [];
    
    for (const insertPodcast of insertPodcasts) {
      const podcast = await this.createPodcast(insertPodcast);
      createdPodcasts.push(podcast);
    }
    
    return createdPodcasts;
  }

  // Favorites functionality removed per user requirements

  async getStatistics(): Promise<{
    totalPodcasts: number;
    activePodcasts: number;
    countriesCount: number;
    languagesCount: number;
  }> {
    const allPodcasts = Array.from(this.podcasts.values());
    
    const countries = new Set(allPodcasts.map(p => p.country));
    const languages = new Set();
    
    allPodcasts.forEach(p => {
      p.language.split(',').forEach(lang => languages.add(lang.trim()));
    });

    return {
      totalPodcasts: allPodcasts.length,
      activePodcasts: allPodcasts.filter(p => p.status === 'Active').length,
      countriesCount: countries.size,
      languagesCount: languages.size,
    };
  }
}

export const storage = new MemStorage();
