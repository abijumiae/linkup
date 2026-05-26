# LinkUp API

NestJS backend for [LinkUp](../).

## Stack

- NestJS + TypeScript
- PostgreSQL (Neon) + Prisma 7
- JWT authentication (bcrypt + Passport)

## Setup

```bash
npm install
cp .env.example .env   # set DATABASE_URL and JWT_SECRET
npm run prisma:generate
npm run prisma:migrate
```

## Development

```bash
npm run build
npm run start:dev
```

Server listens on `http://localhost:3000` (override with `PORT`).

## Routes

| Method | Path           | Auth     | Description              |
|--------|----------------|----------|--------------------------|
| GET    | `/`            | Public   | Welcome message          |
| GET    | `/health`      | Public   | Health check             |
| POST   | `/auth/signup` | Public   | Register a new user      |
| POST   | `/auth/login`  | Public   | Login, returns JWT       |
| GET    | `/auth/me`     | Bearer   | Current logged-in user   |
| GET    | `/users/me`    | Bearer   | Current user profile     |
| PATCH  | `/users/me`    | Bearer   | Update own profile       |
| POST   | `/posts`       | Bearer   | Create a post            |
| GET    | `/posts/feed`  | Bearer   | Latest 20 posts (feed)   |
| GET    | `/posts/me`    | Bearer   | Current user's posts     |
| DELETE | `/posts/:id`   | Bearer   | Delete own post          |

## Test auth (Postman, curl, or REST client)

### Test signup

`POST http://localhost:3000/auth/signup`

```json
{
  "name": "Sam Wilder",
  "username": "samwilder",
  "email": "sam@linkup.com",
  "password": "password123",
  "accountType": "PERSONAL",
  "country": "UAE",
  "language": "en"
}
```

Expected: `201` with `{ "user": { ... } }` (no `passwordHash`).

Duplicate email → `409` — `"Email already registered"`  
Duplicate username → `409` — `"Username already taken"`

### Test login

`POST http://localhost:3000/auth/login`

```json
{
  "email": "sam@linkup.com",
  "password": "password123"
}
```

Expected: `{ "accessToken": "...", "user": { ... } }` (no `passwordHash`).

### Test current user

`GET http://localhost:3000/auth/me`

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Expected: `{ "user": { ... } }` (no `passwordHash`).

Use the `accessToken` from the login response.

### Example curl

```bash
# Signup
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Sam Wilder","username":"samwilder","email":"sam@linkup.com","password":"password123","accountType":"PERSONAL","country":"UAE","language":"en"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sam@linkup.com","password":"password123"}'

# Me (replace TOKEN)
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer TOKEN"
```

### Test users profile APIs

`GET http://localhost:3000/users/me`

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Expected: `{ "user": { ... } }` (no `passwordHash`).

`PATCH http://localhost:3000/users/me`

```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

```json
{
  "name": "New Name",
  "username": "newusername",
  "country": "UAE",
  "language": "en",
  "avatarUrl": "https://example.com/avatar.png"
}
```

Expected: `{ "user": { ... } }` (no `passwordHash`).

### Test posts APIs

All posts routes require:

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

`POST http://localhost:3000/posts`

```json
{
  "content": "Hello from LinkUp!",
  "postType": "TEXT",
  "visibility": "PUBLIC",
  "imageUrl": "https://example.com/image.png",
  "videoUrl": "https://example.com/video.mp4"
}
```

`GET http://localhost:3000/posts/feed`

Returns the latest 20 posts with author info (`id`, `name`, `username`, `avatarUrl`, `accountType`, `isVerified`). No `passwordHash`.

`GET http://localhost:3000/posts/me`

Returns posts created by the logged-in user.

`DELETE http://localhost:3000/posts/:id`

Expected: `{ "message": "Post deleted successfully" }` (owner only).

### Example curl (posts)

```bash
# Create post
curl -X POST http://localhost:3000/posts \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello from LinkUp!","postType":"TEXT","visibility":"PUBLIC"}'

# Feed
curl http://localhost:3000/posts/feed \
  -H "Authorization: Bearer TOKEN"

# My posts
curl http://localhost:3000/posts/me \
  -H "Authorization: Bearer TOKEN"

# Delete post
curl -X DELETE http://localhost:3000/posts/POST_ID \
  -H "Authorization: Bearer TOKEN"
```

## Environment

| Variable       | Description                          |
|----------------|--------------------------------------|
| `DATABASE_URL` | Neon PostgreSQL connection string    |
| `JWT_SECRET`   | Secret for signing JWT access tokens   |

Never commit `.env` or log secrets.

### Neon connection troubleshooting (P1001)

Prisma 7 reads `DATABASE_URL` from **`.env`** via `prisma.config.ts` (do not put `url` in `schema.prisma` — Prisma 7 rejects it).

Your `.env` should look like:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
JWT_SECRET="change_this_to_a_strong_secret"
```

Check format (no secrets printed):

```bash
npm run db:check
```

If migrate fails with **P1001 Can't reach database server**:

1. Open [Neon Console](https://console.neon.tech) → your project → wait a few seconds (free tier may **sleep**).
2. **Connect** → copy a fresh **direct** connection string (not pooler) → paste into `.env` as `DATABASE_URL`.
3. Ensure the URL includes `sslmode=require` (and optionally `connect_timeout=30`).
4. Retry:

```bash
npx prisma db pull
npx prisma generate
npx prisma migrate dev --name add_posts
```

The `add_posts` migration SQL is already in `prisma/migrations/20250524120000_add_posts/`; once Neon is reachable, `migrate dev` or `migrate deploy` will create the `Post` table.

## Prisma

| Command | Description |
|---------|-------------|
| `npm run prisma:generate` | Regenerate client after schema changes |
| `npm run prisma:migrate` | Create/apply migrations in dev |
| `npm run prisma:studio` | Open Prisma Studio |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start with watch |
| `npm run build` | Generate Prisma client + compile |
| `npm test` | Unit tests |
| `npm run test:e2e` | End-to-end tests |
