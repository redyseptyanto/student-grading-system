# GradeWise - Kindergarten Grading System

## Overview

GradeWise is a comprehensive kindergarten grading and reporting system built with a modern full-stack architecture. The application provides role-based access for administrators, teachers, and parents to manage student assessments, track progress, and generate reports with interactive charts. The system now supports multi-role users and includes comprehensive search and filtering capabilities for efficient data management.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (January 2025)

### Major Architecture Simplification (January 28, 2025)
- **Database Schema Consolidation**: Successfully removed redundant `teachers` and `teacher_assignments` tables 
- **User-Based Teacher System**: Consolidated all teacher data into `users` table with role-based access via `userSchoolAssignments`
- **Simplified Data Model**: Teacher information now stored directly in `userSchoolAssignments` with `subjects`, `assignedClasses`, and `academicYear` fields
- **Direct Teacher-Group References**: Updated `studentGroups` table to reference `teacherUserId` directly to `users` table
- **API Consolidation**: Teacher management operations now handled through user management endpoints
- **Database Migration Complete**: Dropped old tables and updated all storage methods to use new user-based teacher system

## Recent Changes (January 2025)

### Dual Authentication System (January 25, 2025)
- **Google OAuth Integration**: Implemented Google OAuth 2.0 alongside existing Replit Auth using passport-google-oauth20
- **Unified Login Page**: Created beautiful dual authentication login page at /login with both Replit and Google signin options  
- **Session Compatibility**: Both authentication methods work with the same role-based access system and session management
- **User Prefix System**: Google users get "google_" prefix in database to distinguish from Replit users while maintaining compatibility
- **Redirect URI Configuration**: Dynamically configured Google OAuth callback to match current Replit domain
- **Failed Login Handling**: Added dedicated /login-failed page for authentication error scenarios

### UI/UX Improvements (January 25, 2025)
- **Consistent Filter System**: Standardized FilterBar component across all management tabs with compact side-by-side layout
- **Pagination Implementation**: Added PaginatedTable component with 10 rows per page for improved loading performance
- **Enhanced Filter Interface**: Compact search field (w-64) alongside dropdown filters in single row layout
- **Universal Filter Standards**: All tabs now include Schools and Years filters consistently across Students, Teachers, Classes, and Groups
- **Result Count Display**: Added "X of Y items" count with clear filters functionality
- **Student Management Layout**: Specialized layout with search field on top, filter order (Schools, Classes, Years) with balanced proportional widths
- **Academic Year Format Consistency**: Standardized all academic year displays to use "/" format (2025/2026) instead of "-" format throughout the system

### Enhanced Student Management System
- **Expanded Student Database Schema**: Added comprehensive student fields including NSP, NIS, nickname, gender, school code, absence tracking, and flexible status management
- **Updated Student Management UI**: Complete redesign of student form with organized grid layout and comprehensive field validation
- **Enhanced Student List Table**: Now displays all new fields (NSP, NIS, Full Name, Nickname, Gender, Class, Group, School Code, Academic Year, No Absence, Status)
- **Improved Data Collection**: Forms now capture complete student information required for official school records
- **Status Management**: Added flexible status system (active, inactive, graduated, transferred) for better student lifecycle tracking

### Complete Teacher Data Implementation (January 25, 2025)
- **Real PENABUR Teacher Master Data**: Successfully populated 225 teachers from authentic PENABUR network teacher database
- **Teacher Assignment System**: Implemented new `teacher_assignments` table tracking teacher-school relationships by academic year
- **Academic Year Mobility**: Teachers can now move between schools year-to-year with complete assignment history
- **146 Current Assignments**: Created assignments for 140 unique teachers across 13 schools for 2025/2026 academic year
- **Database Schema Migration**: Updated storage layer to work with new teacher assignment structure, maintaining backward compatibility

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

## Admin Dashboard Features

### Student Management (CRUD)
- **Full CRUD Operations**: Create, read, update, and delete student records
- **Advanced Filtering**: Filter by academic year, class, and search by name
- **Status Management**: Toggle student active/inactive status with switches  
- **Comprehensive Details**: Student contact information, parent details, and academic year tracking
- **Bulk Operations**: Support for managing multiple students efficiently

### Teacher Management (CRUD)
- **Complete Teacher Profiles**: Full name, email, phone, and qualifications
- **Subject Assignment**: Multi-select subject teaching capabilities
- **Class Assignment**: Assign teachers to multiple classes with checkbox interface
- **Performance Tracking**: View student count per teacher and class assignments
- **Role-Based Access**: Secure admin-only access to teacher management

## SuperAdmin Dashboard Features

### Multi-Role User Management
- **Flexible Role Assignment**: Users can have multiple roles simultaneously (admin, teacher, parent, superadmin)
- **Dynamic Role Management**: Add/remove roles from users with real-time updates
- **Role-Based Navigation**: Sidebar displays combined menu items from all assigned roles
- **Multi-Role Authorization**: Authorization checks support multiple role validation

### Advanced Search and Filtering
- **User Search & Filter**: 
  - Real-time search by name or email
  - Filter by specific roles (superadmin, admin, teacher, parent)
  - Filter by school assignment
  - Filter by active/inactive status
  - Combine multiple filters for precise results
- **School Search & Filter**:
  - Search by school name, address, or principal name
  - Filter by active/inactive status
  - Real-time search with instant results
- **Visual Feedback**: Shows filtered count vs total count for transparency
- **Clear Filters**: One-click clear all filters functionality

### System-Wide Management
- **School Management**: Full CRUD operations for schools across the system
- **User Role Administration**: Comprehensive user and role management interface
- **System Statistics**: Overview of total schools, users, and students
- **Activity Monitoring**: Recent activity tracking and system health status

### Report Card Template System
- **Template Creation**: Design custom report card layouts with drag-and-drop components
- **Multiple Layouts**: Standard, detailed, compact, and portfolio-style templates
- **Configurable Sections**: Toggle student photo, radar charts, narrative comments, discipline reports, physical growth tracking, and teacher signatures
- **Grading Period Support**: Flexible terms, semesters, quarters configuration
- **Template Preview**: Live preview of report card appearance before deployment
- **Template Duplication**: Copy and modify existing templates for efficiency

### Report Card Components
- **Student Information**: Automatic population of student details and class information
- **Radar Chart Integration**: Side-by-side placement with student photos
- **Narrative Comments**: Teacher commentary sections below visual elements
- **Discipline Tracking**: Behavior, attendance, and punctuality reporting
- **Physical Growth**: Height, weight, and BMI monitoring
- **Digital Signatures**: Teacher e-signature with date validation
- **Custom Headers/Footers**: School branding and administrative messaging

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
- **Students**: Comprehensive student profiles with NSP, NIS, nickname, gender, school code, absence tracking, and status management
- **Classes**: Class management and organization
- **Student Groups**: Group management within classes for better organization
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