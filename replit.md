# Wine Podcast Directory

## Overview

A comprehensive full-stack web application for discovering and managing wine podcasts. The system provides advanced search and filtering capabilities, CSV data import functionality, and a modern React-based user interface. Built with a PostgreSQL database backend and Express.js API, it serves as a centralized directory for wine enthusiasts to find podcasts matching their interests.

The application features a podcast directory with detailed metadata including country, language, categories, episode length, and social media links. Users can search, filter, and explore podcasts through an intuitive interface with both grid and list view modes.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

**Frontend Architecture**
- React 18 with TypeScript for type safety and modern component patterns
- Vite as the build tool for fast development and optimized production builds
- Tailwind CSS with shadcn/ui component library for consistent, accessible UI components
- TanStack Query for efficient data fetching, caching, and synchronization
- Wouter for lightweight client-side routing
- Custom CSS variables for theming with wine-inspired color palette

**Backend Architecture**
- Express.js server with TypeScript for type-safe API development
- RESTful API design with endpoints for podcast CRUD operations, search, and statistics
- Modular route handling with separate storage abstraction layer
- File upload support using Multer for CSV import functionality
- Session management with PostgreSQL session store
- Error handling middleware for consistent API responses

**Database Design**
- PostgreSQL with Drizzle ORM for type-safe database operations
- Single podcasts table with comprehensive metadata fields including:
  - Basic info (title, host, country, language, year, status)
  - Categorization (categories array, episode length, episode count)
  - Social media links (JSON field for flexible platform support)
- Database migrations managed through Drizzle Kit
- Connection pooling with Neon serverless driver for scalability

**Data Management**
- CSV import system for bulk podcast data ingestion
- Data validation using Zod schemas for consistent data integrity
- Search functionality with full-text search across multiple fields
- Advanced filtering by categories, country, language, status, and episode length
- Sorting capabilities by various fields (title, year, episodes, country)

**Component Architecture**
- Reusable UI components following atomic design principles
- Search and filter components with real-time updates
- Podcast card components supporting both grid and list view modes
- Statistics dashboard for data visualization
- CSV import interface with progress tracking and error handling

**State Management**
- React Query for server state management and caching
- Local state management using React hooks
- Form state handling with React Hook Form and Zod validation
- Toast notifications for user feedback

**Build and Development**
- TypeScript configuration with path aliases for clean imports
- ESBuild for server bundling in production
- Vite plugins for development tools and Replit integration
- PostCSS with Tailwind for CSS processing
- Development and production environment separation

## External Dependencies

**Database Services**
- Neon PostgreSQL for managed database hosting
- Connection pooling and serverless architecture support

**UI and Styling**
- Radix UI primitives for accessible, unstyled components
- Tailwind CSS for utility-first styling approach
- Font Awesome for iconography
- Google Fonts integration (Inter, Playfair Display)

**Development Tools**
- Drizzle Kit for database schema management and migrations
- TanStack Query for advanced data fetching patterns
- React Hook Form with Hookform Resolvers for form validation
- CSV Parser for data import functionality

**Build and Runtime**
- Vite ecosystem including various plugins for development
- Express.js middleware ecosystem
- Node.js runtime with ES modules support
- TypeScript compiler with strict type checking

**File Upload and Processing**
- Multer for handling multipart form data
- CSV parsing libraries for data import
- Stream processing for efficient file handling