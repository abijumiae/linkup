# LinkUp

LinkUp is a full social platform with a NestJS backend and a Next.js frontend. It includes registration, login, posts, likes, comments, follows, notifications, messaging, groups, marketplace, jobs, events, and search/explore features.

## Tech Stack

- Backend: NestJS, Prisma, PostgreSQL (Neon-compatible)
- Frontend: Next.js, React, Tailwind CSS
- Database ORM: Prisma
- Authentication: JWT

## Local Setup

1. Clone the repository.
2. Install dependencies separately for backend and frontend.

## Backend Setup

1. Change into the backend folder:
   ```bash
   cd linkup_backend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Create a `.env` file from `.env.example`.
4. Run database migrations if needed:
   ```bash
   npm run prisma:migrate
   ```
5. Generate Prisma client and build the backend:
   ```bash
   npm run build
   ```
6. Start locally in development:
   ```bash
   npm run start:dev
   ```

## Backend Deployment

Render deployment settings:

- Root directory: `linkup_backend`
- Build command:
  ```bash
  npm install && npx prisma generate && npm run build
  ```
- Start command:
  ```bash
  npm run start
  ```
- Required environment variables:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `FRONTEND_URL`
  - `PORT`

For production deploys locally or elsewhere, build then start the compiled server:

```bash
cd linkup_backend
npm run build
npm run start:prod
```

Set `FRONTEND_URL` to the deployed frontend origin so CORS only allows your app domain, for example:

```bash
FRONTEND_URL="https://app.example.com"
```

## Frontend Setup

1. Change into the frontend folder:
   ```bash
   cd linkup_frontend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Create a `.env.local` file from `.env.example`.
4. Run the development server:
   ```bash
   npm run dev
   ```

## Frontend Deployment

Vercel deployment settings:

- Root directory: `linkup_frontend`
- Build command: `npm run build`
- Output: Next.js default
- Required environment variable:
  - `NEXT_PUBLIC_API_URL`

Set `NEXT_PUBLIC_API_URL` to your deployed backend URL in production.

## Prisma Commands

- Generate Prisma client:
  ```bash
  npm run prisma:generate
  ```
- Run migrations:
  ```bash
  npm run prisma:migrate
  ```
- Open Prisma Studio:
  ```bash
  npm run prisma:studio
  ```

## Environment Variables

- Backend: copy `linkup_backend/.env.example` to `linkup_backend/.env` and set your `DATABASE_URL`, `JWT_SECRET`, `PORT`, and `FRONTEND_URL`.
- Frontend: copy `linkup_frontend/.env.example` to `linkup_frontend/.env.local` and set `NEXT_PUBLIC_API_URL`.

> Never commit real `.env` or `.env.local` files. Keep secrets out of Git.

## GitHub Push Note

This repository has already been pushed to GitHub. Use the configured remote on future work:

```bash
git add .
git commit -m "Your message"
git push
```
