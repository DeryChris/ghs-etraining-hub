# System Architecture & UI/UX Design Specification: GHS-CPD Portal
**Target Audience:** AI Development Agents, Software Architects & Full-Stack Engineering Teams  
**Project Name:** Ghana Health Service Continuous Professional Development & Clinical Learning Portal (GHS-CPD)  
**Document Version:** 1.0.0 (Enterprise Production Spec)

---

## Executive Summary & Design Vision

The **Ghana Health Service CPD & Clinical Learning Portal (GHS-CPD)** is an enterprise-grade, role-based e-learning and clinical protocol distribution platform designed specifically for the healthcare workforce of Ghana. The platform serves as the central bridge between clinical practice, institutional guidelines, and professional regulatory compliance (verifying continuous education credits directly with regulatory bodies like the Nursing and Midwifery Council (NMC), Medical and Dental Council (MDC), and Pharmacy Council of Ghana).

### Zero-Generic UI/UX & Data Integrity Directives
* **No Generic Mock Data:** The platform code, database seeds, and interfaces must strictly use authentic Ghana Health Service metadata, facility names (*e.g., Korle Bu Teaching Hospital, Ridge Hospital, Komfo Anokye Teaching Hospital, Tamale Teaching Hospital*), staff ID patterns (*e.g., GHS-102938*), and council license formats (*e.g., NMC/RNR-2024-8849, MDC/PE-11029*).
* **Enterprise Health Aesthetic:** Visual design mirrors surgical clarity, using deep forest greens, warm government golds, and high-contrast typography, avoiding consumer-level "flashy" themes.

---

## 1. Global Technology Stack & Architecture

```
+-------------------------------------------------------------------------+
|                              FRONTEND SYSTEM                            |
|  Next.js 14+ (App Router)  |  React 18+  |  TypeScript  |  Tailwind CSS |
|  Radix UI / Shadcn         |  Framer Motion             |  Chart.js     |
+-------------------------------------------------------------------------+
                                    |
                                    v (GraphQL / REST API & WebSockets)
+-------------------------------------------------------------------------+
|                              BACKEND ENGINE                             |
|  Node.js (NestJS) / Go (FastAPI for AI pipelines)                       |
|  RBAC Middleware  |  Socket.io Realtime Service  |  Winston Logger      |
+-------------------------------------------------------------------------+
             |                                             |
             v                                             v
+--------------------------+                 +----------------------------+
|    POSTGRESQL DATABASE   |                 |     REDIS CACHE & PUBSUB   |
|  Users, RBAC, Categories,|                 |  Session Caching, Realtime |
|  Spaces, Audit Logs, CPD |                 |  Notifications & Messaging |
+--------------------------+                 +----------------------------+
```

### 1.1 Frontend Architecture
* **Framework:** Next.js (App Router) with React 18+ & TypeScript for end-to-end type safety.
* **Styling Engine:** Tailwind CSS with custom CSS variables powering an adaptive Dark/Light mode engine.
* **UI Component Primitives:** Radix UI / Shadcn UI for unstyled, accessible primitives (modals, dropdowns, popovers, tabs).
* **Animations:** Framer Motion for smooth drawer transitions, modal backdrops, and interactive state changes.
* **Data Visualization:** Chart.js / Recharts for administrative regional compliance charts, progress gauges, and radar mastery matrices.
* **Rich Text & PDF Engine:** Monaco Editor / PDF.js for rendering protocol documents and in-browser interactive clinical case exercises.

### 1.2 Backend Infrastructure
* **API Layer:** Node.js (NestJS) or Go REST/GraphQL microservices.
* **Realtime Engine:** WebSockets (Socket.io) handling direct messaging, live audit log feeds, and emergency broadcast dispatching.
* **Database Layer:** PostgreSQL (relational integrity for hierarchy, users, and audit logs) + Redis (session storage, real-time messaging, cache layer).
* **Authentication & RBAC:** NextAuth.js / Auth0 / Clerk integrated with custom Role-Based Access Control (RBAC) middleware verifying Staff ID and Council License validity.
* **Media Processing & Storage:** AWS S3 / CloudFront / Mux for HLS adaptive video streaming of clinical briefings and document downloads.

---

## 2. Design System & Visual Palette

The UI utilizes a modern glassmorphic enterprise aesthetic overlaying custom background meshes.

```
       GHS EMERALD GREEN                GHANA WARM GOLD                 SURGICAL CYAN
     [ #006B3F / #008E53 ]            [ #D97706 / #FCD116 ]            [ #0891B2 / #06B6D4 ]
   Primary Actions, Brands,        CPD Credit Badges, Accrual       Specialist Tags, Links,
    Accent Highlights, Nav           Alerts, Critical Banners        Interactive Indicators
```

### Color Variables Reference
* **Primary GHS Green:** `#006B3F` (Light variant: `#008E53`, Dark variant: `#004D2D`)
* **Ghana Gold:** `#D97706` (Accent variant: `#FCD116`)
* **Surgical Cyan:** `#0891B2` (Dark accent: `#06B6D4`)
* **Critical Warning Red:** `#DC2626`
* **Dark Mode Neutral Base:** `#070D16` (Cards: `rgba(15, 23, 42, 0.85)`, Borders: `rgba(255, 255, 255, 0.1)`)
* **Light Mode Neutral Base:** `#F8FAFC` (Cards: `#FFFFFF`, Borders: `rgba(0, 107, 63, 0.15)`)

---

## 3. Detailed Role-Based Access Control (RBAC) Matrix

```
                          RBAC PERMISSION MATRIX
+-----------------------------------------+---------+--------------+--------+
| System Operation                        | Learner | Facilitator  | Admin  |
+-----------------------------------------+---------+--------------+--------+
| Read Accredited Clinical Protocols      |    X    |      X       |   X    |
| Participate in Space Discussions (@tag) |    X    |      X       |   X    |
| Claim CPD Credits upon Module Finish   |    X    |      -       |   -    |
| Direct Message Assigned Facilitators   |    X    |      X       |   X    |
| Create & Manage Sub-Spaces (Assigned)   |    -    |      X       |   X    |
| Upload Protocols (PDF, Video, Text)     |    -    |      X       |   X    |
| Evaluate & Grade Submissions           |    -    |      X       |   X    |
| Create Main Categories & Sub-spaces     |    -    |      -       |   X    |
| Mutate User Roles & Manage Accounts     |    -    |      -       |   X    |
| View Immutable Security Audit Stream    |    -    |      -       |   X    |
| Dispatch Emergency System Broadcasts    |    -    |      -       |   X    |
| Access Regional Compliance Analytics    |    -    |      -       |   X    |
+-----------------------------------------+---------+--------------+--------+
```

---

## 4. User Journeys & Screen Specifications

### 4.1 Learner Workstation (Health Personnel)
* **CPD Accrual Progress Gauge:** Displays accrued credits versus required annual license renewal threshold (*e.g., 28 / 30 Points accrued*).
* **Accredited Category & Space Explorer:** Grid layout of clinical categories (*e.g., Maternal & Neonatal Health, Public Health*) and sub-spaces (*e.g., EmONC Protocol 2026, Cholera Triage*).
* **Multi-Format Protocol Reader:**
  * Tabbed layout for Protocol Text, PDF Annex with digital verification signatures, and Video Briefing.
  * Embedded threaded peer discussion forum with `@Facilitator` tagging, reply threading, and verified instructor badges.

### 4.2 Facilitator Workstation (Specialist Educator)
* **Assigned Spaces Overview:** Summary cards showing active cohorts, total personnel enrolled, and pending qualitative assessments.
* **Clinical Material Upload Wizard:** Form to publish documents, video links, or case studies, tagging them with accredited CPD point values.
* **Qualitative Assessment Review Queue:** Dedicated interface to review case study answers submitted by learners, assign passing scores, and issue verified CPD points.

### 4.3 Super Admin Control Panel (GHS HQ Directorate)
* **Regional CPD Compliance Chart:** Interactive Chart.js visualization mapping completion percentages across all 16 Ghana Health Service administrative regions.
* **Category & Space Tree Builder:** Drag-and-drop structural hierarchy builder to organize primary categories and child spaces.
* **RBAC User Directory:** Data table filtering personnel by Staff ID, Name, Facility, Region, and Council License Number. Allows role mutation (*e.g., promoting Learner to Facilitator*).
* **Immutable Security Audit Log:** Real-time event log recording all state changes with IP addresses, Staff IDs, action types, and resource targets.
* **Emergency Broadcast Dispatcher:** High-priority message generator that forces banner alerts onto active user sessions (*e.g., Disease Outbreak Directives*).

---

## 5. Comprehensive Data Model & Database Schema

```sql
-- ENUMS FOR SYSTEM ROLES AND MATERIAL TYPES
CREATE TYPE user_role AS ENUM ('LEARNER', 'FACILITATOR', 'ADMIN');
CREATE TYPE material_format AS ENUM ('PDF', 'VIDEO', 'TEXT_PROTOCOL', 'CASE_STUDY');
CREATE TYPE alert_severity AS ENUM ('CRITICAL_DIRECTIVE', 'PROTOCOL_UPDATE', 'MAINTENANCE');

-- USERS & PERSONNEL DIRECTORY
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'GHS-102938'
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'LEARNER',
    cadre_designation VARCHAR(150) NOT NULL, -- e.g., 'Senior Nursing Officer'
    council_license_no VARCHAR(100), -- e.g., 'NMC/RNR-2024-8849'
    facility_name VARCHAR(255) NOT NULL, -- e.g., 'Greater Accra Regional Hospital'
    region VARCHAR(100) NOT NULL, -- e.g., 'Greater Accra'
    accumulated_cpd_points INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CATEGORIES & SUBSPACES HIERARCHY
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    icon_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cpd_points_value INT NOT NULL DEFAULT 1,
    assigned_facilitator_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- MATERIALS & CLINICAL PROTOCOLS
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    format_type material_format NOT NULL,
    file_url TEXT,
    content_text TEXT,
    cpd_credits INT NOT NULL DEFAULT 1,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- THREADED DISCUSSION FORUM
CREATE TABLE discussion_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_post_id UUID REFERENCES discussion_posts(id) ON DELETE CASCADE, -- For nested threading
    content TEXT NOT NULL,
    tagged_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- USER PROGRESS & CPD ACCRUAL LOGS
CREATE TABLE cpd_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    points_awarded INT NOT NULL,
    verified_by UUID REFERENCES users(id),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_space_completion UNIQUE (user_id, space_id)
);

-- REALTIME DIRECT MESSAGING
CREATE TABLE direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SYSTEM BROADCAST ALERTS
CREATE TABLE broadcast_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    body_text TEXT NOT NULL,
    severity alert_severity NOT NULL,
    target_cadre VARCHAR(150) DEFAULT 'ALL',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- IMMUTABLE SECURITY AUDIT LOG TRAIL
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_staff_id VARCHAR(50) NOT NULL,
    action_type VARCHAR(100) NOT NULL, -- e.g., 'USER_ROLE_MUTATED', 'DISPATCH_BROADCAST'
    resource_target VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    location_details VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR ENTERPRISE PERFORMANCE
CREATE INDEX idx_users_staff_id ON users(staff_id);
CREATE INDEX idx_spaces_category ON spaces(category_id);
CREATE INDEX idx_materials_space ON materials(space_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_discussion_posts_space ON discussion_posts(space_id);
```

---

## 6. Implementation Checklist & Verification Directives

1. **Database Seeding:** Populate `users` with valid GHS Staff IDs (`GHS-XXXXXX`), Council Registration numbers (`NMC/RNR-XXXX-XXXX`, `MDC/PE-XXXXX`), and authentic regional health directorates.
2. **WebSocket Gateway Setup:** Configure namespaces for `/notifications`, `/chat`, and `/audit-stream` with authorization guards checking JWT tokens.
3. **Audit Log Interceptor:** Implement NestJS interceptor / Express middleware that captures every `POST`, `PUT`, `PATCH`, and `DELETE` operation, writing the IP address, Staff ID, and action parameters directly to `audit_logs`.
4. **Third-Party Regulatory Sync (Mock Adapter):** Construct an API service adapter that simulates credit synchronization with external registries (Nursing & Midwifery Council Ghana API and Medical & Dental Council API).
```

---

### Summary of Additions Included in Documentation:
1. **Full Relational PostgreSQL Schema:** Formatted with foreign keys, enums (`user_role`, `material_format`, `alert_severity`), unique constraints, and performance indexes.
2. **Global Architecture Diagrams:** Highlighting data flow from Next.js 14 through NestJS/Go down to PostgreSQL & Redis PubSub.
3. **Complete RBAC Permission Matrix:** Mapping functional privileges across Learners, Facilitators, and Super Admins.
4. **Verification Directive:** Clear rules for AI agents and engineering teams building backend APIs and database seeds.