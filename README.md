# REPLY 199X — Dòng Chảy Hoài Niệm

Vietnamese retro event homepage built with Next.js App Router, React, strict TypeScript, Tailwind CSS v4 and ESLint. The homepage preserves the source sections, event information, merch links and REPLY 199X visual style.

## Run locally

Use Node.js 22 LTS (see `.nvmrc`) and npm. `SITE_URL` is used for sitemap and robots URLs in production.

```sh
npm ci
cp .env.example .env
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env`. If PowerShell blocks `npm.ps1`, use `npm.cmd` instead of `npm`.

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
- Keep credentials in `.env` and server-only modules. Only `NEXT_PUBLIC_` values are exposed to browsers. Set `SITE_URL` to your deployed origin before building for production.
- Ticket requests are submitted to `POST /api/ticket-requests` and recorded by the server in the organizer's fixed Google Sheets `Registrations` tab. Configure `GOOGLE_SHEETS_SPREADSHEET_ID` locally and provide Google Application Default Credentials through a secure local or deployment identity; the credential identity must be restricted to the intended spreadsheet. The Google client is lazy and is not initialized by tests or builds.
- For local ticket-request testing, `SITE_URL` must exactly match the browser origin (normally `http://localhost:3000`). Production must use the public origin and the proxy must preserve the browser `Origin` header; forwarded host/protocol headers are not trusted. Do not expose the public endpoint until the deployment identity, origin behavior, data access/retention, and host-level edge/WAF rate limiting and monitoring have been verified.
- Never put credential values or credential-file contents in tracked files or chat, and never reuse a revoked key. A recorded request is not a ticket reservation or purchase. Automated tests use a mocked Sheets boundary; no live sheet write is part of the test suite.
- Supabase Auth is the selected Google sign-in provider; ticket-order persistence and payments remain pending implementation and verification.
- Tailwind v4 uses CSS configuration in `src/styles/globals.css` and the PostCSS plugin, so no `tailwind.config.ts` is needed.
- The icon, robots file, and sitemap use Next.js metadata conventions rather than duplicating static files in `public/`.

## Checks and production

```sh
npm test
npm run check
npm run build
npm start
```

`test` runs the Vitest route and dialog tests with a mocked Sheets adapter. `check` runs repository-wide ESLint and generated route types plus TypeScript. The installed agent/harness scripts currently contain existing lint failures, so use `npx eslint src --max-warnings=0` to check application files, followed by `npm run typecheck` and `npm run build`. Run checks separately from the production build; Next.js 16 does not run ESLint during `next build`. Use `npm ci` for reproducible installs. Automated tests do not prove a durable Google Sheets write or the production proxy configuration.

## Supabase Google sign-in

Put `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in ignored `.env`, using plain `https://` without backslashes. Auth uses only the publishable key; an elevated secret is not required for sign-in. Restart the development server after changing environment values.

1. In Google Cloud Console, create an OAuth client of type **Web application**. Add `https://ozzsqzzabfvkzuzrlffh.supabase.co/auth/v1/callback` as an authorized redirect URI. Configure the consent screen and test users if the app is in testing.
2. In Supabase **Authentication → Sign In / Providers → Google**, enable Google and save the OAuth client ID and client secret there. Keep the Google client secret out of browser code and tracked files.
3. In Supabase **Authentication → URL Configuration**, use `http://localhost:3000` as the local Site URL and add the exact redirect `http://localhost:3000/api/auth/callback`. Add the exact HTTPS production callback when the production domain is selected; avoid wildcard redirects. Set local/production `SITE_URL` to the browser origin for that environment.
4. Start `npm run dev` and open `/auth/sign-in`. After Google consent the callback exchanges the PKCE code, stores the session in cookies, and returns to `/`. Revisit `/auth/sign-in` to see the authenticated email and sign out.

The app accepts sign-in and sign-out only through same-origin POST requests. The callback destination is fixed; query parameters cannot redirect to an external website. Session refresh runs on `/auth/*`; future protected order routes must verify identity and extend the refresh matcher. Reverse proxies must preserve the configured request origin. Auth responses must never be cached.

Google is currently disabled in the project's remote Auth settings (read-only check on 2026-11-13). Until configured, sign-in reports a generic setup failure. Automated tests exercise route handling with mocked Supabase; a real Google consent/session/logout walkthrough is still required.

Do not run the existing `supabase/migrations/202611130001_ticket_sales.sql` against a public project yet: it is an incomplete draft without RLS. The approved order/item/payment/outbox schema and ownership policies still require implementation and database integration tests. This auth foundation does not enable ticket payments.

Implementation references: [Supabase Next.js SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs) and [Google OAuth](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).
