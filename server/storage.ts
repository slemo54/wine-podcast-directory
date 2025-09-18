import { 
  type Podcast, 
  type InsertPodcast, 
  type SearchFilters, 
  type User,
  type UpsertUser,
  type UserFavorite,
  type InsertUserFavorite,
  type UserNote,
  type InsertUserNote,
  podcasts,
  users,
  userFavorites,
  userNotes
} from "@shared/schema";
import { db } from "./db";
import { eq, ilike, or, and, inArray, desc, asc, sql } from "drizzle-orm";

export interface IStorage {
  // Podcast management
  createPodcast(podcast: InsertPodcast): Promise<Podcast>;
  getAllPodcasts(): Promise<Podcast[]>;
  getPodcastById(id: string): Promise<Podcast | undefined>;
  searchPodcasts(filters: SearchFilters): Promise<Podcast[]>;
  bulkCreatePodcasts(podcasts: InsertPodcast[]): Promise<Podcast[]>;
  
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // User favorites
  getUserFavorites(userId: string): Promise<UserFavorite[]>;
  addUserFavorite(favorite: InsertUserFavorite): Promise<UserFavorite>;
  removeUserFavorite(userId: string, podcastId: string): Promise<void>;
  
  // User notes
  getUserNotes(userId: string): Promise<UserNote[]>;
  getUserNoteForPodcast(userId: string, podcastId: string): Promise<UserNote | undefined>;
  createUserNote(note: InsertUserNote): Promise<UserNote>;
  updateUserNote(id: string, note: string): Promise<UserNote>;
  deleteUserNote(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createPodcast(insertPodcast: InsertPodcast): Promise<Podcast> {
    const [podcast] = await db
      .insert(podcasts)
      .values(insertPodcast as any)
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
      .values(insertPodcasts as any)
      .returning();
  }

  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // User favorites
  async getUserFavorites(userId: string): Promise<UserFavorite[]> {
    return await db.select().from(userFavorites).where(eq(userFavorites.userId, userId));
  }

  async addUserFavorite(favorite: InsertUserFavorite): Promise<UserFavorite> {
    const [userFavorite] = await db
      .insert(userFavorites)
      .values(favorite)
      .returning();
    return userFavorite;
  }

  async removeUserFavorite(userId: string, podcastId: string): Promise<void> {
    await db
      .delete(userFavorites)
      .where(
        and(
          eq(userFavorites.userId, userId),
          eq(userFavorites.podcastId, podcastId)
        )
      );
  }

  // User notes
  async getUserNotes(userId: string): Promise<UserNote[]> {
    return await db.select().from(userNotes).where(eq(userNotes.userId, userId));
  }

  async getUserNoteForPodcast(userId: string, podcastId: string): Promise<UserNote | undefined> {
    const [note] = await db
      .select()
      .from(userNotes)
      .where(
        and(
          eq(userNotes.userId, userId),
          eq(userNotes.podcastId, podcastId)
        )
      );
    return note;
  }

  async createUserNote(noteData: InsertUserNote): Promise<UserNote> {
    const [note] = await db
      .insert(userNotes)
      .values(noteData)
      .returning();
    return note;
  }

  async updateUserNote(id: string, noteText: string): Promise<UserNote> {
    const [note] = await db
      .update(userNotes)
      .set({
        note: noteText,
        updatedAt: new Date(),
      })
      .where(eq(userNotes.id, id))
      .returning();
    return note;
  }

  async deleteUserNote(id: string): Promise<void> {
    await db.delete(userNotes).where(eq(userNotes.id, id));
  }
}

export const storage = new DatabaseStorage();
