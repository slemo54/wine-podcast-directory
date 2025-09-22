import express from "express";
import cors from "cors";
import { registerRoutes } from "../server/routes";
import { seedAdminUser } from "../server/auth";

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
      'http://localhost:3000',
      'http://localhost:5000',
      'http://localhost:8080',
      'https://localhost:3000',
      'https://localhost:5000',
      'https://localhost:8080',
    ];
    
    // Check for Vercel domains
    const isVercelDomain = /^https?:\/\/[\w\-]+\.vercel\.app$/.test(origin) ||
                          /^https?:\/\/[\w\-]+\.vercel\.dev$/.test(origin);
    
    // Check for WordPress.com subdomains
    const isWordPressSubdomain = /^https?:\/\/[\w\-]+\.wordpress\.com$/.test(origin);
    
    // Check for common WordPress hosting patterns
    const isWordPressHosting = /^https?:\/\/[\w\-\.]+\.(wpengine|kinsta|siteground|godaddy)\.com$/.test(origin);
    
    // Check if origin is in allowed list or matches patterns
    if (allowedOrigins.includes(origin) || isVercelDomain || isWordPressSubdomain || isWordPressHosting) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
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

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Initialize routes
let initialized = false;
const initializeApp = async () => {
  if (!initialized) {
    await registerRoutes(app);
    await seedAdminUser();
    initialized = true;
  }
};

// Export for Vercel
export default async (req: any, res: any) => {
  await initializeApp();
  return app(req, res);
};
