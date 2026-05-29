-- Default onboarding complete for new local signups
ALTER TABLE "User" ALTER COLUMN "isOnboarded" SET DEFAULT true;

-- Ensure existing local email/password users skip onboarding
UPDATE "User" SET "isOnboarded" = true WHERE "provider" = 'local';
