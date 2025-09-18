import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { storage } from "./storage";
import type { User } from "@shared/schema";
import { registerUserSchema, loginUserSchema } from "@shared/schema";

const scryptAsync = promisify(scrypt);

// In-memory store for username-based rate limiting and exponential backoff
interface AttemptData {
  count: number;
  lastAttempt: number;
  nextAllowedAttempt: number;
}

const ipAttempts = new Map<string, AttemptData>();
const usernameAttempts = new Map<string, AttemptData>();

// Clean up old entries every 30 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000;
  
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
}, 30 * 60 * 1000);

// Helper function to calculate exponential backoff delay
function calculateBackoffDelay(attemptCount: number): number {
  // Exponential backoff: 2^(attempts-1) seconds, max 15 minutes
  const baseDelay = Math.pow(2, Math.max(0, attemptCount - 1)) * 1000;
  const maxDelay = 15 * 60 * 1000; // 15 minutes
  return Math.min(baseDelay, maxDelay);
}

// Custom middleware for username-based rate limiting with exponential backoff
function createUsernameRateLimit(): RequestHandler {
  return (req, res, next) => {
    const identifier = ipKeyGenerator(req, res) || 'unknown';
    const username = req.body?.username?.trim().toLowerCase();
    
    if (!username) {
      return next();
    }
    
    const now = Date.now();
    const ipData = ipAttempts.get(identifier) || { count: 0, lastAttempt: 0, nextAllowedAttempt: 0 };
    const usernameData = usernameAttempts.get(username) || { count: 0, lastAttempt: 0, nextAllowedAttempt: 0 };
    
    // Check if either IP or username is currently blocked
    if (now < ipData.nextAllowedAttempt || now < usernameData.nextAllowedAttempt) {
      const remainingTime = Math.max(
        Math.ceil((ipData.nextAllowedAttempt - now) / 1000),
        Math.ceil((usernameData.nextAllowedAttempt - now) / 1000)
      );
      
      return res.status(429).json({
        message: 'Too many failed attempts. Please try again later.',
        retryAfter: remainingTime
      });
    }
    
    // Store original end function to intercept response
    const originalEnd = res.end;
    res.end = function(this: typeof res, chunk?: any, encoding?: BufferEncoding | (() => void), cb?: () => void) {
      // Check if this was a failed authentication attempt (401 status)
      if (res.statusCode === 401) {
        // Update attempt counters for both IP and username
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
        // Successful login - reset counters for both IP and username
        ipAttempts.delete(identifier);
        usernameAttempts.delete(username);
        console.log(`Successful login for user '${username}' from IP '${identifier}'. Rate limit counters reset.`);
      }
      
      // Call original end function with proper arguments
      if (typeof encoding === 'function') {
        // encoding is actually a callback function
        return originalEnd.call(this, chunk, encoding);
      } else {
        // Normal case with chunk, encoding, and optional callback
        return originalEnd.call(this, chunk, encoding, cb);
      }
    };
    
    next();
  };
}

// IP-based rate limiting for registration (more permissive)
const registerRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 registration attempts per windowMs
  message: {
    message: 'Too many registration attempts from this IP. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => ipKeyGenerator(req.ip || ''),
  handler: (req, res) => {
    console.log(`Registration rate limit exceeded for IP: ${ipKeyGenerator(req.ip || '')}`);
    res.status(429).json({
      message: 'Too many registration attempts from this IP. Please try again in 15 minutes.',
      retryAfter: 900 // 15 minutes in seconds
    });
  },
});

// IP-based rate limiting for login (stricter)
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per windowMs
  message: {
    message: 'Too many login attempts from this IP. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => ipKeyGenerator(req.ip || ''),
  handler: (req, res) => {
    console.log(`Login rate limit exceeded for IP: ${ipKeyGenerator(req.ip || '')}`);
    res.status(429).json({
      message: 'Too many login attempts from this IP. Please try again in 15 minutes.',
      retryAfter: 900 // 15 minutes in seconds
    });
  },
});

// Create username rate limiting middleware instance
const usernameRateLimit = createUsernameRateLimit();

// Password hashing utilities
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const [saltHex, keyHex] = hashedPassword.split(':');
  const salt = Buffer.from(saltHex, 'hex');
  const storedKey = Buffer.from(keyHex, 'hex');
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return timingSafeEqual(storedKey, derivedKey);
}

// Session configuration
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: sessionTtl,
    },
  });
}

// Passport setup
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Local strategy configuration
  passport.use(new LocalStrategy(
    {
      usernameField: 'username',
      passwordField: 'password'
    },
    async (username: string, password: string, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: 'Invalid username or password' });
        }

        const isValid = await verifyPassword(password, user.password);
        if (!isValid) {
          return done(null, false, { message: 'Invalid username or password' });
        }

        // Remove password from user object before passing to session
        const { password: _, ...userWithoutPassword } = user;
        return done(null, userWithoutPassword);
      } catch (error) {
        return done(error);
      }
    }
  ));

  // Serialize user for session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (user) {
        // Remove password from user object
        const { password: _, ...userWithoutPassword } = user;
        done(null, userWithoutPassword);
      } else {
        done(null, false);
      }
    } catch (error) {
      done(error);
    }
  });

  // Auth routes with brute-force protection
  app.post('/api/register', registerRateLimit, async (req, res) => {
    try {
      // Validate request body
      const validationResult = registerUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Invalid request data', 
          errors: validationResult.error.issues 
        });
      }
      
      const { username, password, email, firstName, lastName } = validationResult.data;

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      // Check if email already exists
      if (email) {
        const existingEmailUser = await storage.getUserByEmail(email);
        if (existingEmailUser) {
          return res.status(400).json({ message: 'Email already registered' });
        }
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const newUser = await storage.createUser({
        username,
        password: hashedPassword,
        email: email || null,
        firstName: firstName || null,
        lastName: lastName || null,
        isAdmin: false,
      });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = newUser;
      
      // Log user in
      req.login(userWithoutPassword, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Registration successful but login failed' });
        }
        res.status(201).json({ user: userWithoutPassword });
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/login', loginRateLimit, usernameRateLimit, (req, res, next) => {
    // Validate request body
    const validationResult = loginUserSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid request data', 
        errors: validationResult.error.issues 
      });
    }

    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: 'Internal server error' });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || 'Authentication failed' });
      }

      // Session fixation protection: regenerate session on successful login
      req.session.regenerate((err) => {
        if (err) {
          return res.status(500).json({ message: 'Login failed' });
        }
        
        req.login(user, (err) => {
          if (err) {
            return res.status(500).json({ message: 'Login failed' });
          }
          res.json({ user });
        });
      });
    })(req, res, next);
  });

  app.post('/api/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      
      // Session fixation protection: destroy session on logout
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: 'Logout failed' });
        }
        
        // Clear session cookie
        res.clearCookie('connect.sid');
        res.json({ message: 'Logged out successfully' });
      });
    });
  });

  app.get('/api/user', (req, res) => {
    if (req.isAuthenticated() && req.user) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });

  // Test endpoint for rate limiting (development only)
  if (process.env.NODE_ENV !== 'production') {
    app.post('/api/test-rate-limit', rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 3, // 3 requests per minute
      keyGenerator: (req, res) => ipKeyGenerator(req.ip || ''),
      handler: (req, res) => {
        console.log(`Test rate limit exceeded for IP: ${ipKeyGenerator(req.ip || '')}`);
        res.status(429).json({ message: 'Rate limit test - too many requests' });
      },
    }), (req, res) => {
      console.log(`Test rate limit request from IP: ${ipKeyGenerator(req.ip || '')}`);
      res.json({ message: 'Rate limit test endpoint', timestamp: new Date().toISOString() });
    });
  }
}

// Authentication middleware
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Authentication required' });
};

// Admin middleware
export const isAdmin: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated() && (req.user as any)?.isAdmin) {
    return next();
  }
  res.status(403).json({ message: 'Admin access required' });
};

// Combined auth and admin middleware
export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  if (!(req.user as any)?.isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Seed admin user
export async function seedAdminUser() {
  try {
    const adminUsername = 'AdminAnselmo';
    
    // Require ADMIN_PASSWORD environment variable in production
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('ADMIN_PASSWORD environment variable is required in production');
      } else {
        console.warn('Warning: ADMIN_PASSWORD not set. Skipping admin user creation in development.');
        return;
      }
    }
    
    // Check if admin user already exists
    const existingAdmin = await storage.getUserByUsername(adminUsername);
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user
    const hashedPassword = await hashPassword(adminPassword);
    await storage.createUser({
      username: adminUsername,
      password: hashedPassword,
      email: 'admin@winepodcast.com',
      firstName: 'Admin',
      lastName: 'Anselmo',
      isAdmin: true,
    });

    console.log('Admin user created successfully');
  } catch (error) {
    console.error('Error seeding admin user:', error);
  }
}