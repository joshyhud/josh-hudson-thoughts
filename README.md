# Thoughts

A PWA for uploading thoughts.

This project is built with [Astro](https://astro.build/) and uses [Supabase](https://supabase.com/) for authentication and for calling a Supabase Edge Function to publish a new “thought”. The intended workflow is:

1. Visit the home page to learn what the app is.
2. Log in with Supabase Auth (`/login`).
3. Create a new thought from the admin page (`/admin/new-thought`).
4. The app calls a Supabase Edge Function (`create-thought`) to publish the thought (the code suggests this creates/updates Markdown files for your GitHub Pages site).

## Features

- **Login** via Supabase Auth (email + password).
- **Protected admin page** that checks for an authenticated user and redirects to `/login` if not signed in.
- **Create a new thought** with:
  - Title
  - Publish date
  - Meta description
  - Body content
  - Optional hero image upload
- **Optional image upload** to Supabase Storage (bucket: `thought-images`).
- **Publishes via Supabase Edge Function**: calls `supabase.functions.invoke('create-thought', { body: payload })`.

## Tech stack

- Astro
- TypeScript
- SCSS (via `sass-embedded`)
- Supabase (`@supabase/supabase-js`)

## Requirements

- Node.js **>= 22.12.0** (see `package.json`).
- A Supabase project with:
  - Supabase Auth enabled (email/password sign-in)
  - A Storage bucket named **`thought-images`** (used for hero image uploads)
  - An Edge Function named **`create-thought`** (invoked when publishing)

## Environment variables

This app creates the Supabase client using **public** environment variables:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`

Create a `.env` file in the project root:

```bash
PUBLIC_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
```

> Note: These are intentionally public variables (Astro exposes `PUBLIC_` variables to the client).

## Setup

Clone and install dependencies:

```bash
git clone https://github.com/joshyhud/josh-hudson-thoughts.git
cd josh-hudson-thoughts
npm install
```

Add your `.env` file (see above), then start the dev server:

```bash
npm run dev
```

Astro will start the local server (typically at `http://localhost:4321`).

## Scripts

All commands run from the repo root:

- `npm run dev` — start the local dev server
- `npm run build` — build for production (output in `dist/`)
- `npm run preview` — preview the production build locally
- `npm run astro ...` — run Astro CLI commands

## Pages / routes

- `/` — Home page / project description
- `/login` — Login form (Supabase Auth)
- `/admin/new-thought` — Create and publish a thought (requires login)

## Supabase notes

### Storage bucket

The publish flow uploads images to a bucket named `thought-images` and uses a path like:

- `thought-images/<slug>-<timestamp>.<ext>`

Make sure that bucket exists and your policies allow uploads for authenticated users (or whichever access model you prefer).

### Edge Function (`create-thought`)

Publishing calls:

```js
supabase.functions.invoke("create-thought", { body: payload });
```

So you’ll need to have a Supabase Edge Function deployed with that name, and it should accept a JSON payload like:

```json
{
  "title": "...",
  "description": "...",
  "pubDate": "YYYY-MM-DD",
  "heroImage": "./img/filename.jpg",
  "tags": ["..."],
  "body": "...",
  "slug": "..."
}
```

## License

No license file is currently included in the repository. Add one if you plan to distribute or open-source this project.
