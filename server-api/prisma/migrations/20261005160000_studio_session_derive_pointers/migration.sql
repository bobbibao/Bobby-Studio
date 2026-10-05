-- Active and pending jobs are derived from ImageJob state; the unused pointer columns are removed.
ALTER TABLE "StudioSession" DROP COLUMN "activeJobId", DROP COLUMN "pendingJobId";
