import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, jsonb, timestamp, index } from "drizzle-orm/pg-core";
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
  imageUrl: text("image_url"), // Logo/image URL for the podcast
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

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (traditional auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique().notNull(),
  password: varchar("password").notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User favorites table
export const userFavorites = pgTable("user_favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  podcastId: varchar("podcast_id").notNull().references(() => podcasts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// User notes table
export const userNotes = pgTable("user_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  podcastId: varchar("podcast_id").notNull().references(() => podcasts.id, { onDelete: "cascade" }),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type UserFavorite = typeof userFavorites.$inferSelect;
export type InsertUserFavorite = typeof userFavorites.$inferInsert;
export type UserNote = typeof userNotes.$inferSelect;
export type InsertUserNote = typeof userNotes.$inferInsert;

export const insertUserNoteSchema = createInsertSchema(userNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Authentication schemas
export const registerUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isAdmin: true,
}).extend({
  confirmPassword: z.string(),
}).transform((data) => ({
  // Trim inputs server-side before validation
  username: data.username?.trim(),
  password: data.password,
  email: data.email?.trim(),
  firstName: data.firstName?.trim(),
  lastName: data.lastName?.trim(),
  confirmPassword: data.confirmPassword,
})).pipe(z.object({
  // Username minimum length ≥ 3 characters
  username: z.string().min(3, "Username must be at least 3 characters long"),
  // Password minimum length ≥ 8 characters with complexity requirements
  password: z.string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  // Email format validation
  email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  confirmPassword: z.string(),
})).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const loginUserSchema = z.object({
  username: z.string().min(1, "Username is required").transform(val => val.trim()),
  password: z.string().min(1, "Password is required"),
});

export type RegisterUser = z.infer<typeof registerUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
