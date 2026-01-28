# Kidosy MVP

A modern platform for discovering family-friendly activities and attractions.

## Tech Stack

### Frontend

- **React 18+** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **TanStack Router** - Client-side routing
- **TanStack Query** - Server state management
- **TanStack Form** - Form management
- **Zustand** - Client state management
- **shadcn/ui** - Accessible UI components
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Component primitives
- **Zod** - Schema validation
- **date-fns** - Date manipulation
- **Google Maps API** - Interactive maps

### Backend

- **Supabase** - PostgreSQL database, authentication, storage
- **Mailjet** - Transactional email service

### Development Tools

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Vitest** - Unit testing
- **TanStack DevTools** - Router & Query debugging

## Prerequisites

- Node.js 18+
- npm or yarn

## Getting Started

1. Clone the repository:

```bash
git clone <repository-url>
cd kidosy
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

4. Start the development server:

```bash
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Project Structure

```
src/
├── components/    # React components
│   └── ui/       # shadcn/ui components
├── lib/          # Utilities and helpers
├── assets/       # Static assets
└── App.tsx       # Main application component
```

## Documentation

- [Tech Stack Details](docs/tech-stack.md)
- [Product Requirements](docs/prd.md)

## License

Private - All rights reserved
