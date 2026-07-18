# Albums Anonymous

Mobile-first web app for the Albums Anonymous music comedy podcast — stream original parody songs for free, no login required; log in to download.

## Stack

- Next.js (App Router) + Tailwind CSS
- Prisma ORM against a Postgres database (built for Vercel Postgres)
- Clerk for authentication, gating only the download flow
- `content/songs.json` as a lightweight CMS, synced into the database via a seed script

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` — a Vercel Postgres connection string (Vercel dashboard -> Storage, or `vercel env pull`)
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` — from your Clerk dashboard
3. Apply the schema and seed sample data:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
4. Run the dev server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Adding tracks, artists, categories

Edit `content/songs.json` (artists, genres, categories, songs), then re-run:

```bash
npm run db:seed
```

The seed script upserts by slug, so re-running it is always safe. Audio/download files referenced by `audioUrl`/`downloadUrl` can point to files in `public/` or an external URL/CDN.

## Project structure

- `content/songs.json` — CMS content
- `prisma/schema.prisma` — data model (Artist, Genre, Category, Song)
- `prisma/seed.ts` — syncs `content/songs.json` into Postgres
- `src/app` — pages and route handlers
- `src/components` — UI (audio player, song card, search/filter, download button)
- `src/lib` — Prisma client and data-fetching helpers

## Notes

- Next.js 16 renamed Middleware to **Proxy**: auth runs from `src/proxy.ts`, not `middleware.ts`.
- Prisma 7 generates its client into `src/generated/prisma` (gitignored, regenerated via `postinstall`/`prisma generate`) and requires a driver adapter (`@prisma/adapter-pg`) rather than reading `DATABASE_URL` implicitly.
