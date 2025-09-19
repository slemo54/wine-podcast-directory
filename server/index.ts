import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedAdminUser } from "./auth";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS configuration for WordPress iframe embedding
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // List of allowed WordPress domains and patterns
    const allowedOrigins = [
      // Development origins
      'http://localhost:3000',
      'http://localhost:5000',
      'http://localhost:8080',
      'https://localhost:3000',
      'https://localhost:5000',
      'https://localhost:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:8080',
      'https://127.0.0.1:3000',
      'https://127.0.0.1:5000',
      'https://127.0.0.1:8080',
      
      // Production origins - Add your WordPress domain here
      // 'https://your-wordpress-site.com',
      // 'https://www.your-wordpress-site.com',
    ];
    
    // Check for Replit domains (all Replit subdomains)
    const isReplitDomain = /^https?:\/\/[\w\-]+\.replit\.dev$/.test(origin) || 
                          /^https?:\/\/[\w\-]+\.repl\.co$/.test(origin) ||
                          /^https?:\/\/[\w\-]+-[\w\-]+-[\w\-]+-[\w\-]+-[\w\-]+\.[\w\-]+\.replit\.dev$/.test(origin);
    
    // Check for WordPress.com subdomains
    const isWordPressSubdomain = /^https?:\/\/[\w\-]+\.wordpress\.com$/.test(origin);
    
    // Check for common WordPress hosting patterns
    const isWordPressHosting = /^https?:\/\/[\w\-\.]+\.(wpengine|kinsta|siteground|godaddy)\.com$/.test(origin);
    
    // For development, also allow test domains
    const isTestDomain = /^https?:\/\/(test|example)\.[\w\-]+\.com$/.test(origin);
    
    // Check if origin is in allowed list or matches WordPress/Replit patterns
    if (allowedOrigins.includes(origin) || isReplitDomain || isWordPressSubdomain || isWordPressHosting || isTestDomain) {
      console.log(`CORS: Allowed origin: ${origin}`);
      callback(null, true);
    } else {
      // Log rejected origins for debugging
      console.log(`CORS: Rejected origin: ${origin}`);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true, // Enable cookies for authentication
  optionsSuccessStatus: 200, // For legacy browser support
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin', 
    'X-Requested-With', 
    'Content-Type', 
    'Accept', 
    'Authorization', 
    'Cache-Control',
    'X-Iframe-Context'
  ],
  exposedHeaders: ['X-Frame-Options', 'Content-Security-Policy']
};

app.use(cors(corsOptions));

// Security headers for iframe embedding
app.use((req: Request, res: Response, next: NextFunction) => {
  // Check if request is from iframe context
  const isIframeContext = req.get('X-Iframe-Context') === 'true' || 
                         req.query.iframe === 'true' ||
                         req.path.includes('/iframe');
  
  // Define static frame ancestors allowlist with environment variable support
  const FRAME_ANCESTORS = [
    "'self'",
    "https://*.wordpress.com",
    // Add custom domains from environment variable (comma-separated)
    ...(process.env.FRAME_ANCESTORS ? process.env.FRAME_ANCESTORS.split(',').map(domain => domain.trim()) : []),
    // Development domains
    ...(process.env.NODE_ENV !== 'production' ? [
      "http://localhost:*",
      "https://localhost:*",
      "http://127.0.0.1:*",
      "https://127.0.0.1:*",
      "https://*.replit.dev",
      "https://*.repl.co"
    ] : [])
  ];
  
  if (isIframeContext) {
    // For iframe contexts: Use only CSP frame-ancestors (no X-Frame-Options to avoid conflicts)
    const frameAncestors = FRAME_ANCESTORS.join(' ');
    res.setHeader('Content-Security-Policy', `frame-ancestors ${frameAncestors}`);
    
    // DO NOT set X-Frame-Options when allowing iframe embedding to avoid conflicts
    // Modern browsers prefer CSP frame-ancestors over X-Frame-Options
    
    // Enable iframe embedding features with corrected headers
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    // Note: Cross-Origin-Embedder-Policy removed as 'unsafe-none' was invalid
  } else {
    // Default: prevent framing for non-iframe contexts
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
  }
  
  // Additional security headers (always applied)
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Production environment variable checks - fail fast if required env vars are missing
  if (process.env.NODE_ENV === 'production') {
    const requiredEnvVars = ['SESSION_SECRET', 'DATABASE_URL'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error(`PRODUCTION DEPLOYMENT FAILED: Missing required environment variables: ${missingVars.join(', ')}`);
      console.error('Please ensure all required environment variables are set before deploying to production.');
      process.exit(1);
    }
    
    console.log('✓ All required production environment variables are present');
  }

  const server = await registerRoutes(app);
  
  // Seed admin user after routes are set up
  await seedAdminUser();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
