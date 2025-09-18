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
  
  // Statistics
  getStatistics(): Promise<{
    totalPodcasts: number;
    activePodcasts: number;
    countriesCount: number;
    languagesCount: number;
  }>;
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
    let query = db.select().from(podcasts);
    const conditions = [];

    // Text search
    if (filters.query) {
      const searchTerm = `%${filters.query}%`;
      conditions.push(
        or(
          ilike(podcasts.title, searchTerm),
          ilike(podcasts.host, searchTerm),
          ilike(podcasts.country, searchTerm),
          ilike(podcasts.description, searchTerm),
          sql`EXISTS (
            SELECT 1 FROM unnest(${podcasts.categories}) AS category 
            WHERE category ILIKE ${searchTerm}
          )`
        )
      );
    }

    // Episode length filter
    if (filters.episodeLength) {
      conditions.push(eq(podcasts.episodeLength, filters.episodeLength));
    }

    // Categories filter
    if (filters.categories && filters.categories.length > 0) {
      conditions.push(
        sql`${podcasts.categories} && ${filters.categories}`
      );
    }

    // Status filter
    if (filters.status) {
      conditions.push(eq(podcasts.status, filters.status));
    }

    // Country filter
    if (filters.country) {
      conditions.push(eq(podcasts.country, filters.country));
    }

    // Apply conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Sorting
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case "title":
          query = query.orderBy(asc(podcasts.title));
          break;
        case "title-desc":
          query = query.orderBy(desc(podcasts.title));
          break;
        case "year":
          query = query.orderBy(asc(podcasts.year));
          break;
        case "year-desc":
          query = query.orderBy(desc(podcasts.year));
          break;
        case "country":
          query = query.orderBy(asc(podcasts.country));
          break;
        default:
          break;
      }
    }

    return await query;
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

  async getStatistics(): Promise<{
    totalPodcasts: number;
    activePodcasts: number;
    countriesCount: number;
    languagesCount: number;
  }> {
    const [totalCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(podcasts);
    
    const [activeCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(podcasts)
      .where(eq(podcasts.status, 'Active'));
    
    const [countriesCount] = await db
      .select({ count: sql<number>`count(distinct country)` })
      .from(podcasts);
    
    const [languagesCount] = await db
      .select({ count: sql<number>`count(distinct unnest(string_to_array(language, ',')))` })
      .from(podcasts);

    return {
      totalPodcasts: totalCount.count,
      activePodcasts: activeCount.count,
      countriesCount: countriesCount.count,
      languagesCount: languagesCount.count,
    };
  }
}

export const storage = new DatabaseStorage();
