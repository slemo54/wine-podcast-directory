import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import csvParser from "csv-parser";
import { Readable } from "stream";
import { storage } from "./storage";
import { insertPodcastSchema, searchFiltersSchema, type InsertPodcast } from "@shared/schema";
import { z } from "zod";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get all podcasts with optional filtering
  app.get("/api/podcasts", async (req, res) => {
    try {
      const filters = searchFiltersSchema.parse({
        query: req.query.query as string,
        episodeLength: req.query.episodeLength as string,
        categories: req.query.categories ? (req.query.categories as string).split(',') : undefined,
        status: req.query.status as string,
        country: req.query.country as string,
        sortBy: req.query.sortBy as any,
      });
      
      const podcasts = await storage.searchPodcasts(filters);
      res.json(podcasts);
    } catch (error) {
      res.status(400).json({ message: "Invalid search parameters", error });
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

      const stream = Readable.from(req.file.buffer);
      
      await new Promise((resolve, reject) => {
        stream
          .pipe(csvParser())
          .on('data', (row) => {
            rowNumber++;
            try {
              // Map CSV columns to podcast schema
              const podcastData: InsertPodcast = {
                title: row['Podcast Title'] || row['title'],
                host: row['Podcast Host(s)'] || row['host'],
                country: row['Country of Production'] || row['country'],
                language: row['Primary Language(s)'] || row['language'],
                year: parseInt(row['Year Launched'] || row['year']),
                status: row['Is currently active?'] || row['status'] || 'Active',
                categories: (row['Categories'] || row['categories'] || '').split(',').map((s: string) => s.trim()).filter(Boolean),
                episodeLength: row['Episode Length'] || row['episodeLength'],
                episodes: row['Episodes'] || row['episodes'],
                description: row['Description'] || row['description'],
                socialLinks: {
                  spotify: row['Spotify URL'] || row['spotify'],
                  instagram: row['Instagram URL'] || row['instagram'],
                  youtube: row['YouTube URL'] || row['youtube'],
                  website: row['Website URL'] || row['website'],
                }
              };

              // Validate the data
              const validatedData = insertPodcastSchema.parse(podcastData);
              podcasts.push(validatedData);
            } catch (error) {
              errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : 'Invalid data'}`);
            }
          })
          .on('end', resolve)
          .on('error', reject);
      });

      // Bulk insert valid podcasts
      const createdPodcasts = await storage.bulkCreatePodcasts(podcasts);

      res.json({
        success: true,
        imported: createdPodcasts.length,
        errors: errors.length,
        errorMessages: errors.slice(0, 10), // Return first 10 errors
        podcasts: createdPodcasts
      });
    } catch (error) {
      res.status(500).json({ 
        message: "CSV import failed", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Favorites functionality removed per user requirements

  // Statistics removed per user request

  const httpServer = createServer(app);
  return httpServer;
}
