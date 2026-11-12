# Technical Requirements & Architectural Blueprint: Ghana Health Service eLearning Network (GHS-ELN)

This document serves as the complete Product Requirements Document (PRD) and technical specification for autonomous AI development agents, security auditors, and engineering teams building the **Ghana Health Service eLearning Network (GHS-ELN)** optimized for **Vercel** serverless hosting and enterprise security standards.

---

## 1. System Overview & Domain Context

### 1.1 Platform Identity
* **System Name:** Ghana Health Service eLearning Network (GHS-ELN)
* **Domain:** Healthcare Continuous Professional Development (CPD), Clinical SOP Protocols, and Public Health Emergency Training.
* **Target Audience:** Medical Officers, Nurses, Midwives, Pharmacists, Laboratory Technologists, and Administrative Personnel across all 16 administrative regions of Ghana.

### 1.2 Organizational Hierarchy & Content Structure
Content within GHS-ELN follows a strict 3-tier taxonomy aligned with national health administration:

```
Platform Base
 └── Categories (GHS Directorates / National Health Programs)
      ├── Example: "Public Health Directorate" (Code: CAT-PHD)
      ├── Example: "Institutional Care Division" (Code: CAT-ICD)
      └── Subsections / Spaces (Specialized Clinical Units or Training Modules)
           ├── Space: "Infection Prevention & Control (IPC)"
           │    ├── Material 1: Standard SOP Document 2026 (PDF)
           │    └── Material 2: PPE Donning & Doffing Video (MP4)
           └── Space: "Cold Chain Logistics & Vaccine Maintenance"
                └── Material: Refrigeration Temperature Log Guideline
```

---

## 2. Technical Stack & Vercel Infrastructure

### 2.1 Core Stack Specifications
* **Frontend Framework:** Next.js 14+ (App Router architecture with React Server Components and Server Actions).
* **Styling & Design System:** Tailwind CSS with utility class merging (`clsx`, `tailwind-merge`), customized with a dark-mode default palette (Slate-950 background, Teal/Emerald primary accents, Rose/Amber priority indicators).
* **Animation & UI Components:** Framer Motion (page transitions, micro-interactions, layout morphing), Radix UI primitives / Shadcn UI components, Lucide React icons.
* **Data Visualization & Editors:** Recharts / Nivo for analytics charts, `@monaco-editor/react` for interactive code/scripting exercises, PDF rendering via `@react-pdf-viewer`.
* **Database & ORM:** PostgreSQL hosted on Supabase, accessed via **Prisma ORM**. Connection pooling managed via PgBouncer / Supabase Transaction Pooler (Port 6543) for Vercel serverless execution.
* **Authentication & Authorization:** Supabase Auth (`@supabase/ssr`) with HTTP-only cookies and Edge-compatible JWT verification.
* **Storage Infrastructure:** Supabase Storage Buckets with private access control and signed ephemeral URLs for PDF/Video material streaming.
* **Real-time Engine:** Supabase Realtime (WebSockets) powering notification broadcasts and direct user messaging.
* **Hosting Platform:** Vercel (Edge Functions, Middleware, Global CDN, Automated Git CI/CD).

---

## 3. Security & Role-Based Access Control (RBAC) Matrix

### 3.1 User Roles
1. **`SYSTEM_ADMIN` (System Administrator):** Central IT / Directorate leads. Holds global platform authority.
2. **`FACILITATOR` (Clinical Educator / Program Coordinator):** Regional or subject-matter experts assigned to specific Categories.
3. **`LEARNER` (GHS Healthcare Personnel):** Staff members accessing training materials, engaging in discussions, and submitting exercises.

### 3.2 Security & Operational Capability Matrix

| System Action / Resource | `SYSTEM_ADMIN` | `FACILITATOR` | `LEARNER` |
| :--- | :--- | :--- | :--- |
| **System User Management** (Create, Deactivate, Assign Roles) | Full Control | Read-Only (Assigned Roster) | Profile Self-Edit Only |
| **Category Creation & Configuration** | Full Control | Read-Only | Read-Only |
| **Category Facilitator Assignment** | Full Control | Denied | Denied |
| **Space Creation (Subsections)** | Any Category | Assigned Categories Only | Denied |
| **Material Upload & Version Control** | Platform-Wide | Assigned Spaces Only | Read / Download Only |
| **Threaded Commenting & Discussions** | Full Moderation | Moderation in Assigned Spaces | Create, Reply, Edit Own |
| **Direct Messaging** | All Users | Assigned Learners & Admins | Facilitators, Admins, Peers |
| **Audit Log Inspection** | Full System Logs | Assigned Space Logs Only | Denied |
| **System Maintenance Banners** | Broadcast Control | Denied | View Only |

---

## 4. Production Prisma Schema

Save the following schema into `prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum UserRole {
  SYSTEM_ADMIN
  FACILITATOR
  LEARNER
}

enum PriorityLevel {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum NotificationType {
  SYSTEM_MAINTENANCE
  MATERIAL_UPDATE
  SPACE_ANNOUNCEMENT
  COMMENT_REPLY
  DIRECT_MESSAGE
}

model User {
  id                String                 @id @default(uuid())
  ghsStaffId        String                 @unique // GHS Staff PIN (e.g., GHS-884920)
  email             String                 @unique
  fullName          String
  phone             String?
  role              UserRole               @default(LEARNER)
  directorate       String?                // e.g., "Institutional Care Division"
  region            String?                // e.g., "Greater Accra Region"
  facility          String?                // e.g., "Ridge Regional Hospital"
  isActive          Boolean                @default(true)
  createdAt         DateTime               @default(now())
  updatedAt         DateTime               @updatedAt

  // Relationships
  assignedCategories CategoryFacilitator[]
  createdSpaces      Space[]               @relation("SpaceCreator")
  createdMaterials   Material[]            @relation("MaterialAuthor")
  auditLogs          AuditLog[]
  comments           Comment[]
  sentMessages       DirectMessage[]       @relation("MessageSender")
  receivedMessages   DirectMessage[]       @relation("MessageRecipient")
  notifications      NotificationRecipient[]
  labSubmissions     LabSubmission[]
}

model Category {
  id          String                @id @default(uuid())
  code        String                @unique // e.g., "CAT-IPC-01"
  name        String                // e.g., "Infection Prevention & Control"
  description String?               @db.Text
  isArchived  Boolean               @default(false)
  createdAt   DateTime              @default(now())
  updatedAt   DateTime              @updatedAt

  spaces       Space[]
  facilitators CategoryFacilitator[]
}

model CategoryFacilitator {
  id         String   @id @default(uuid())
  categoryId String
  userId     String
  assignedAt DateTime @default(now())

  category Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([categoryId, userId])
}

model Space {
  id          String     @id @default(uuid())
  slug        String     @unique // e.g., "cold-chain-logistics"
  title       String     // e.g., "Cold Chain Maintenance & Protocol"
  description String?    @db.Text
  categoryId  String
  createdById String
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  category  Category   @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  createdBy User       @relation("SpaceCreator", fields: [createdById], references: [id])
  materials Material[]
}

model Material {
  id          String         @id @default(uuid())
  title       String
  summary     String?        @db.Text
  fileUrl     String?        // Supabase storage bucket object key
  mimeType    String?        // e.g., "application/pdf", "video/mp4"
  version     Int            @default(1)
  isPublished Boolean        @default(true)
  spaceId     String
  authorId    String
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  space    Space           @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  author   User            @relation("MaterialAuthor", fields: [authorId], references: [id])
  comments Comment[]
  labs     LabEnvironment[]
}

model LabEnvironment {
  id           String          @id @default(uuid())
  materialId   String          
  material     Material        @relation(fields: [materialId], references: [id], onDelete: Cascade)
  instructions String          @db.Text
  starterCode  String          @db.Text
  language     String          // e.g., "javascript", "python", "json"
  submissions  LabSubmission[]
}

model LabSubmission {
  id        String         @id @default(uuid())
  labId     String
  lab       LabEnvironment @relation(fields: [labId], references: [id], onDelete: Cascade)
  userId    String
  user      User           @relation(fields: [userId], references: [id])
  code      String         @db.Text
  passed    Boolean
  createdAt DateTime       @default(now())
}

model Comment {
  id         String    @id @default(uuid())
  content    String    @db.Text
  materialId String
  authorId   String
  parentId   String?   // Self-referential thread link
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  material Material  @relation(fields: [materialId], references: [id], onDelete: Cascade)
  author   User      @relation(fields: [authorId], references: [id])
  parent   Comment?  @relation("ThreadReplies", fields: [parentId], references: [id], onDelete: Cascade)
  replies  Comment[] @relation("ThreadReplies")
}

model DirectMessage {
  id          String   @id @default(uuid())
  senderId    String
  recipientId String
  body        String   @db.Text
  isRead      Boolean  @default(false)
  createdAt   DateTime @default(now())

  sender    User @relation("MessageSender", fields: [senderId], references: [id])
  recipient User @relation("MessageRecipient", fields: [recipientId], references: [id])
}

model Notification {
  id        String           @id @default(uuid())
  title     String
  body      String           @db.Text
  type      NotificationType
  priority  PriorityLevel    @default(MEDIUM)
  linkUrl   String?
  createdAt DateTime         @default(now())

  recipients NotificationRecipient[]
}

model NotificationRecipient {
  id             String       @id @default(uuid())
  notificationId String
  userId         String
  isRead         Boolean      @default(false)
  readAt         DateTime?

  notification Notification @relation(fields: [notificationId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([notificationId, userId])
}

model AuditLog {
  id          String   @id @default(uuid())
  userId      String
  action      String   // e.g., "CATEGORY_CREATED", "USER_ROLE_UPDATED"
  entity      String   // e.g., "Category", "User", "Material"
  entityId    String
  metadata    Json?    // Detailed diff snapshot
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}
```

---

## 5. Security-Hardened Vercel Directory Architecture

This project layout uses the `src/` directory convention to isolate application code from top-level config files. It uses `server-only` guards to prevent database credentials or internal utilities from bundling into client code.

```
ghs-elearning-platform/
├── .env.example                     # Safe template for required environment variables
├── .env.local                       # Local environment overrides (gitignored)
├── .eslintrc.json                   # Linter rules enforcing security practices
├── .gitignore                       # Ensures secrets, build artifacts, and node_modules stay out of Git
├── middleware.ts                    # Edge Middleware for Session Auth & RBAC Route Guarding
├── next.config.mjs                  # Security Headers (CSP, HSTS, X-Frame-Options) & Image Domain Allowlist
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
│
├── prisma/
│   ├── migrations/                  # Version-controlled DB migrations
│   ├── schema.prisma                # Enterprise Data Model
│   └── seed.ts                      # Idempotent DB Seeder for GHS Directorates & Initial Admin
│
├── public/                          # Static assets served via Vercel Edge CDN
│   ├── assets/
│   │   ├── branding/                # GHS Insignia & official crests
│   │   └── icons/
│   └── favicon.ico
│
└── src/
    ├── app/                         # Next.js App Router Structure
    │   ├── (auth)/                  # Public Auth Route Group
    │   │   ├── login/
    │   │   │   └── page.tsx
    │   │   ├── forgot-password/
    │   │   │   └── page.tsx
    │   │   └── layout.tsx
    │   │
    │   ├── (dashboard)/             # Protected Application Route Group
    │   │   ├── layout.tsx           # Global Shell (Sidebar, Header, Realtime Alerts)
    │   │   ├── page.tsx             # Dynamic Dashboard Redirector based on User Role
    │   │   │
    │   │   ├── admin/               # SYSTEM_ADMIN Restricted Space
    │   │   │   ├── audit-logs/
    │   │   │   │   └── page.tsx     # Enterprise Audit Inspection Matrix
    │   │   │   ├── categories/
    │   │   │   │   └── page.tsx     # Directorate & Space Configuration
    │   │   │   └── users/
    │   │   │       └── page.tsx     # GHS Personnel Access & Role Provisioning
    │   │   │
    │   │   ├── facilitator/         # FACILITATOR Restricted Space
    │   │   │   └── assigned-categories/
    │   │   │       └── page.tsx
    │   │   │
    │   │   ├── directorates/        # Core Content Spaces (Accessible to authenticated personnel)
    │   │   │   └── [categorySlug]/
    │   │   │       ├── page.tsx
    │   │   │       └── [spaceSlug]/
    │   │   │           └── page.tsx
    │   │   │
    │   │   ├── messages/            # Direct User-to-User Communication
    │   │   │   └── page.tsx
    │   │   │
    │   │   └── analytics/           # Personal CPD & Regional Learning Velocity Analytics
    │   │       └── page.tsx
    │   │
    │   ├── api/                     # Edge & Serverless API Endpoints
    │   │   ├── audit/
    │   │   │   └── route.ts
    │   │   ├── categories/
    │   │   │   └── route.ts
    │   │   ├── materials/
    │   │   │   └── route.ts
    │   │   ├── notifications/
    │   │   │   └── route.ts
    │   │   └── spaces/
    │   │       └── route.ts
    │   │
    │   ├── error.tsx                # Secure Error Boundary (Hides internal stack traces)
    │   ├── global-error.tsx
    │   ├── globals.css              # Custom Tailwind directives & CSS variables
    │   ├── layout.tsx               # Root Layout (Fonts, Metadata, Analytics)
    │   └── not-found.tsx
    │
    ├── components/                  # UI Components Layer
    │   ├── analytics/               # Visual Data Components (Recharts wrapper)
    │   │   ├── completion-chart.tsx
    │   │   └── user-activity-graph.tsx
    │   ├── layout/                  # Structural UI Elements
    │   │   ├── header.tsx
    │   │   ├── notification-center.tsx
    │   │   └── sidebar.tsx
    │   ├── materials/               # Domain Material Components
    │   │   ├── discussion-thread.tsx
    │   │   ├── lab-environment.tsx  # Monaco Editor Integration
    │   │   └── pdf-viewer.tsx
    │   └── ui/                      # Primitive Design Components (Shadcn/Radix)
    │       ├── badge.tsx
    │       ├── button.tsx
    │       ├── data-table.tsx
    │       ├── dialog.tsx
    │       └── toast.tsx
    │
    ├── lib/                         # Application Services & Business Logic
    │   ├── server/                  # STRICTLY SERVER-ONLY MODULES
    │   │   ├── audit-logger.ts      # Immutable audit trail logger ('import server-only')
    │   │   ├── prisma.ts            # Prisma Client singleton ('import server-only')
    │   │   └── rbac-guards.ts       # Server-side capability validators ('import server-only')
    │   │
    │   ├── client/                  # Safe Client-Side Helpers
    │   │   └── supabase-browser.ts  # Supabase client for browser state & WebSockets
    │   │
    │   └── security/                # Security Utilities
    │       ├── csrf.ts              # CSRF protection helpers
    │       ├── rate-limit.ts        # In-memory/Vercel KV Rate Limiter
    │       └── sanitization.ts      # XSS Input Sanitizer for discussion threads
    │
    └── types/                       # Shared TypeScript Interfaces
        ├── audit.ts
        ├── ghs.ts
        └── index.d.ts
```

---

## 6. Edge Security & Vercel Best Practices

### 6.1 Edge Middleware Authentication & RBAC (`middleware.ts`)
Place `middleware.ts` at the root directory. This runs on Vercel Edge Nodes before requests hit Server Components or API Routes.

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // 1. Unauthenticated User Protection
  if (!user && !pathname.startsWith("/login") && !pathname.startsWith("/forgot-password")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 2. Role-Based Route Protection
  if (user) {
    const userRole = user.user_metadata?.role as string;

    if (pathname.startsWith("/admin") && userRole !== "SYSTEM_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard?error=unauthorized", request.url));
    }

    if (pathname.startsWith("/facilitator") && userRole !== "FACILITATOR" && userRole !== "SYSTEM_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard?error=unauthorized", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

### 6.2 Security Headers Configuration (`next.config.mjs`)
Configure security headers in Next.js to protect against XSS, clickjacking, and MIME sniffing attacks on Vercel:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // Prevents fingerprinting framework identity
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### 6.3 Server-Side Execution Guarding (`src/lib/server/prisma.ts`)
To prevent sensitive server modules from leaking into client-side JS bundles, use the `server-only` package:

```typescript
import 'server-only';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

---

## 7. Environment Variables & Secret Isolation

Set up environment variables in your Vercel Project Settings as follows:

| Environment Variable | Target Scope | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | Production / Preview | **Pooled Connection** (Supabase Transaction Pooler - Port 6543) |
| `DIRECT_URL` | Build Time | **Direct Connection** (Supabase Session Pooler - Port 5432 for Prisma Migrations) |
| `NEXT_PUBLIC_SUPABASE_URL` | Client & Server | Supabase API Endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client & Server | Supabase Public Anonymous Key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server Only** | Supabase Admin Key (Never expose to client or use `NEXT_PUBLIC_`) |

---

## 8. Step-by-Step AI Execution Plan

AI Agents implementing this platform should follow this sequential execution order:

### Phase 1: Infrastructure Setup & Schema Migration
1. Initialize Next.js project using `src/` layout: `npx create-next-app@latest --typescript --tailwind --eslint --app --src-dir`.
2. Install Prisma and `@prisma/client`. Save the schema from **Section 4** to `prisma/schema.prisma`.
3. Run `npx prisma db push` to generate database tables in Supabase.
4. Create server-side guarded database instances (`src/lib/server/prisma.ts`).

### Phase 2: Security Header & Edge Auth Setup
1. Implement `middleware.ts` at project root for Edge auth checks and route protection.
2. Update `next.config.mjs` with security headers and image remote domain definitions.
3. Install `@supabase/ssr` and build client/server helper functions.

### Phase 3: Administrative Core & Audit Logging
1. Build `SYSTEM_ADMIN` User Management interface (`src/app/(dashboard)/admin/users`).
2. Build Category CRUD operations (`src/app/(dashboard)/admin/categories`).
3. Attach `logAuditEvent()` service to every mutating API endpoint.
4. Construct Audit Log Inspection interface (`src/app/(dashboard)/admin/audit-logs`).

### Phase 4: Facilitator Workspaces & Content Delivery
1. Build Facilitator Space management interfaces restricted to assigned categories (`src/app/(dashboard)/facilitator`).
2. Implement file upload pipeline to Supabase Storage for PDFs and media modules using signed URLs.
3. Construct Space detail page (`src/app/(dashboard)/directorates/[categorySlug]/[spaceSlug]`).

### Phase 5: Interactive Components & Messaging
1. Build Learner Dashboard (`src/app/(dashboard)/page.tsx`) with dynamic metrics.
2. Build `DiscussionThread` component with nested replies, sanitization, and GHS identity badges.
3. Integrate Monaco Editor for interactive practical labs (`LabEnvironment`).
4. Build Direct Messaging interface (`src/app/(dashboard)/messages`) powered by Supabase WebSockets.

---

## 9. Verification & QA Checklists

### 9.1 Security & RBAC QA
* **Edge Interception:** Verify that an unauthenticated user attempting to navigate to `/admin` or `/dashboard` is immediately redirected to `/login` at the Vercel Edge tier.
* **Leak Prevention:** Verify that importing `src/lib/server/prisma.ts` into a client component triggers a build-time compilation error.
* **Audit Trail Integrity:** Confirm that creating, updating, or deleting any record creates a corresponding entry in the `AuditLog` table containing user identity, entity type, diff snapshot, and client IP.

### 9.2 Vercel Deployment Verification
* **Connection Limits:** Verify that Serverless API calls consume connections via PgBouncer (`DATABASE_URL` using port 6543) without throwing `too many connections` errors under concurrent request stress.
* **Build Success:** Verify zero TypeScript compilation errors or missing `server-only` directive warnings during `npm run build`.