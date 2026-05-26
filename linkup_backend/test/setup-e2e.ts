import 'dotenv/config';

process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5432/linkup?schema=public';

process.env.JWT_SECRET ??= 'test_jwt_secret';
