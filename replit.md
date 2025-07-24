# GradeWise - Kindergarten Grading System

## Overview

GradeWise is a comprehensive kindergarten grading and reporting system built with a modern full-stack architecture. The application provides role-based access for administrators, teachers, and parents to manage student assessments, track progress, and generate reports with interactive charts.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Database Provider**: Neon serverless PostgreSQL
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL storage

### Key Design Decisions

**Monorepo Structure**: The application uses a shared folder structure with `client/`, `server/`, and `shared/` directories to enable code reuse between frontend and backend, particularly for schema validation and type definitions.

**Type Safety**: Full TypeScript implementation across the stack ensures type safety from database schema to UI components. Drizzle ORM provides end-to-end type safety with Zod schema validation.

**Component Architecture**: Uses shadcn/ui as the base component system, providing consistent design patterns and accessibility features out of the box.

## Key Components

### Authentication System
- **Provider**: Replit Auth with OpenID Connect integration
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **Authorization**: Role-based access control (admin, teacher, parent)
- **Security**: HTTP-only cookies with secure session management

### Database Schema
- **Users**: Core user information with role-based access
- **Teachers**: Extended teacher profiles with class assignments
- **Parents**: Parent profiles linked to students
- **Students**: Student information with JSONB grade storage
- **Classes**: Class management and organization
- **Sessions**: Persistent session storage for authentication

### Grade Management
- **Assessment Structure**: 34 configurable assessment aspects
- **Grade Storage**: JSONB arrays storing multiple grade entries per aspect
- **Computation**: Mode-based grade calculation with max fallback
- **Batch Input**: Support for bulk grade entry by teachers

### UI Components
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Interactive Charts**: Recharts integration for radar charts and progress visualization
- **Form Validation**: Zod schemas with React Hook Form integration
- **Accessibility**: Built-in accessibility features through Radix UI primitives

## Data Flow

### Authentication Flow
1. User initiates login through Replit Auth
2. OpenID Connect handles authentication
3. Session established with PostgreSQL storage
4. Role-based routing to appropriate dashboard

### Grade Input Flow
1. Teacher selects student and assessment aspect
2. Multiple grade entries stored as JSON arrays
3. Real-time validation using Zod schemas
4. Batch processing for efficient database updates

### Report Generation Flow
1. Grade data retrieved and processed (mode calculation)
2. Chart configuration generated for radar charts
3. Interactive visualizations rendered with Recharts
4. Export capabilities for PDF generation

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL connection
- **drizzle-orm**: Type-safe ORM with PostgreSQL support
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI primitive components
- **recharts**: Chart visualization library
- **react-hook-form**: Form state management
- **zod**: Schema validation library

### Development Tools
- **drizzle-kit**: Database migration and schema management
- **tsx**: TypeScript execution for development
- **esbuild**: Fast bundling for production builds

### Authentication
- **openid-client**: OpenID Connect client implementation
- **passport**: Authentication middleware
- **connect-pg-simple**: PostgreSQL session store

## Deployment Strategy

### Development Environment
- **Hot Reload**: Vite development server with HMR
- **Database**: Neon serverless PostgreSQL with connection pooling
- **Environment**: Replit-optimized with development banner integration

### Production Build
- **Frontend**: Vite build process generating optimized static assets
- **Backend**: esbuild bundling Express server with ESM output
- **Database**: Schema migrations using Drizzle Kit push commands
- **Session**: PostgreSQL-backed persistent sessions

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string (required)
- **SESSION_SECRET**: Session encryption key (required)
- **REPLIT_DOMAINS**: Domain configuration for Replit Auth
- **ISSUER_URL**: OpenID Connect issuer endpoint

The application is designed for seamless deployment on Replit with minimal configuration requirements, leveraging serverless PostgreSQL for scalability and Replit Auth for simplified user management.