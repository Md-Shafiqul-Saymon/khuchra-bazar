# খুচরা বাজার - E-commerce Website

Fast-loading e-commerce website built with NestJS, EJS (SSR), Tailwind CSS, Alpine.js, and MongoDB Atlas.

## Quick Start

```bash
# Install dependencies
npm install

# Build Tailwind CSS
npm run tailwind:build

# Start development server (with hot reload)
npm run start:dev

# Or build and run for production
npm run build
npm run start:prod
```

The app runs at `http://localhost:3000`.

## Default Admin Login

- **URL**: `http://localhost:3000/admin/login`
- **Username**: `admin`
- **Password**: `admin123`

## Environment Variables

Copy `.env` and configure:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for JWT tokens |
| `ADMIN_USERNAME` | Initial admin username |
| `ADMIN_PASSWORD` | Initial admin password |
| `AWS_S3_BUCKET` | S3 bucket name (optional - uses local storage if empty) |
| `AWS_S3_REGION` | S3 region |
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `S3_BASE_URL` | Custom S3 base URL (optional) |
| `PORT` | Server port (default: 3000) |

## Tech Stack

- **Backend**: NestJS (TypeScript)
- **Frontend**: EJS templates (server-side rendered)
- **Styling**: Tailwind CSS v4
- **Interactivity**: Alpine.js
- **Database**: MongoDB Atlas (Mongoose ODM)
- **Media**: AWS S3 (with local fallback)

## Features

- Server-side rendered pages for fast initial load
- IP-based cart tracking (no login required)
- Cash on Delivery orders
- Admin panel with JWT authentication
- Product management with image uploads
- Order management with status tracking
- Category management
- Site settings management
- Mobile responsive design
- Bengali language UI
