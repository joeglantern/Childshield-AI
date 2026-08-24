-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CHILD_REPORTER', 'TRIAGE_OFFICER', 'SUPERVISOR', 'DCS_LIAISON', 'ADMIN', 'AUDITOR');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('RECEIVED', 'TRIAGED', 'UNDER_REVIEW', 'REFERRED', 'IN_PROGRESS', 'CLOSED', 'REOPENED');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('WEB', 'WHATSAPP', 'USSD', 'SMS');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('GROOMING', 'SEXTORTION', 'BULLYING', 'SELF_HARM', 'COERCION', 'HARMFUL_EXPOSURE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReporterType" AS ENUM ('CHILD_SELF', 'PEER', 'CAREGIVER', 'PROFESSIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "AgeBand" AS ENUM ('UNDER_10', 'AGE_10_12', 'AGE_13_15', 'AGE_16_18', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CaseEventKind" AS ENUM ('CASE_CREATED', 'STATUS_CHANGED', 'AI_ASSESSMENT', 'SLA_WARNING', 'NOTE_ADDED', 'REFERRAL_CREATED', 'OVERRIDE_TRIGGERED');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'DISPATCHED', 'ACKNOWLEDGED', 'SLA_BREACHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "HashAlgorithm" AS ENUM ('SHA256', 'PDQ', 'MD5_LEGACY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "totpSecret" TEXT,
    "role" "Role" NOT NULL,
    "displayName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "caseCode" TEXT NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'RECEIVED',
    "severity" "Severity",
    "channel" "Channel" NOT NULL,
    "incidentType" "IncidentType" NOT NULL,
    "description" TEXT NOT NULL,
    "county" TEXT,
    "ageBand" "AgeBand" NOT NULL DEFAULT 'UNKNOWN',
    "reporterType" "ReporterType" NOT NULL DEFAULT 'CHILD_SELF',
    "consentVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "kind" "CaseEventKind" NOT NULL,
    "payload" JSONB NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentVersion" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "channel" "Channel" NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "partner" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "dispatchedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "seq" SERIAL NOT NULL,
    "actorId" TEXT,
    "actorType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeHash" TEXT,
    "afterHash" TEXT,
    "prevHash" TEXT NOT NULL,
    "entryHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaHash" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "algorithm" "HashAlgorithm" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaHash_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OverrideEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "thresholdConfig" JSONB,
    "childPreNotified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OverrideEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "recipientRef" TEXT NOT NULL,
    "safeContactVerified" BOOLEAN NOT NULL,
    "channel" "Channel" NOT NULL,
    "template" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Case_caseCode_key" ON "Case"("caseCode");

-- CreateIndex
CREATE INDEX "Case_status_severity_idx" ON "Case"("status", "severity");

-- CreateIndex
CREATE INDEX "Case_createdAt_idx" ON "Case"("createdAt");

-- CreateIndex
CREATE INDEX "CaseEvent_caseId_createdAt_idx" ON "CaseEvent"("caseId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentVersion_version_key" ON "ConsentVersion"("version");

-- CreateIndex
CREATE INDEX "ConsentRecord_caseId_idx" ON "ConsentRecord"("caseId");

-- CreateIndex
CREATE INDEX "Referral_caseId_idx" ON "Referral"("caseId");

-- CreateIndex
CREATE INDEX "Referral_status_idx" ON "Referral"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AuditLog_seq_key" ON "AuditLog"("seq");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "MediaHash_caseId_idx" ON "MediaHash"("caseId");

-- CreateIndex
CREATE INDEX "MediaHash_hash_algorithm_idx" ON "MediaHash"("hash", "algorithm");

-- CreateIndex
CREATE INDEX "OverrideEvent_caseId_idx" ON "OverrideEvent"("caseId");

-- CreateIndex
CREATE INDEX "NotificationLog_caseId_idx" ON "NotificationLog"("caseId");

-- AddForeignKey
ALTER TABLE "CaseEvent" ADD CONSTRAINT "CaseEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEvent" ADD CONSTRAINT "CaseEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ConsentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaHash" ADD CONSTRAINT "MediaHash_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OverrideEvent" ADD CONSTRAINT "OverrideEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OverrideEvent" ADD CONSTRAINT "OverrideEvent_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
