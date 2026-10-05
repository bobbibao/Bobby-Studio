import { ImageJob, Prisma } from '@prisma/client';
import { JobStatus } from './contracts';

export type Tx = Prisma.TransactionClient;

/** Locks the job row for the rest of the transaction so cancel, claim and finalize serialize. */
export async function lockJob(tx: Tx, jobId: string): Promise<ImageJob | null> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "ImageJob" WHERE id = ${jobId} FOR UPDATE`;
  if (rows.length === 0) return null;
  return tx.imageJob.findUnique({ where: { id: jobId } });
}

/**
 * Conditional lifecycle transition. Returns the updated job, or null when the job was no longer in one
 * of the expected states (another writer won). stateVersion increases on every change; the database
 * also refuses any change of a terminal status.
 */
export async function transitionJob(
  tx: Tx,
  jobId: string,
  from: readonly JobStatus[],
  data: Prisma.ImageJobUpdateManyMutationInput & { status?: JobStatus },
): Promise<ImageJob | null> {
  const result = await tx.imageJob.updateMany({
    where: { id: jobId, status: { in: [...from] } },
    data: { ...data, stateVersion: { increment: 1 } },
  });
  if (result.count !== 1) return null;
  const job = await tx.imageJob.findUniqueOrThrow({ where: { id: jobId } });
  // One job per request: the request mirrors the job's public status.
  await tx.imageRequest.update({ where: { id: job.requestId }, data: { status: job.status } });
  return job;
}
