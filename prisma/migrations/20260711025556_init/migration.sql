-- CreateEnum
CREATE TYPE "ComponentType" AS ENUM ('GIVEN', 'FAMILY', 'PATRONYMIC', 'MATRONYMIC', 'NICKNAME', 'HONORIFIC', 'GENERATIONAL', 'RELIGIOUS', 'OTHER');

-- CreateEnum
CREATE TYPE "RequesterType" AS ENUM ('HOSPITAL', 'UNIVERSITY', 'EMPLOYER', 'GOVERNMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('NAME_RESOLUTION', 'PERMISSION_GRANT', 'PERMISSION_REVOKE');

-- CreateEnum
CREATE TYPE "AuditResult" AS ENUM ('SUCCESS', 'DENIED_NO_PERMISSION', 'DENIED_REQUESTER_INACTIVE', 'INVALID_CONTEXT', 'NOT_FOUND', 'ERROR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Context" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Context_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NameComponent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ComponentType" NOT NULL,
    "value" TEXT NOT NULL,
    "script" TEXT NOT NULL,

    CONSTRAINT "NameComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Identity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Identity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityNameComponent" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "nameComponentId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "IdentityNameComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requester" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "RequesterType" NOT NULL,
    "apiKeyHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Requester_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT,
    "userId" TEXT,
    "contextId" TEXT,
    "identityId" TEXT,
    "action" "AuditAction" NOT NULL,
    "result" "AuditResult" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Context_name_key" ON "Context"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Identity_userId_contextId_key" ON "Identity"("userId", "contextId");

-- CreateIndex
CREATE UNIQUE INDEX "IdentityNameComponent_identityId_position_key" ON "IdentityNameComponent"("identityId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "IdentityNameComponent_identityId_nameComponentId_key" ON "IdentityNameComponent"("identityId", "nameComponentId");

-- CreateIndex
CREATE UNIQUE INDEX "Requester_apiKeyHash_key" ON "Requester"("apiKeyHash");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_userId_requesterId_contextId_key" ON "Permission"("userId", "requesterId", "contextId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NameComponent" ADD CONSTRAINT "NameComponent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Identity" ADD CONSTRAINT "Identity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Identity" ADD CONSTRAINT "Identity_contextId_fkey" FOREIGN KEY ("contextId") REFERENCES "Context"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityNameComponent" ADD CONSTRAINT "IdentityNameComponent_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityNameComponent" ADD CONSTRAINT "IdentityNameComponent_nameComponentId_fkey" FOREIGN KEY ("nameComponentId") REFERENCES "NameComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "Requester"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_contextId_fkey" FOREIGN KEY ("contextId") REFERENCES "Context"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "Requester"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_contextId_fkey" FOREIGN KEY ("contextId") REFERENCES "Context"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
