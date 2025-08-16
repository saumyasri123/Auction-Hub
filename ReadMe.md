# Overview

AuctionHub is a real-time auction platform built with a modern full-stack architecture. The application enables users to participate in live auctions, place bids in real-time, and manage auction listings. It features role-based access control with buyers and sellers, real-time WebSocket communication for live bidding, and comprehensive auction management capabilities including counter-offers and automated invoice generation.


# System Architecture

## Frontend Architecture

The client-side is built with React Vite, utilizing a component-based architecture with shadcn/ui for the design system. The application uses Wouter for lightweight client-side routing and TanStack Query for server state management and caching. The frontend implements real-time features through WebSocket connections for live auction updates and bidding.

**Key Design Decisions:**
- **React with TypeScript**: Provides type safety and better developer experience
- **shadcn/ui Components**: Offers a consistent, accessible design system built on Radix UI primitives
- **Wouter Router**: Lightweight alternative to React Router with similar API but smaller bundle size
- **TanStack Query**: Handles server state synchronization, caching, and background updates
- **WebSocket Integration**: Custom WebSocket manager handles real-time auction events and bidding

## Backend Architecture

The server uses Express.js with Javascript. It implements a RESTful API design with WebSocket support for real-time features. The architecture follows a service-oriented pattern with separate services for auctions, emails, invoices, and Redis operations.

**Key Design Decisions:**
- **Express.js with Javascript**: Familiar framework with type safety
- **Service Layer Pattern**: Separates business logic into dedicated service classes (AuctionService, EmailService, InvoiceService)
- **WebSocket Integration**: Real-time bidding and auction state updates
- **Middleware-based Authentication**: JWT-based authentication with role-based access control

## Database and Storage

The application uses PostgreSQL as the primary database with Drizzle ORM for type-safe database operations. The schema supports multi-table relationships for users, auctions, bids, notifications, counter-offers, and invoices.

**Key Design Decisions:**
- **PostgreSQL with Neon**: Serverless PostgreSQL for scalability and ease of deployment
- **Drizzle ORM**: Type-safe SQL operations with excellent TypeScript integration
- **Database Schema**: Comprehensive schema with proper relationships and constraints using enums for status fields
- **Redis for Caching**: Handles real-time auction state, distributed locking, and session management

## Authentication and Authorization

JWT-based authentication system with role-based access control supporting buyer, seller, and admin roles. The system includes token validation, automatic token refresh, and secure session management.

**Key Design Decisions:**
- **JWT Tokens**: Stateless authentication with 24-hour expiration
- **Role-based Access**: Granular permissions based on user roles
- **Client-side Auth Manager**: Centralized authentication state management with automatic token validation

## Real-time Features

WebSocket implementation for live auction functionality including real-time bidding, auction state updates, and notifications. The system handles connection management, reconnection logic, and event broadcasting.

**Key Design Decisions:**
- **WebSocket Server**: Custom WebSocket implementation for real-time features
- **Event-driven Architecture**: Structured message handling for different auction events
- **Redis for State Management**: Distributed state management for auction status and participant tracking

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting with DATABASE_URL configuration
- **Upstash Redis**: Redis hosting for caching and real-time state management (optional UPSTASH_REDIS_URL)

## Email Services
- **SendGrid**: Email delivery service for notifications and confirmations (SENDGRID_API_KEY and SENDGRID_FROM_EMAIL)

## UI and Design
- **Radix UI**: Headless UI components for accessibility and customization
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library for consistent iconography

## File Processing
- **PDFKit**: PDF generation for invoice creation and document handling

