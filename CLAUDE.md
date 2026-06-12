# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (hot reload)
npm run start:dev

# CSS (run alongside start:dev in a separate terminal)
npm run tailwind:watch

# Production build
npm run tailwind:build && npm run build

# Run production build
npm run start:prod

# Vercel deployment build (runs both steps)
npm run vercel-build
```

Tailwind CSS must be built separately — changes to `src/styles/input.css` or template class usage require `tailwind:build` (or `tailwind:watch` in dev). The compiled output lives at `public/css/output.css` and is committed.

There are no automated tests in this project.

## Architecture

**خুچরা বাজার** is a Bengali-language e-commerce site. NestJS serves both an API and server-side rendered EJS pages. MongoDB Atlas is the database via Mongoose.

### Module layout (`src/modules/`)

| Module | Role |
|---|---|
| `view/` | Two SSR controllers: `ViewController` (storefront routes) and `AdminViewController` (admin panel routes under `/admin`) |
| `product/` | CRUD + slug generation; products have a `nameEn` field used for slugs (falls back to `name`) |
| `category/` | Category CRUD; products reference categories by ObjectId |
| `cart/` | IP-address-based cart — no user login required; IP read from `x-forwarded-for` then `req.ip` |
| `order/` | Cash-on-delivery orders; status tracking |
| `admin/` | JWT authentication (stored in cookies); `JwtAuthGuard` protects admin routes |
| `upload/` | Two services — see below |
| `settings/` | Singleton site settings document (banner images, contact info, Meta Pixel ID) |

### Upload / image URL services

**`UploadService`** handles writes: uploads to `public/uploads/` locally when `AWS_S3_BUCKET` is empty, otherwise to S3. It always keeps a local copy alongside the S3 object.

**`S3ImageUrlService`** handles reads: for any stored image URL it tries to serve from the local `public/` directory first; if missing it backfills from S3 to disk (deduplicates concurrent requests), and only falls back to a presigned S3 URL if local backfill fails. Local-first serving avoids signed URL expiry issues on Vercel.

### Views (`views/`)

- `views/pages/` — storefront EJS pages (home, product-detail, cart, checkout, search, category, order-success, 404)
- `views/admin/` — admin panel pages
- `views/partials/` — shared storefront fragments (header, footer, product-card)
- `views/admin/partials/` — admin sidebar and end fragment

Alpine.js is loaded from CDN and used for client-side interactivity in EJS templates.

### Deployment

The site deploys to Vercel as a serverless function. `api/index.js` is the entry point — it lazily initialises the NestJS app and forwards requests. `vercel.json` routes all traffic through it. The build step (`vercel-build`) compiles Tailwind then TypeScript into `dist/`.

## Environment variables

Copy `.env.example` to `.env`. Key variables:

| Variable | Notes |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Long random string |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Seeded on first run |
| `AWS_S3_BUCKET` | Leave empty to use local `public/uploads/` storage |
| `AWS_S3_PUBLIC_READ` | Set `true` only if bucket ACLs are enabled; leave false and use a bucket policy for "Bucket owner enforced" buckets |
| `S3_BASE_URL` | Optional custom CDN base URL (virtual-hosted style: `https://bucket.s3.region.amazonaws.com`) |
| `META_PIXEL_ID` | Can also be set via Admin → Settings (stored in DB, takes precedence) |
