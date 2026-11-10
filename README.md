# REPLY 199X — Dòng Chảy Hoài Niệm

Vietnamese retro event homepage built with Next.js App Router, React, strict TypeScript, Tailwind CSS v4 and ESLint. The homepage preserves the source sections, event information, merch links and REPLY 199X visual style.

## Run locally

Use Node.js 22 LTS (see `.nvmrc`) and npm. `SITE_URL` is used for sitemap and robots URLs in production.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env.local`. If PowerShell blocks `npm.ps1`, use `npm.cmd` instead of `npm`.

Open http://localhost:3000. Ticket sales are not open in the source information. Merch links to the organizer's external Google Form. The contact form only prepares a local message preview and opens the visitor's email app; this site does not send or save messages. The example endpoint is GET http://localhost:3000/api/hello and returns `{ "data": { "message": "Hello from EXE101!" } }`.

## Folder structure

```text
public/
  images/                 Static images served at /images/...
  fonts/                  Optional local font files
src/
  app/
    layout.tsx            Required root HTML layout and metadata
    (routes)/
      layout.tsx          Shared navigation and footer
      page.tsx            REPLY 199X home page at /
      _components/        Page sections and small interactive leaves
      _data/home.ts       Typed source content and image URLs
      _types/home.ts      Route-specific content shapes
    api/hello/route.ts    Example JSON route handler
    loading.tsx           Loading boundary
    error.tsx             Client error boundary with retry
    not-found.tsx         404 page
    icon.svg              Site icon
    robots.ts             Generates /robots.txt
    sitemap.ts            Generates /sitemap.xml
  components/             Reusable UI (Navbar, Footer, Button, Card)
  lib/                    Shared constants and utility functions
  styles/globals.css      Global styles and Tailwind theme
  types/                  Shared TypeScript contracts
```

## Architecture conventions

- Pages and layouts are Server Components by default. Add `"use client"` only where browser APIs, state, or event handlers are needed.
- `(routes)` is an organizational route group; it does not appear in URLs. Add `src/app/(routes)/about/page.tsx` for `/about`.
- Put HTTP handlers in `src/app/api/<resource>/route.ts`. Validate external input on the server before using it. The hello route is an example, not a database readiness check.
- Use `@/` imports for files under `src/`. Keep route-specific components beside their route; move shared UI into `components/`.
- Keep credentials in `.env.local` and server-only modules. Only `NEXT_PUBLIC_` values are exposed to browsers. Set `SITE_URL` to your deployed origin before building for production.
- Add a database module and domain types when the database and business model are selected. No database or authentication provider is assumed.
- Tailwind v4 uses CSS configuration in `src/styles/globals.css` and the PostCSS plugin, so no `tailwind.config.ts` is needed.
- The icon, robots file, and sitemap use Next.js metadata conventions rather than duplicating static files in `public/`.

## Checks and production

```sh
npm run check
npm run build
npm start
```

`check` runs repository-wide ESLint and generated route types plus TypeScript. The installed agent/harness scripts currently contain existing lint failures, so use `npx eslint src --max-warnings=0` to check application files, followed by `npm run typecheck` and `npm run build`. Run checks separately from the production build; Next.js 16 does not run ESLint during `next build`. Use `npm ci` for reproducible installs. No in-project automated browser test runner is included.
