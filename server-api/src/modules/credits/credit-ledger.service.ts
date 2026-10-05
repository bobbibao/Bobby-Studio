import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreditBalance } from '../../application/generation/contracts';

type Tx = Prisma.TransactionClient;

/**
 * Credit effects for generation jobs. Every method that changes money takes the caller's
 * transaction, so a reservation, capture or release commits atomically with the job transition
 * that causes it. Each job has exactly one financial effect (RESERVED -> CAPTURED | RELEASED);
 * the reservation row's unique jobId plus conditional updates make duplicates no-ops.
 */
@Injectable()
export class CreditLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalance(userId: string): Promise<CreditBalance> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { freeCredit: true, usedFreeCredit: true, paidCredit: true, usedPaidCredit: true, reservedCredit: true },
    });
    if (!user) return { available: 0, reserved: 0 };
    const total = user.freeCredit - user.usedFreeCredit + (user.paidCredit - user.usedPaidCredit);
    return { available: Math.max(0, total - user.reservedCredit), reserved: user.reservedCredit };
  }

  /** Atomically holds credits; false when the available balance is insufficient (no overspend). */
  async reserve(tx: Tx, userId: string, jobId: string, amount: number): Promise<boolean> {
    if (amount > 0) {
      const updated = await tx.$executeRaw`
        UPDATE "User"
        SET "reservedCredit" = "reservedCredit" + ${amount}
        WHERE id = ${userId}
          AND ("freeCredit" - "usedFreeCredit" + "paidCredit" - "usedPaidCredit" - "reservedCredit") >= ${amount}`;
      if (updated === 0) return false;
    }
    await tx.creditReservation.create({ data: { jobId, userId, amount } });
    return true;
  }

  /** Converts the hold into usage, free credits first. Returns null when already settled. */
  async capture(tx: Tx, jobId: string): Promise<{ amount: number; free: number; paid: number } | null> {
    const settled = await tx.$queryRaw<Array<{ userId: string; amount: number }>>`
      UPDATE "CreditReservation" SET status = 'CAPTURED', "updatedAt" = now()
      WHERE "jobId" = ${jobId} AND status = 'RESERVED'
      RETURNING "userId", amount`;
    if (settled.length === 0) return null;
    const { userId, amount } = settled[0];
    if (amount === 0) return { amount, free: 0, paid: 0 };

    const [user] = await tx.$queryRaw<Array<{ freeCredit: number; usedFreeCredit: number }>>`
      SELECT "freeCredit", "usedFreeCredit" FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const free = Math.min(Math.max(0, user.freeCredit - user.usedFreeCredit), amount);
    const paid = amount - free;
    await tx.$executeRaw`
      UPDATE "User"
      SET "usedFreeCredit" = "usedFreeCredit" + ${free},
          "usedPaidCredit" = "usedPaidCredit" + ${paid},
          "reservedCredit" = "reservedCredit" - ${amount}
      WHERE id = ${userId}`;
    await tx.usage.create({
      data: { userId, type: 'VIZ_POINTS', amount, freeAmount: free, paidAmount: paid, description: 'Image generation', resourceId: jobId },
    });
    return { amount, free, paid };
  }

  /** Returns the hold without charging. Returns null when already settled. */
  async release(tx: Tx, jobId: string): Promise<number | null> {
    const settled = await tx.$queryRaw<Array<{ userId: string; amount: number }>>`
      UPDATE "CreditReservation" SET status = 'RELEASED', "updatedAt" = now()
      WHERE "jobId" = ${jobId} AND status = 'RESERVED'
      RETURNING "userId", amount`;
    if (settled.length === 0) return null;
    const { userId, amount } = settled[0];
    if (amount > 0) {
      await tx.$executeRaw`UPDATE "User" SET "reservedCredit" = "reservedCredit" - ${amount} WHERE id = ${userId}`;
    }
    return amount;
  }
}
