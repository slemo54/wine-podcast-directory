import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const podcasts = pgTable("podcasts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  host: text("host").notNull(),
  country: text("country").notNull(),
  language: text("language").notNull(), // Can be comma-separated for multiple languages
  year: integer("year").notNull(),
  status: text("status").notNull(), // "Active", "On Hiatus", "Ended"
  categories: text("categories").array().notNull().default([]),
  episodeLength: text("episode_length"), // "Under 10min", "10-20min", "20-40min", "40min+"
  episodes: text("episodes"), // "200+ episodes", "45 episodes", etc.
  description: text("description"),
  socialLinks: jsonb("social_links").$type<{
    spotify?: string;
    instagram?: string;
    youtube?: string;
    website?: string;
    apple?: string;
    twitter?: string;
  }>().default({}),
});

// Favorites functionality removed per user requirements

export const insertPodcastSchema = createInsertSchema(podcasts).omit({
  id: true,
});

// Favorites functionality removed per user requirements

export type InsertPodcast = z.infer<typeof insertPodcastSchema>;
export type Podcast = typeof podcasts.$inferSelect;
// Favorites functionality removed per user requirements

// Search and filter schemas
export const searchFiltersSchema = z.object({
  query: z.string().optional(),
  episodeLength: z.string().optional(),
  categories: z.array(z.string()).optional(),
  status: z.string().optional(),
  country: z.string().optional(),
  sortBy: z.enum(["title", "title-desc", "year", "year-desc", "episodes", "episodes-desc", "country"]).optional(),
});

export type SearchFilters = z.infer<typeof searchFiltersSchema>;
