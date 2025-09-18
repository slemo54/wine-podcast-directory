import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import csvParser from "csv-parser";
import { Readable } from "stream";
import { storage } from "./storage";
import { insertPodcastSchema, insertUserNoteSchema, searchFiltersSchema, type InsertPodcast } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { z } from "zod";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware setup
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get all podcasts with optional filtering
  app.get("/api/podcasts", async (req, res) => {
    try {
      // Clean up query parameters - convert empty strings to undefined
      const cleanQuery = (value: any) => {
        if (typeof value === 'string' && value.trim() === '') return undefined;
        return value || undefined;
      };

      const filters = searchFiltersSchema.parse({
        query: cleanQuery(req.query.query),
        episodeLength: cleanQuery(req.query.episodeLength),
        categories: req.query.categories && req.query.categories !== '' 
          ? (Array.isArray(req.query.categories) 
            ? req.query.categories 
            : (req.query.categories as string).split(',').filter(Boolean))
          : undefined,
        status: cleanQuery(req.query.status),
        country: cleanQuery(req.query.country),
        sortBy: cleanQuery(req.query.sortBy) as any,
      });
      
      const podcasts = await storage.searchPodcasts(filters);
      res.json(podcasts);
    } catch (error) {
      console.error("Search parameter error:", error);
      res.status(400).json({ message: "Invalid search parameters", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Get single podcast by ID
  app.get("/api/podcasts/:id", async (req, res) => {
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

  // Create single podcast
  app.post("/api/podcasts", async (req, res) => {
    try {
      const podcastData = insertPodcastSchema.parse(req.body);
      const podcast = await storage.createPodcast(podcastData);
      res.status(201).json(podcast);
    } catch (error) {
      res.status(400).json({ message: "Invalid podcast data", error });
    }
  });

  // CSV Import endpoint
  app.post("/api/podcasts/import", upload.single('csvFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No CSV file provided" });
      }

      const podcasts: InsertPodcast[] = [];
      const errors: string[] = [];
      let rowNumber = 0;
      let headers: string[] = [];

      const stream = Readable.from(req.file.buffer);
      
      await new Promise((resolve, reject) => {
        stream
          .pipe(csvParser())
          .on('headers', (headerList) => {
            headers = headerList;
            console.log('CSV Headers found:', headers);
          })
          .on('data', (row) => {
            rowNumber++;
            
            // Log first row for debugging
            if (rowNumber === 1) {
              console.log('First row data:', row);
              console.log('Available columns:', Object.keys(row));
            }
            
            try {
              // Enhanced column mapping with more flexible matching
              const getColumnValue = (columnNames: string[]): string | undefined => {
                for (const colName of columnNames) {
                  const exactMatch = row[colName];
                  if (exactMatch !== undefined && exactMatch !== null && exactMatch !== '') {
                    return String(exactMatch).trim();
                  }
                  
                  // Try case-insensitive match
                  const caseInsensitiveMatch = Object.keys(row).find(key => 
                    key.toLowerCase() === colName.toLowerCase()
                  );
                  if (caseInsensitiveMatch && row[caseInsensitiveMatch]) {
                    return String(row[caseInsensitiveMatch]).trim();
                  }
                }
                return undefined;
              };

              // Map CSV columns to podcast schema with flexible matching
              const title = getColumnValue([
                'Podcast Title', 'title', 'Title', 'TITLE', 'podcast_title', 'name', 'Name'
              ]);
              
              const host = getColumnValue([
                'Podcast Host(s)', 'host', 'Host', 'HOST', 'hosts', 'Hosts', 'podcast_host'
              ]);
              
              const country = getColumnValue([
                'Country of Production', 'country', 'Country', 'COUNTRY', 'nation', 'location'
              ]);
              
              const language = getColumnValue([
                'Primary Language(s)', 'language', 'Language', 'LANGUAGE', 'lang', 'languages'
              ]);
              
              const yearStr = getColumnValue([
                'Year Launched', 'year', 'Year', 'YEAR', 'launch_year', 'start_year'
              ]);
              
              const status = getColumnValue([
                'Is currently active?', 'status', 'Status', 'STATUS', 'active', 'Active'
              ]) || 'Active';
              
              const categoriesStr = getColumnValue([
                'Categories', 'categories', 'Category', 'category', 'CATEGORIES', 'genre', 'genres'
              ]) || '';
              
              const episodeLength = getColumnValue([
                'Episode Length', 'episodeLength', 'episode_length', 'length', 'duration'
              ]);
              
              const episodes = getColumnValue([
                'Episodes', 'episodes', 'episode_count', 'total_episodes'
              ]);
              
              const description = getColumnValue([
                'Description', 'description', 'desc', 'about', 'summary'
              ]);

              // Validate required fields
              if (!title) {
                throw new Error('Missing title');
              }
              if (!host) {
                throw new Error('Missing host');
              }
              if (!country) {
                throw new Error('Missing country');
              }
              if (!language) {
                throw new Error('Missing language');
              }
              if (!yearStr || isNaN(parseInt(yearStr))) {
                throw new Error('Missing or invalid year');
              }

              const podcastData: InsertPodcast = {
                title,
                host,
                country,
                language,
                year: parseInt(yearStr),
                status,
                categories: categoriesStr.split(',').map((s: string) => s.trim()).filter(Boolean),
                episodeLength,
                episodes,
                description,
                socialLinks: {
                  spotify: getColumnValue(['Spotify URL', 'spotify', 'Spotify', 'spotify_url']),
                  instagram: getColumnValue(['Instagram URL', 'instagram', 'Instagram', 'instagram_url']),
                  youtube: getColumnValue(['YouTube URL', 'youtube', 'Youtube', 'youtube_url']),
                  website: getColumnValue(['Website URL', 'website', 'Website', 'site', 'url']),
                }
              };

              // Validate the data against schema
              const validatedData = insertPodcastSchema.parse(podcastData);
              podcasts.push(validatedData);
              
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Invalid data';
              errors.push(`Row ${rowNumber}: ${errorMsg}`);
              console.error(`Row ${rowNumber} error:`, errorMsg, 'Data:', row);
            }
          })
          .on('end', resolve)
          .on('error', reject);
      });

      console.log(`Processing complete. Valid podcasts: ${podcasts.length}, Errors: ${errors.length}`);
      
      // Bulk insert valid podcasts
      const createdPodcasts = await storage.bulkCreatePodcasts(podcasts);

      res.json({
        success: true,
        imported: createdPodcasts.length,
        errors: errors.length,
        errorMessages: errors.slice(0, 20), // Return first 20 errors
        totalRows: rowNumber,
        headers: headers,
        podcasts: createdPodcasts
      });
    } catch (error) {
      console.error('CSV import failed:', error);
      res.status(500).json({ 
        message: "CSV import failed", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // User favorites endpoints
  app.get("/api/user/favorites", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch favorites", error });
    }
  });

  app.post("/api/user/favorites", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { podcastId } = req.body;
      
      if (!podcastId) {
        return res.status(400).json({ message: "Podcast ID is required" });
      }

      const favorite = await storage.addUserFavorite({
        userId,
        podcastId,
      });
      res.status(201).json(favorite);
    } catch (error) {
      res.status(500).json({ message: "Failed to add favorite", error });
    }
  });

  app.delete("/api/user/favorites/:podcastId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { podcastId } = req.params;
      
      await storage.removeUserFavorite(userId, podcastId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove favorite", error });
    }
  });

  // User notes endpoints
  app.get("/api/user/notes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notes = await storage.getUserNotes(userId);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notes", error });
    }
  });

  app.get("/api/user/notes/:podcastId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.post("/api/user/notes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const noteData = insertUserNoteSchema.parse({
        ...req.body,
        userId,
      });
      
      const note = await storage.createUserNote(noteData);
      res.status(201).json(note);
    } catch (error) {
      res.status(400).json({ message: "Invalid note data", error });
    }
  });

  app.put("/api/user/notes/:id", isAuthenticated, async (req: any, res) => {
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

  app.delete("/api/user/notes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteUserNote(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete note", error });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
