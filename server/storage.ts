import { type Podcast, type InsertPodcast, type SearchFilters, podcasts } from "@shared/schema";
import { db } from "./db";
import { eq, ilike, or, and, inArray, desc, asc, sql } from "drizzle-orm";

export interface IStorage {
  // Podcast management
  createPodcast(podcast: InsertPodcast): Promise<Podcast>;
  getAllPodcasts(): Promise<Podcast[]>;
  getPodcastById(id: string): Promise<Podcast | undefined>;
  searchPodcasts(filters: SearchFilters): Promise<Podcast[]>;
  bulkCreatePodcasts(podcasts: InsertPodcast[]): Promise<Podcast[]>;
  
  // Favorites functionality removed per user requirements
  
  // Statistics removed per user request
}

export class DatabaseStorage implements IStorage {
  async createPodcast(insertPodcast: InsertPodcast): Promise<Podcast> {
    const [podcast] = await db
      .insert(podcasts)
      .values(insertPodcast)
      .returning();
    return podcast;
  }

  async getAllPodcasts(): Promise<Podcast[]> {
    return await db.select().from(podcasts);
  }

  async getPodcastById(id: string): Promise<Podcast | undefined> {
    const [podcast] = await db.select().from(podcasts).where(eq(podcasts.id, id));
    return podcast || undefined;
  }

  async searchPodcasts(filters: SearchFilters): Promise<Podcast[]> {
    const allPodcasts = await db.select().from(podcasts);
    let results = allPodcasts;

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
    if (insertPodcasts.length === 0) {
      return [];
    }
    
    return await db
      .insert(podcasts)
      .values(insertPodcasts)
      .returning();
  }

  // Favorites functionality removed per user requirements

  // Statistics removed per user request
}

export const storage = new DatabaseStorage();
