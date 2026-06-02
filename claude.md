# WappFlow (AiSennsy Clone) Project Context

## Overview
**WappFlow** is an advanced SaaS application designed as a clone of AiSennsy. It operates as a WhatsApp Marketing, CRM, and Chatbot automation platform. Users can broadcast campaigns, build conversational chatbot flows using a visual node editor, manage CRM contacts, and process Meta-approved templates.

## Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (with highly customized Swiss-style, editorial, minimalist aesthetics)
- **Icons:** Lucide-React
- **Database:** PostgreSQL managed via Prisma ORM
- **Authentication:** NextAuth.js (Session-based)
- **AI Integration:** Groq API (Llama 3.1) for Autoresponder and AI Conversational Flow Architect
- **State Management:** React Context (`AppContext.tsx`)

## Architecture & Directory Structure
- `src/app`: Next.js App Router routing logic, including API routes (`/api/whatsapp/`, `/api/chatbot/`, `/api/org/`).
- `src/features`: Domain-driven module structure.
  - `auth`: NextAuth configuration and login flows.
  - `dashboard`: Main workspace overview, system logs, editorial headers.
  - `customers`: CRM system, contact list, bulk tag management.
  - `campaigns`: WhatsApp broadcast engine, scheduling, delivery funnels, real-time metrics.
  - `templates`: Meta-approved message template builder with AI compliance auditor.
  - `chatbot`: Visual Drag-and-Drop Node builder for WhatsApp flows, auto-responder configurations.
  - `webhooks`: Inbound processing for WhatsApp message webhooks.
- `src/shared`: Shared context (`AppContext.tsx`), components (layout sidebars, navigation), and utilities (Prisma client instance).

## Core Features
1. **Visual Chatbot Builder (`ChatbotTab.tsx`):**
   - A custom drag-and-drop node canvas (Figma-like panning/zooming) to build conversational logic.
   - Node Types: `trigger`, `message`, `question`, `delay`.
   - Connected to PostgreSQL.
   - Users can toggle between "Visual Builder Engine" and "Pure AI Mode" (Autoresponder).
   - *AI Flow Architect:* Generates node layouts using Groq API prompts.

2. **Campaign Broadcasting (`CampaignsTab.tsx`):**
   - Send template-based broadcasts or 24-hour session free-form broadcasts.
   - Delay intervals for anti-spam.
   - Analytics funnel tracking (Sent -> Delivered -> Read -> Clicked).

3. **Template Management (`TemplatesTab.tsx`):**
   - Create Meta-compliant WhatsApp templates.
   - AI Compliance Auditor: Uses Groq to evaluate templates against Meta's guidelines before submission, ensuring 0% rejection rates.

4. **CRM & Customers (`CustomersTab.tsx`):**
   - Manage contacts, sync from Shopify/Webhooks.
   - Tag-based segmentation (Smart Folders).

## Design & Aesthetics
- **Swiss Editorial Style:** The UI relies heavily on sharp borders, `rounded-none`, off-white backgrounds (`bg-[#fafaf9]`), deep stark contrasts, and strict typography. It avoids generic "SaaS slop" (no heavy drop shadows, no rounded soft corners).
- **Mobile Responsive:**
  - Implements a fixed **Bottom Navigation Bar** on mobile devices.
  - Data tables (`overflow-x-auto`) and complex grids degrade gracefully.
  - The Chatbot Canvas works via a sliding bottom-sheet inspector on mobile screens to save visual real estate.

## Database Schema (Prisma)
- **Organization:** Multi-tenant architecture. Workspaces have `walletBalance`, `whatsappConnected`, and `chatbotBuilderEnabled` toggles.
- **User & Membership:** NextAuth integration linked to Organizations.
- **Contact:** CRM leads with `phone`, `tags`, `status`, `lastMessageTime`.
- **Campaign:** Broadcast logs tracking `sent`, `delivered`, `read`, `clicked`.
- **Template:** Meta templates with `category`, `mediaType`, `body`, `buttons`, `metaStatus`.
- **ChatbotNode:** Persisted visual flow state (`positionX`, `positionY`, `type`, `nextId`, `routes`).
- **SystemLog:** Chronological activity stream tracking user operations.

## Key Development Notes
- Prisma caching bug during hot-reloads is handled via a `globalForPrisma` bypass in `src/shared/lib/prisma.ts`.
- The webhook processing (`src/features/webhooks/api/whatsapp/process/route.ts`) handles incoming WhatsApp webhooks, routing them either through the Chatbot Nodes flow or the AI Autoresponder (Free-form AI) depending on the Organization's `chatbotBuilderEnabled` setting.
