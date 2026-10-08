-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'CONTENT_EDITOR', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "emailVerified" TIMESTAMPTZ(3),
    "name" VARCHAR(120),
    "image" VARCHAR(2048),
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");
