var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";
import cors from "cors";

// server/routes.ts
import { createServer } from "http";
import multer from "multer";
import csvParser from "csv-parser";
import { Readable } from "stream";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  insertPodcastSchema: () => insertPodcastSchema,
  insertUserNoteSchema: () => insertUserNoteSchema,
  loginUserSchema: () => loginUserSchema,
  podcasts: () => podcasts,
  registerUserSchema: () => registerUserSchema,
  searchFiltersSchema: () => searchFiltersSchema,
  sessions: () => sessions,
  userFavorites: () => userFavorites,
  userNotes: () => userNotes,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var podcasts = pgTable("podcasts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  host: text("host").notNull(),
  country: text("country").notNull(),
  language: text("language").notNull(),
  // Can be comma-separated for multiple languages
  year: integer("year").notNull(),
  status: text("status").notNull(),
  // "Active", "On Hiatus", "Ended"
  categories: text("categories").array().notNull().default([]),
  episodeLength: text("episode_length"),
  // "Under 10min", "10-20min", "20-40min", "40min+"
  episodes: text("episodes"),
  // "200+ episodes", "45 episodes", etc.
  description: text("description"),
  socialLinks: jsonb("social_links").$type().default({}),
  imageUrl: text("image_url")
  // Logo/image URL for the podcast
});
var insertPodcastSchema = createInsertSchema(podcasts).omit({
  id: true
});
var searchFiltersSchema = z.object({
  query: z.string().optional(),
  episodeLength: z.string().optional(),
  categories: z.array(z.string()).optional(),
  status: z.string().optional(),
  country: z.string().optional(),
  sortBy: z.enum(["title", "title-desc", "year", "year-desc", "episodes", "episodes-desc", "country"]).optional()
});
var sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull()
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique().notNull(),
  password: varchar("password").notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var userFavorites = pgTable("user_favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  podcastId: varchar("podcast_id").notNull().references(() => podcasts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow()
});
var userNotes = pgTable("user_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  podcastId: varchar("podcast_id").notNull().references(() => podcasts.id, { onDelete: "cascade" }),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertUserNoteSchema = createInsertSchema(userNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var registerUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isAdmin: true
}).extend({
  confirmPassword: z.string()
}).transform((data) => ({
  // Trim inputs server-side before validation
  username: data.username?.trim(),
  password: data.password,
  email: data.email?.trim(),
  firstName: data.firstName?.trim(),
  lastName: data.lastName?.trim(),
  confirmPassword: data.confirmPassword
})).pipe(z.object({
  // Username minimum length ≥ 3 characters
  username: z.string().min(3, "Username must be at least 3 characters long"),
  // Password minimum length ≥ 8 characters with complexity requirements
  password: z.string().min(8, "Password must be at least 8 characters long").regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  // Email format validation
  email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  confirmPassword: z.string()
})).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});
var loginUserSchema = z.object({
  username: z.string().min(1, "Username is required").transform((val) => val.trim()),
  password: z.string().min(1, "Password is required")
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, and } from "drizzle-orm";
function createDeduplicationKey(title, host) {
  const normalize = (str) => {
    return str.toLowerCase().trim().replace(/\s+/g, " ").replace(/[,.!?;:"'()\[\]{}]/g, "").replace(/^(the|a|an)\s+/i, "").trim();
  };
  return `${normalize(title)}|||${normalize(host)}`;
}
var DatabaseStorage = class {
  async createPodcast(insertPodcast) {
    const [podcast] = await db.insert(podcasts).values(insertPodcast).returning();
    return podcast;
  }
  async getAllPodcasts() {
    return await db.select().from(podcasts);
  }
  async getPodcastById(id) {
    const [podcast] = await db.select().from(podcasts).where(eq(podcasts.id, id));
    return podcast || void 0;
  }
  async searchPodcasts(filters) {
    const allPodcasts = await db.select().from(podcasts);
    let results = allPodcasts;
    if (filters.query) {
      const query = filters.query.toLowerCase();
      results = results.filter(
        (p) => p.title.toLowerCase().includes(query) || p.host.toLowerCase().includes(query) || p.country.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query) || p.categories.some((cat) => cat.toLowerCase().includes(query))
      );
    }
    if (filters.episodeLength) {
      results = results.filter((p) => p.episodeLength === filters.episodeLength);
    }
    if (filters.categories && filters.categories.length > 0) {
      results = results.filter(
        (p) => filters.categories.some((cat) => p.categories.includes(cat))
      );
    }
    if (filters.status) {
      results = results.filter((p) => p.status === filters.status);
    }
    if (filters.country) {
      results = results.filter((p) => p.country === filters.country);
    }
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
  async bulkCreatePodcasts(insertPodcasts) {
    if (insertPodcasts.length === 0) {
      return [];
    }
    return await db.insert(podcasts).values(insertPodcasts).returning();
  }
  async findPodcastsByTitleHost(titleHostPairs) {
    if (titleHostPairs.length === 0) {
      return [];
    }
    const existingPodcasts = await db.select().from(podcasts);
    const inputKeys = new Set(
      titleHostPairs.map((pair) => createDeduplicationKey(pair.title, pair.host))
    );
    const duplicates = existingPodcasts.filter((podcast) => {
      const existingKey = createDeduplicationKey(podcast.title, podcast.host);
      return inputKeys.has(existingKey);
    });
    return duplicates;
  }
  async updatePodcast(id, insertPodcast) {
    try {
      const [podcast] = await db.update(podcasts).set(insertPodcast).where(eq(podcasts.id, id)).returning();
      return podcast || void 0;
    } catch (error) {
      console.error("Failed to update podcast:", error);
      return void 0;
    }
  }
  async deletePodcast(id) {
    try {
      const result = await db.delete(podcasts).where(eq(podcasts.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error("Failed to delete podcast:", error);
      return false;
    }
  }
  // User operations (traditional auth)
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async createUser(userData) {
    const [user] = await db.insert(users).values({
      ...userData,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return user;
  }
  async upsertUser(userData) {
    const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
      target: users.id,
      set: {
        ...userData,
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    return user;
  }
  // User favorites
  async getUserFavorites(userId) {
    return await db.select().from(userFavorites).where(eq(userFavorites.userId, userId));
  }
  async addUserFavorite(favorite) {
    const [userFavorite] = await db.insert(userFavorites).values(favorite).returning();
    return userFavorite;
  }
  async removeUserFavorite(userId, podcastId) {
    await db.delete(userFavorites).where(
      and(
        eq(userFavorites.userId, userId),
        eq(userFavorites.podcastId, podcastId)
      )
    );
  }
  // User notes
  async getUserNotes(userId) {
    return await db.select().from(userNotes).where(eq(userNotes.userId, userId));
  }
  async getUserNoteForPodcast(userId, podcastId) {
    const [note] = await db.select().from(userNotes).where(
      and(
        eq(userNotes.userId, userId),
        eq(userNotes.podcastId, podcastId)
      )
    );
    return note;
  }
  async createUserNote(noteData) {
    const [note] = await db.insert(userNotes).values(noteData).returning();
    return note;
  }
  async updateUserNote(id, noteText) {
    const [note] = await db.update(userNotes).set({
      note: noteText,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(userNotes.id, id)).returning();
    return note;
  }
  async deleteUserNote(id) {
    await db.delete(userNotes).where(eq(userNotes.id, id));
  }
};
var storage = new DatabaseStorage();

// server/auth.ts
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import connectPg from "connect-pg-simple";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
var scryptAsync = promisify(scrypt);
var ipAttempts = /* @__PURE__ */ new Map();
var usernameAttempts = /* @__PURE__ */ new Map();
setInterval(() => {
  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1e3;
  Array.from(ipAttempts.entries()).forEach(([key, data]) => {
    if (now - data.lastAttempt > thirtyMinutes) {
      ipAttempts.delete(key);
    }
  });
  Array.from(usernameAttempts.entries()).forEach(([key, data]) => {
    if (now - data.lastAttempt > thirtyMinutes) {
      usernameAttempts.delete(key);
    }
  });
}, 30 * 60 * 1e3);
function calculateBackoffDelay(attemptCount) {
  const baseDelay = Math.pow(2, Math.max(0, attemptCount - 1)) * 1e3;
  const maxDelay = 15 * 60 * 1e3;
  return Math.min(baseDelay, maxDelay);
}
function createUsernameRateLimit() {
  return (req, res, next) => {
    const identifier = ipKeyGenerator(req.ip || "") || "unknown";
    const username = req.body?.username?.trim().toLowerCase();
    if (!username) {
      return next();
    }
    const now = Date.now();
    const ipData = ipAttempts.get(identifier) || { count: 0, lastAttempt: 0, nextAllowedAttempt: 0 };
    const usernameData = usernameAttempts.get(username) || { count: 0, lastAttempt: 0, nextAllowedAttempt: 0 };
    if (now < ipData.nextAllowedAttempt || now < usernameData.nextAllowedAttempt) {
      const remainingTime = Math.max(
        Math.ceil((ipData.nextAllowedAttempt - now) / 1e3),
        Math.ceil((usernameData.nextAllowedAttempt - now) / 1e3)
      );
      return res.status(429).json({
        message: "Too many failed attempts. Please try again later.",
        retryAfter: remainingTime
      });
    }
    const originalEnd = res.end;
    res.end = function(...args) {
      if (res.statusCode === 401) {
        ipData.count++;
        ipData.lastAttempt = now;
        ipData.nextAllowedAttempt = now + calculateBackoffDelay(ipData.count);
        ipAttempts.set(identifier, ipData);
        usernameData.count++;
        usernameData.lastAttempt = now;
        usernameData.nextAllowedAttempt = now + calculateBackoffDelay(usernameData.count);
        usernameAttempts.set(username, usernameData);
        console.log(`Failed login attempt for user '${username}' from IP '${identifier}'. IP attempts: ${ipData.count}, Username attempts: ${usernameData.count}`);
      } else if (res.statusCode >= 200 && res.statusCode < 300) {
        ipAttempts.delete(identifier);
        usernameAttempts.delete(username);
        console.log(`Successful login for user '${username}' from IP '${identifier}'. Rate limit counters reset.`);
      }
      return originalEnd.apply(this, args);
    };
    next();
  };
}
var registerRateLimit = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 5,
  // Limit each IP to 5 registration attempts per windowMs
  message: {
    message: "Too many registration attempts from this IP. Please try again in 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => ipKeyGenerator(req.ip || ""),
  handler: (req, res) => {
    console.log(`Registration rate limit exceeded for IP: ${ipKeyGenerator(req.ip || "")}`);
    res.status(429).json({
      message: "Too many registration attempts from this IP. Please try again in 15 minutes.",
      retryAfter: 900
      // 15 minutes in seconds
    });
  }
});
var loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 10,
  // Limit each IP to 10 login attempts per windowMs
  message: {
    message: "Too many login attempts from this IP. Please try again in 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => ipKeyGenerator(req.ip || ""),
  handler: (req, res) => {
    console.log(`Login rate limit exceeded for IP: ${ipKeyGenerator(req.ip || "")}`);
    res.status(429).json({
      message: "Too many login attempts from this IP. Please try again in 15 minutes.",
      retryAfter: 900
      // 15 minutes in seconds
    });
  }
});
var usernameRateLimit = createUsernameRateLimit();
async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scryptAsync(password, salt, 64);
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}
async function verifyPassword(password, hashedPassword) {
  const [saltHex, keyHex] = hashedPassword.split(":");
  const salt = Buffer.from(saltHex, "hex");
  const storedKey = Buffer.from(keyHex, "hex");
  const derivedKey = await scryptAsync(password, salt, 64);
  return timingSafeEqual(storedKey, derivedKey);
}
function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1e3;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions"
  });
  return session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      // Use 'none' for iframe contexts to allow cross-site cookies
      // This will be dynamically adjusted based on request context
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: sessionTtl
    }
  });
}
function configureSessionForIframe(req, res, next) {
  const isIframeContext = req.get("X-Iframe-Context") === "true" || req.query.iframe === "true" || req.path.includes("/iframe");
  if (isIframeContext) {
    const originalSetCookie = res.setHeader;
    res.setHeader = function(name, value) {
      if (name.toLowerCase() === "set-cookie") {
        if (Array.isArray(value)) {
          value = value.map((cookie) => {
            if (cookie.includes("connect.sid")) {
              if (process.env.NODE_ENV === "production") {
                cookie = cookie.replace(/SameSite=\w+/i, "SameSite=None");
                if (!cookie.includes("Secure")) {
                  cookie += "; Secure";
                }
              }
              if (!cookie.includes("Partitioned")) {
                cookie += "; Partitioned";
              }
            }
            return cookie;
          });
        } else if (typeof value === "string" && value.includes("connect.sid")) {
          if (process.env.NODE_ENV === "production") {
            value = value.replace(/SameSite=\w+/i, "SameSite=None");
            if (!value.includes("Secure")) {
              value += "; Secure";
            }
          }
          if (!value.includes("Partitioned")) {
            value += "; Partitioned";
          }
        }
      }
      return originalSetCookie.call(this, name, value);
    };
  }
  next();
}
async function setupAuth(app2) {
  app2.set("trust proxy", 1);
  app2.use(configureSessionForIframe);
  app2.use(getSession());
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(new LocalStrategy(
    {
      usernameField: "username",
      passwordField: "password"
    },
    async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }
        const isValid = await verifyPassword(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Invalid username or password" });
        }
        const { password: _, ...userWithoutPassword } = user;
        return done(null, userWithoutPassword);
      } catch (error) {
        return done(error);
      }
    }
  ));
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      if (user) {
        const { password: _, ...userWithoutPassword } = user;
        done(null, userWithoutPassword);
      } else {
        done(null, false);
      }
    } catch (error) {
      done(error);
    }
  });
  app2.post("/api/register", registerRateLimit, async (req, res) => {
    try {
      const validationResult = registerUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: validationResult.error.issues
        });
      }
      const { username, password, email, firstName, lastName } = validationResult.data;
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      if (email) {
        const existingEmailUser = await storage.getUserByEmail(email);
        if (existingEmailUser) {
          return res.status(400).json({ message: "Email already registered" });
        }
      }
      const hashedPassword = await hashPassword(password);
      const newUser = await storage.createUser({
        username,
        password: hashedPassword,
        email: email || null,
        firstName: firstName || null,
        lastName: lastName || null,
        isAdmin: false
      });
      const { password: _, ...userWithoutPassword } = newUser;
      req.login(userWithoutPassword, (err) => {
        if (err) {
          return res.status(500).json({ message: "Registration successful but login failed" });
        }
        res.status(201).json({ user: userWithoutPassword });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/login", loginRateLimit, usernameRateLimit, (req, res, next) => {
    const validationResult = loginUserSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Invalid request data",
        errors: validationResult.error.issues
      });
    }
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return res.status(500).json({ message: "Internal server error" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      req.session.regenerate((err2) => {
        if (err2) {
          return res.status(500).json({ message: "Login failed" });
        }
        req.login(user, (err3) => {
          if (err3) {
            return res.status(500).json({ message: "Login failed" });
          }
          res.json({ user });
        });
      });
    })(req, res, next);
  });
  app2.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      req.session.destroy((err2) => {
        if (err2) {
          return res.status(500).json({ message: "Logout failed" });
        }
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out successfully" });
      });
    });
  });
  app2.get("/api/user", (req, res) => {
    if (req.isAuthenticated() && req.user) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    app2.post("/api/test-rate-limit", rateLimit({
      windowMs: 60 * 1e3,
      // 1 minute
      max: 3,
      // 3 requests per minute
      keyGenerator: (req, res) => ipKeyGenerator(req.ip || ""),
      handler: (req, res) => {
        console.log(`Test rate limit exceeded for IP: ${ipKeyGenerator(req.ip || "")}`);
        res.status(429).json({ message: "Rate limit test - too many requests" });
      }
    }), (req, res) => {
      console.log(`Test rate limit request from IP: ${ipKeyGenerator(req.ip || "")}`);
      res.json({ message: "Rate limit test endpoint", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    });
  }
}
var isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
};
var requireAdmin = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};
async function seedAdminUser() {
  try {
    const adminUsername = "AdminAnselmo";
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("ADMIN_PASSWORD environment variable is required in production");
      } else {
        console.warn("Warning: ADMIN_PASSWORD not set. Skipping admin user creation in development.");
        return;
      }
    }
    const existingAdmin = await storage.getUserByUsername(adminUsername);
    if (existingAdmin) {
      console.log("Admin user already exists");
      return;
    }
    const hashedPassword = await hashPassword(adminPassword);
    await storage.createUser({
      username: adminUsername,
      password: hashedPassword,
      email: "admin@winepodcast.com",
      firstName: "Admin",
      lastName: "Anselmo",
      isAdmin: true
    });
    console.log("Admin user created successfully");
  } catch (error) {
    console.error("Error seeding admin user:", error);
  }
}

// server/routes.ts
import { z as z2 } from "zod";
var upload = multer({ storage: multer.memoryStorage() });
async function registerRoutes(app2) {
  await setupAuth(app2);
  app2.get("/api/podcasts", async (req, res) => {
    try {
      const cleanQuery = (value) => {
        if (typeof value === "string" && value.trim() === "") return void 0;
        return value || void 0;
      };
      const filters = searchFiltersSchema.parse({
        query: cleanQuery(req.query.query),
        episodeLength: cleanQuery(req.query.episodeLength),
        categories: req.query.categories && req.query.categories !== "" ? Array.isArray(req.query.categories) ? req.query.categories : req.query.categories.split(",").filter(Boolean) : void 0,
        status: cleanQuery(req.query.status),
        country: cleanQuery(req.query.country),
        sortBy: cleanQuery(req.query.sortBy)
      });
      const podcasts2 = await storage.searchPodcasts(filters);
      res.json(podcasts2);
    } catch (error) {
      console.error("Search parameter error:", error);
      res.status(400).json({ message: "Invalid search parameters", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  app2.get("/api/podcasts/:id", async (req, res) => {
    try {
      const podcast = await storage.getPodcastById(req.params.id);
      if (!podcast) {
        return res.status(404).json({ message: "Podcast not found" });
      }
      res.json(podcast);
    } catch (error) {
      res.status(500).json({ message: "Internal server error", error });
    }
  });
  app2.post("/api/podcasts", async (req, res) => {
    try {
      const podcastData = insertPodcastSchema.parse(req.body);
      const podcast = await storage.createPodcast(podcastData);
      res.status(201).json(podcast);
    } catch (error) {
      res.status(400).json({ message: "Invalid podcast data", error });
    }
  });
  app2.patch("/api/podcasts/:id", requireAdmin, async (req, res) => {
    try {
      const podcastData = insertPodcastSchema.parse(req.body);
      const updatedPodcast = await storage.updatePodcast(req.params.id, podcastData);
      if (!updatedPodcast) {
        return res.status(404).json({ message: "Podcast not found" });
      }
      res.json(updatedPodcast);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ message: "Invalid podcast data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update podcast", error });
      }
    }
  });
  app2.delete("/api/podcasts/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deletePodcast(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Podcast not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete podcast", error });
    }
  });
  app2.post("/api/podcasts/import", requireAdmin, upload.single("csvFile"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No CSV file provided" });
      }
      const overwriteDuplicates = req.query.overwrite === "true";
      const podcasts2 = [];
      const errors = [];
      let rowNumber = 0;
      let headers = [];
      const stream = Readable.from(req.file.buffer);
      await new Promise((resolve, reject) => {
        stream.pipe(csvParser()).on("headers", (headerList) => {
          headers = headerList;
          console.log("CSV Headers found:", headers);
        }).on("data", (row) => {
          rowNumber++;
          if (rowNumber <= 3) {
            console.log(`Row ${rowNumber} data:`, row);
            console.log(`Row ${rowNumber} columns:`, Object.keys(row));
          }
          try {
            const getColumnValue = (columnNames) => {
              for (const colName of columnNames) {
                const exactMatch = row[colName];
                if (exactMatch !== void 0 && exactMatch !== null && String(exactMatch).trim() !== "") {
                  return String(exactMatch).trim();
                }
                const caseInsensitiveMatch = Object.keys(row).find(
                  (key) => key.toLowerCase() === colName.toLowerCase()
                );
                if (caseInsensitiveMatch && row[caseInsensitiveMatch] && String(row[caseInsensitiveMatch]).trim() !== "") {
                  return String(row[caseInsensitiveMatch]).trim();
                }
              }
              return void 0;
            };
            const title = getColumnValue([
              "Podcast Title",
              "title",
              "Title",
              "TITLE",
              "podcast_title",
              "name",
              "Name"
            ]);
            const host = getColumnValue([
              "Podcast Host(s)",
              "host",
              "Host",
              "HOST",
              "hosts",
              "Hosts",
              "podcast_host"
            ]);
            const country = getColumnValue([
              "Country of Production",
              "country",
              "Country",
              "COUNTRY",
              "nation",
              "location"
            ]) || "Unknown";
            const language = getColumnValue([
              "Primary Language(s) of the Podcast",
              "Primary Language(s)",
              "language",
              "Language",
              "LANGUAGE",
              "lang",
              "languages",
              "Lingua",
              "lingua",
              "LINGUA",
              "linguaggio",
              "Linguaggio",
              "idioma",
              "idiomas",
              "Primary Language",
              "primary_language",
              "main_language",
              "podcast_language",
              "spoken_language",
              "audio_language"
            ]) || "English";
            const yearStr = getColumnValue([
              "Year Launched",
              "year",
              "Year",
              "YEAR",
              "launch_year",
              "start_year"
            ]) || String((/* @__PURE__ */ new Date()).getFullYear());
            const status = getColumnValue([
              "Is the podcast currently active?",
              "Is currently active?",
              "status",
              "Status",
              "STATUS",
              "active",
              "Active"
            ]) || "Active";
            const categoriesStr = getColumnValue([
              "Categories",
              "categories",
              "Category",
              "category",
              "CATEGORIES",
              "genre",
              "genres"
            ]) || "";
            const episodeLength = getColumnValue([
              "Typical Episode Length",
              "Episode Length",
              "episodeLength",
              "episode_length",
              "length",
              "duration"
            ]);
            const episodes = getColumnValue([
              "Number of episodes of your podcast published to date",
              "Episodes",
              "episodes",
              "episode_count",
              "total_episodes"
            ]);
            const description = getColumnValue([
              "One-sentence description for the directory listing",
              "Description",
              "description",
              "desc",
              "about",
              "summary"
            ]);
            const imageUrl = getColumnValue([
              "Logo",
              "logo",
              "LOGO",
              "image",
              "Image",
              "imageUrl",
              "image_url",
              "podcast_logo"
            ]);
            if (!title) {
              throw new Error(`Missing title. Row data: ${JSON.stringify(row)}`);
            }
            if (!host) {
              throw new Error(`Missing host. Row data: ${JSON.stringify(row)}`);
            }
            let parsedYear = (/* @__PURE__ */ new Date()).getFullYear();
            if (yearStr && !isNaN(parseInt(yearStr))) {
              parsedYear = parseInt(yearStr);
            }
            const podcastData = {
              title,
              host,
              country,
              language,
              year: parsedYear,
              status,
              categories: categoriesStr.split(",").map((s) => s.trim()).filter(Boolean),
              episodeLength,
              episodes,
              description,
              socialLinks: {
                spotify: getColumnValue(["Spotify Link", "Spotify URL", "spotify", "Spotify", "spotify_url"]),
                instagram: getColumnValue(["Instagram @", "Instagram URL", "instagram", "Instagram", "instagram_url"]),
                youtube: getColumnValue(["YouTube Link", "YouTube URL", "youtube", "Youtube", "youtube_url"]),
                website: getColumnValue(["Website", "Website URL", "website", "site", "url"])
              },
              imageUrl
            };
            const validatedData = insertPodcastSchema.parse(podcastData);
            podcasts2.push(validatedData);
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Invalid data";
            errors.push(`Row ${rowNumber}: ${errorMsg}`);
            console.error(`Row ${rowNumber} error:`, errorMsg, "Data:", row);
          }
        }).on("end", resolve).on("error", reject);
      });
      console.log(`Processing complete. Valid podcasts: ${podcasts2.length}, Errors: ${errors.length}`);
      const titleHostPairs = podcasts2.map((p) => ({ title: p.title, host: p.host }));
      const existingPodcasts = await storage.findPodcastsByTitleHost(titleHostPairs);
      const existingMap = /* @__PURE__ */ new Map();
      existingPodcasts.forEach((podcast) => {
        const key = createDeduplicationKey(podcast.title, podcast.host);
        existingMap.set(key, podcast.id);
      });
      const newPodcasts = [];
      const duplicatesSkipped = [];
      const podcastsToUpdate = [];
      podcasts2.forEach((podcast, index2) => {
        const key = createDeduplicationKey(podcast.title, podcast.host);
        const existingId = existingMap.get(key);
        if (existingId) {
          if (overwriteDuplicates) {
            podcastsToUpdate.push({ podcast, existingId });
          } else {
            duplicatesSkipped.push(podcast);
          }
        } else {
          newPodcasts.push(podcast);
        }
      });
      const createdPodcasts = await storage.bulkCreatePodcasts(newPodcasts);
      const updatedPodcasts = [];
      if (overwriteDuplicates && podcastsToUpdate.length > 0) {
        for (const { podcast, existingId } of podcastsToUpdate) {
          const updated = await storage.updatePodcast(existingId, podcast);
          if (updated) updatedPodcasts.push(updated);
        }
      }
      res.json({
        success: true,
        imported: createdPodcasts.length,
        duplicatesSkipped: duplicatesSkipped.length,
        updated: updatedPodcasts.length,
        errors: errors.length,
        errorMessages: errors.slice(0, 20),
        // Return first 20 errors
        totalRows: rowNumber,
        headers,
        podcasts: createdPodcasts,
        updatedPodcasts,
        overwriteMode: overwriteDuplicates
      });
    } catch (error) {
      console.error("CSV import failed:", error);
      res.status(500).json({
        message: "CSV import failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.get("/api/user/favorites", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch favorites", error });
    }
  });
  app2.post("/api/user/favorites", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const { podcastId } = req.body;
      if (!podcastId) {
        return res.status(400).json({ message: "Podcast ID is required" });
      }
      const favorite = await storage.addUserFavorite({
        userId,
        podcastId
      });
      res.status(201).json(favorite);
    } catch (error) {
      res.status(500).json({ message: "Failed to add favorite", error });
    }
  });
  app2.delete("/api/user/favorites/:podcastId", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const { podcastId } = req.params;
      await storage.removeUserFavorite(userId, podcastId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove favorite", error });
    }
  });
  app2.get("/api/user/notes", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const notes = await storage.getUserNotes(userId);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notes", error });
    }
  });
  app2.get("/api/user/notes/:podcastId", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const { podcastId } = req.params;
      const note = await storage.getUserNoteForPodcast(userId, podcastId);
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }
      res.json(note);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch note", error });
    }
  });
  app2.post("/api/user/notes", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const noteData = insertUserNoteSchema.parse({
        ...req.body,
        userId
      });
      const note = await storage.createUserNote(noteData);
      res.status(201).json(note);
    } catch (error) {
      res.status(400).json({ message: "Invalid note data", error });
    }
  });
  app2.put("/api/user/notes/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { note } = req.body;
      if (!note) {
        return res.status(400).json({ message: "Note text is required" });
      }
      const updatedNote = await storage.updateUserNote(id, note);
      res.json(updatedNote);
    } catch (error) {
      res.status(500).json({ message: "Failed to update note", error });
    }
  });
  app2.delete("/api/user/notes/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteUserNote(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete note", error });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
var corsOptions = {
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    const allowedOrigins = [
      // Development origins
      "http://localhost:3000",
      "http://localhost:5000",
      "http://localhost:8080",
      "https://localhost:3000",
      "https://localhost:5000",
      "https://localhost:8080",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5000",
      "http://127.0.0.1:8080",
      "https://127.0.0.1:3000",
      "https://127.0.0.1:5000",
      "https://127.0.0.1:8080"
      // Production origins - Add your WordPress domain here
      // 'https://your-wordpress-site.com',
      // 'https://www.your-wordpress-site.com',
    ];
    const isReplitDomain = /^https?:\/\/[\w\-]+\.replit\.dev(:\d+)?$/.test(origin) || /^https?:\/\/[\w\-]+\.repl\.co(:\d+)?$/.test(origin) || /^https?:\/\/[\w\-]+-[\w\-]+-[\w\-]+-[\w\-]+-[\w\-]+\.[\w\-]+\.replit\.dev(:\d+)?$/.test(origin) || /^https?:\/\/[\w\-]+\.replit\.app(:\d+)?$/.test(origin);
    const isWordPressSubdomain = /^https?:\/\/[\w\-]+\.wordpress\.com$/.test(origin);
    const isWordPressHosting = /^https?:\/\/[\w\-\.]+\.(wpengine|kinsta|siteground|godaddy)\.com$/.test(origin);
    const isTestDomain = /^https?:\/\/(test|example)\.[\w\-]+\.com$/.test(origin);
    if (allowedOrigins.includes(origin) || isReplitDomain || isWordPressSubdomain || isWordPressHosting || isTestDomain) {
      console.log(`CORS: Allowed origin: ${origin}`);
      callback(null, true);
    } else {
      console.log(`CORS: Rejected origin: ${origin}`);
      callback(new Error("Not allowed by CORS"), false);
    }
  },
  credentials: true,
  // Enable cookies for authentication
  optionsSuccessStatus: 200,
  // For legacy browser support
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "Cache-Control",
    "X-Iframe-Context"
  ],
  exposedHeaders: ["X-Frame-Options", "Content-Security-Policy"]
};
app.use(cors(corsOptions));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  if (process.env.NODE_ENV === "production") {
    const requiredEnvVars = ["SESSION_SECRET", "DATABASE_URL"];
    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
    if (missingVars.length > 0) {
      console.error(`PRODUCTION DEPLOYMENT FAILED: Missing required environment variables: ${missingVars.join(", ")}`);
      console.error("Please ensure all required environment variables are set before deploying to production.");
      process.exit(1);
    }
    console.log("\u2713 All required production environment variables are present");
  }
  const server = await registerRoutes(app);
  await seedAdminUser();
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port} - WordPress iframe fix v2.0`);
  });
})();
