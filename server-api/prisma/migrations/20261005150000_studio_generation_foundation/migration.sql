-- AlterTable
ALTER TABLE "ImageJob" ADD COLUMN     "attemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "attemptId" TEXT,
ADD COLUMN     "cancellationRequestedAt" TIMESTAMP(3),
ADD COLUMN     "checkpoint" JSONB,
ADD COLUMN     "clientRevision" INTEGER,
ADD COLUMN     "creditCost" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deadlineAt" TIMESTAMP(3),
ADD COLUMN     "errorCode" TEXT,
ADD COLUMN     "executionFinishedAt" TIMESTAMP(3),
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "intent" TEXT NOT NULL DEFAULT 'final',
ADD COLUMN     "isSimulated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastEventSequence" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "result" JSONB,
ADD COLUMN     "retryOfJobId" TEXT,
ADD COLUMN     "runTokenHash" TEXT,
ADD COLUMN     "stage" TEXT,
ADD COLUMN     "stateVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "studioSessionId" TEXT,
ADD COLUMN     "userId" TEXT,
ALTER COLUMN "status" SET DEFAULT 'QUEUED',
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ImageRequest" ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "inputHash" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING',
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "reservedCredit" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "password" DROP NOT NULL;

-- CreateTable
CREATE TABLE "StudioSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "latestRevision" INTEGER NOT NULL DEFAULT 0,
    "activeJobId" TEXT,
    "pendingJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationOutbox" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseUntil" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenerationOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditReservation" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "retention" TEXT NOT NULL DEFAULT 'preview',
    "expiresAt" TIMESTAMP(3),
    "jobId" TEXT,
    "outputIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudioSession_userId_updatedAt_idx" ON "StudioSession"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "GenerationOutbox_publishedAt_nextAttemptAt_idx" ON "GenerationOutbox"("publishedAt", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationOutbox_jobId_eventType_key" ON "GenerationOutbox"("jobId", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "CreditReservation_jobId_key" ON "CreditReservation"("jobId");

-- CreateIndex
CREATE INDEX "CreditReservation_userId_status_idx" ON "CreditReservation"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_storageKey_key" ON "Asset"("storageKey");

-- CreateIndex
CREATE INDEX "Asset_ownerId_createdAt_idx" ON "Asset"("ownerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Asset_expiresAt_idx" ON "Asset"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_jobId_outputIndex_kind_key" ON "Asset"("jobId", "outputIndex", "kind");

-- CreateIndex
CREATE INDEX "ImageJob_userId_createdAt_id_idx" ON "ImageJob"("userId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "ImageJob_studioSessionId_clientRevision_idx" ON "ImageJob"("studioSessionId", "clientRevision");

-- CreateIndex
CREATE UNIQUE INDEX "ImageRequest_userId_idempotencyKey_key" ON "ImageRequest"("userId", "idempotencyKey");


-- Backfill: owner of existing jobs comes from their request.
UPDATE "ImageJob" j
SET "userId" = r."userId"
FROM "ImageRequest" r
WHERE j."requestId" = r.id AND j."userId" IS NULL;

-- Credits can never go negative, reserved or otherwise.
ALTER TABLE "User" ADD CONSTRAINT "User_reservedCredit_nonnegative" CHECK ("reservedCredit" >= 0);

-- Lifecycle vocabulary. NOT VALID keeps legacy rows from blocking the upgrade while
-- enforcing the constraint for every new or updated row.
ALTER TABLE "ImageJob" ADD CONSTRAINT "ImageJob_status_valid"
  CHECK ("status" IN ('PENDING', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')) NOT VALID;
ALTER TABLE "ImageJob" ADD CONSTRAINT "ImageJob_intent_valid" CHECK ("intent" IN ('preview', 'final'));
ALTER TABLE "CreditReservation" ADD CONSTRAINT "CreditReservation_status_valid"
  CHECK ("status" IN ('RESERVED', 'CAPTURED', 'RELEASED'));
ALTER TABLE "CreditReservation" ADD CONSTRAINT "CreditReservation_amount_nonnegative" CHECK ("amount" >= 0);

-- Defense in depth: terminal job states are absorbing for every writer, not only this application.
CREATE FUNCTION "image_job_terminal_guard"() RETURNS trigger AS $$
BEGIN
  IF OLD."status" IN ('COMPLETED', 'FAILED', 'CANCELLED') AND NEW."status" <> OLD."status" THEN
    RAISE EXCEPTION 'ImageJob % is already terminal (%)', OLD."id", OLD."status" USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ImageJob_terminal_guard"
  BEFORE UPDATE OF "status" ON "ImageJob"
  FOR EACH ROW EXECUTE FUNCTION "image_job_terminal_guard"();

-- A reservation, once captured or released, cannot change again.
CREATE FUNCTION "credit_reservation_terminal_guard"() RETURNS trigger AS $$
BEGIN
  IF OLD."status" IN ('CAPTURED', 'RELEASED') AND NEW."status" <> OLD."status" THEN
    RAISE EXCEPTION 'CreditReservation % is already settled (%)', OLD."id", OLD."status" USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "CreditReservation_terminal_guard"
  BEFORE UPDATE OF "status" ON "CreditReservation"
  FOR EACH ROW EXECUTE FUNCTION "credit_reservation_terminal_guard"();
