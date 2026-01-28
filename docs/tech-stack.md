# Tech Stack - Kidosy MVP

## 1. Frontend

### Framework & Language

- React 18+ – UI library
- TypeScript – Type safety
- Vite – Build tool & dev server (fast HMR, optimized bundles)

### Routing & State Management

- TanStack Router (React Router v6 alternative) – Client-side routing
- TanStack Query (React Query) – Server state management & data fetching
- Zustand – Client state management for simple global state

### Forms & Validation

- Zod – Schema validation
- TanStack Form – Form management with headless approach
- Server-side validation mirroring

### UI & Styling

- shadcn/ui – Pre-built, accessible components
- Tailwind CSS – Utility-first CSS framework
- Radix UI (underlying shadcn/ui) – Accessible component primitives

### Analytics & Tracking

- Google Analytics 4 (GA4) – Event tracking, user analytics
- gtag.js library for GA4 integration

### Additional Utilities

- TanStack Query built-in fetching – API communication
- Google Maps JavaScript API – Interactive map
- clsx/classnames – Conditional className handling
- date-fns – Date manipulation

### Testing (Recommended)

- Vitest – Unit testing (fast, Vite-native)
- Playwright – E2E testing

### Code Quality

- ESLint – Linting
- Prettier – Code formatting
- TypeScript strict mode – Type checking

### Development Tools

- Vite DevTools – Development debugging
- React DevTools – Browser extension
- TanStack DevTools (Router, Query) – State/routing debugging

---

## 2. Backend (Supabase)

### Database

- PostgreSQL (via Supabase) – Relational database
- Supabase Migrations – Version control for schema
- Prisma – Type-safe ORM layer

### Authentication & Authorization

- Supabase Auth – User authentication (email/password, OAuth via Google/Facebook)
- Row Level Security (RLS) – Database-level access control
- JWT tokens – Stateless authentication

### Real-time & APIs

- Supabase PostgREST – Auto-generated REST API
- Supabase Realtime – WebSocket subscriptions (optional, for future features)
- Edge Functions (optional) – Serverless functions for custom logic

### File Storage

- Supabase Storage – Object storage for images (offer gallery)
- CDN via Supabase – Image optimization & delivery

### Email Service (External)

- Mailjet API – Transactional email service
- Email templates – HTML templates for automated emails
  - Welcome email
  - Offer publication confirmation
  - Lead submission notifications
  - Password reset

### Security

- Supabase Security – Built-in firewalls, rate limiting
- CORS configuration – API access control
- API keys management – Service-to-service authentication
- Environment secrets – Sensitive data management

### Validation & Data Layer

- Zod (shared with frontend) – Schema validation on server
- Supabase Policies – Data access rules at database level

---

## 3. Infrastructure & Deployment

### CI/CD Pipeline

- GitHub Actions – Automated testing, linting, building
  - Lint: ESLint, TypeScript check, Prettier
  - Test: Vitest, React Testing Library
  - Build: Vite production build
  - Security: Dependency scanning, code scanning

### Docker & Containerization

- Docker – Container for app deployment
- Docker Compose (dev) – Local multi-container environment
- Dockerfile – Optimized production image
  - Node.js base image (Alpine for smaller size)
  - Multi-stage build (reduce final image size)
  - Health checks

### Hosting & Deployment

- DigitalOcean App Platform or Droplets – Container/VM hosting
  - App Platform: Simplest (auto-scaling, auto-deployment from GitHub)
  - Droplets: More control (Docker, Docker Swarm, or Kubernetes)
- DigitalOcean Container Registry – Store Docker images
- DigitalOcean Spaces (optional) – Alternative to Supabase Storage

### Reverse Proxy & Load Balancing

- Nginx (if on Droplets) – Reverse proxy, load balancing, SSL
- DigitalOcean Load Balancer (if scaling) – Distribute traffic

### SSL/TLS Certificate

- Let's Encrypt via Certbot – Free SSL certificates
- DigitalOcean managed certificates (App Platform) – Auto-renewal

### Monitoring & Logging

- DigitalOcean Monitoring – Resource metrics (CPU, memory, disk)
- Docker logs – Container output
- ELK Stack or Datadog (optional) – Centralized logging
- Sentry (optional) – Error tracking & reporting

### Database Backups

- Supabase automated backups – Daily snapshots
- Point-in-time recovery – Supabase feature

---

## 4. Development Environment

### Local Setup

- Node.js 18+ – Runtime
- npm or pnpm – Package manager (pnpm faster, better storage)
- Docker Desktop – Local Supabase instance (optional via docker-compose)
- Git – Version control

### Environment Configuration

- .env.local – Local environment variables (not committed)
- .env.example – Template for required variables
- Supabase local development (optional)

### Local Services

- Vite dev server – Frontend hot reload
- Supabase local CLI – Local auth, database, storage (optional)

---

## 5. Recommended Additions & Suggestions

### Error Handling & Monitoring

- Sentry – Error tracking, performance monitoring
  - Captures unhandled exceptions
  - Performance profiling
  - Release tracking

### Rate Limiting & Security

- Redis (optional via DigitalOcean) – Rate limiting, caching
- Helmet.js (if using Node middleware) – Security headers
- Supabase RLS + API policies – Database-level security

### Content Delivery

- Cloudflare CDN (optional) – Faster global distribution
  - Image optimization
  - Automatic cache invalidation
  - DDoS protection

### API Documentation

- OpenAPI/Swagger (optional) – Auto-generate API docs from Supabase schema
- Postman collection – API testing & documentation

### Caching Strategy

- Browser caching – TanStack Query caching
- Server caching – Redis (optional)
- CDN caching – Cloudflare or DigitalOcean
- Supabase caching headers – API response caching

### Email Queue & Retry Logic

- Bull Queue or Temporal (optional) – Async email jobs
- Email retry mechanism – Ensure delivery reliability

### Analytics & Logging

- Google Analytics 4 (GA4) – Already planned
- Custom event tracking – Lead submissions, offer views, filter usage
- Privacy compliance – GDPR consent handling

### Testing Strategy

- Unit tests – Business logic (validation, calculations)
- Component tests – UI components with React Testing Library
- Integration tests – API interactions with Supabase
- E2E tests – Full user flows (Playwright)

### Performance Optimization

- Image optimization – Next-gen formats (WebP), lazy loading
- Code splitting – Vite automatically handles this
- Tree-shaking – Remove unused code
- Lighthouse CI – Automated performance checks

### Accessibility

- axe-core (via React Testing Library) – Accessibility testing
- WAVE browser extension – Manual testing
- Target WCAG 2.1 AA – As per PRD requirements

### Database Specific

- Supabase Realtime (future) – Real-time notifications for new offers
- Full-text search – Supabase has built-in pg_search extension
- Geospatial queries – PostGIS extension (already in Supabase)

### Backup & Disaster Recovery

- GitHub as backup – Code version control
- Supabase automated backups – Daily snapshots
- DigitalOcean snapshots – VM/Droplet snapshots (if using Droplets)

---

## 6. Recommended GitHub Actions Workflows

### On Pull Request

- Lint: ESLint, Prettier check
- Type Check: TypeScript compiler
- Tests: Vitest, React Testing Library
- Build: Vite production build

### On Merge to Main

- All PR checks
- E2E tests (optional)
- Build Docker image
- Push image to DigitalOcean Container Registry
- Deploy to DigitalOcean

### Scheduled

- Dependency updates (Dependabot)
- Security scanning
- Database backups validation

---

## 7. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT (Browser)                        │
│  React + TypeScript + Vite + TanStack Router/Query          │
│  shadcn/ui + Tailwind + Zod + TanStack Form                 │
│  GA4 + Mapbox/Google Maps                                    │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTPS
┌──────────────────▼──────────────────────────────────────────┐
│             REVERSE PROXY / LOAD BALANCER (Nginx)            │
│  SSL/TLS + Rate Limiting + Compression                       │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│         BACKEND SERVICES (DigitalOcean/Docker)               │
│                                                               │
│  ┌─────────────────────────────────────────────────┐        │
│  │  Supabase (PostgreSQL + Auth + Storage + RLS)   │        │
│  │  - Database (PostGIS, pg_search)                │        │
│  │  - Authentication (JWT)                         │        │
│  │  - Storage (Images)                             │        │
│  │  - Realtime (WebSocket)                         │        │
│  └─────────────────────────────────────────────────┘        │
│                                                               │
│  ┌─────────────────────────────────────────────────┐        │
│  │  External Services                               │        │
│  │  - Mailjet (Email)                              │        │
│  │  - Google Analytics 4 (Tracking)                │        │
│  │  - Sentry (Error Monitoring) - Optional         │        │
│  │  - Redis (Caching) - Optional                   │        │
│  └─────────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│           CI/CD PIPELINE (GitHub Actions)                     │
│  Lint → Type Check → Test → Build → Push → Deploy            │
└──────────────────────────────────────────────────────────────┘
```

---

## 8. Implementation Timeline (Aligned with 6-week MVP)

- Week 1: Project setup, Vite + React, Supabase connection, auth setup
- Week 2: Database schema, Supabase RLS, form validation (Zod + TanStack Form)
- Week 3: UI components (shadcn/ui + Tailwind), TanStack Router setup
- Week 4: Map integration, filters, TanStack Query for data fetching
- Week 5: Email integration (Mailjet), GA4 tracking, moderation panel
- Week 6: Docker setup, GitHub Actions, DigitalOcean deployment, testing

---

## 9. Key Environment Variables

```
# Frontend (.env.local)
VITE_SUPABASE_URL=<supabase-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
VITE_GOOGLE_MAPS_API_KEY=<google-maps-key>
VITE_GA4_ID=<ga4-tracking-id>
VITE_MAILJET_PUBLIC_KEY=<mailjet-key> (for frontend submission)

# Backend (Docker / DigitalOcean)
SUPABASE_DB_PASSWORD=<secure-password>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
MAILJET_API_KEY=<mailjet-api-key>
MAILJET_API_SECRET=<mailjet-secret>
SENTRY_DSN=<sentry-dsn> (optional)
```

---

## Notes

- Supabase provides excellent PostgreSQL + Auth + Storage integration, reducing backend complexity
- DigitalOcean App Platform is ideal for MVP (simpler than manual Kubernetes)
- GitHub Actions is free for public/private repos, integrates seamlessly with GitHub
- Consider migrating to DigitalOcean App Platform instead of Droplets for easier scaling
- All suggested tools follow modern, community-driven best practices
