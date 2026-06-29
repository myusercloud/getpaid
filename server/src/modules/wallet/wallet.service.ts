import { db } from "../../lib/db";
import { MEMBERSHIP_COST, MEMBERSHIP_BONUS } from "../../lib/constants";

export async function getWallet(userId: string) {
  const walletId = (await db.wallet.findUnique({ where: { userId }, select: { id: true } }))?.id ?? "";
  const [wallet, membership, transactions] = await Promise.all([
    db.wallet.findUnique({ where: { userId } }),
    db.membership.findUnique({ where: { userId } }),
    db.transaction.findMany({ where: { walletId }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  if (!wallet) throw Object.assign(new Error("Wallet not found"), { statusCode: 404 });
  return { wallet, membership, transactions };
}

export async function activateMembership(userId: string) {
  const existing = await db.membership.findUnique({ where: { userId } });
  if (existing?.isActive) throw Object.assign(new Error("Membership already active"), { statusCode: 409 });

  const wallet = await db.wallet.findUnique({ where: { userId } });
  if (!wallet) throw Object.assign(new Error("Wallet not found"), { statusCode: 404 });

  const [membership, updatedWallet] = await db.$transaction([
    db.membership.upsert({
      where: { userId },
      update: { isActive: true, activatedAt: new Date() },
      create: { userId, isActive: true, cost: MEMBERSHIP_COST },
    }),
    db.wallet.update({
      where: { userId },
      data: {
        virtualBalance: { increment: MEMBERSHIP_BONUS },
        totalEarned: { increment: MEMBERSHIP_BONUS },
        transactions: {
          create: [
            { type: "MEMBERSHIP_ACTIVATION", amount: -MEMBERSHIP_COST, description: "Member activation — educational simulation" },
            { type: "TASK_REWARD", amount: MEMBERSHIP_BONUS, description: "Membership activation bonus" },
          ],
        },
      },
    }),
  ]);

  const referral = await db.referral.findUnique({ where: { referredId: userId } });
  if (referral?.status === "PENDING") {
    const referrerWallet = await db.wallet.findUnique({ where: { userId: referral.referrerId } });
    if (referrerWallet) {
      await db.$transaction([
        db.referral.update({ where: { id: referral.id }, data: { status: "REWARDED", bonusAmount: 50, activatedAt: new Date() } }),
        db.wallet.update({
          where: { userId: referral.referrerId },
          data: {
            virtualBalance: { increment: 50 },
            totalEarned: { increment: 50 },
            transactions: { create: { type: "REFERRAL_BONUS", amount: 50, description: "Referral bonus — friend activated membership" } },
          },
        }),
        db.notification.create({
          data: { userId: referral.referrerId, title: "Referral Bonus!", message: "Your referral activated their membership. KES 50 credited.", type: "success" },
        }),
      ]);
    }
  }

  await db.notification.create({
    data: { userId, title: "Membership Activated!", message: `GETPAID membership active. KES ${MEMBERSHIP_BONUS} bonus added.`, type: "success" },
  });

  return { membership, wallet: updatedWallet, message: "Membership activated successfully" };
}

export async function transferCredits(userId: string, recipientEmail: string, amount: number, note?: string) {
  if (amount < 10) throw Object.assign(new Error("Minimum transfer is KES 10"), { statusCode: 400 });

  const [sender, recipient] = await Promise.all([
    db.wallet.findUnique({ where: { userId } }),
    db.user.findUnique({ where: { email: recipientEmail.toLowerCase() }, include: { wallet: true } }),
  ]);

  if (!sender) throw Object.assign(new Error("Wallet not found"), { statusCode: 404 });
  if (!recipient?.wallet) throw Object.assign(new Error("Recipient not found"), { statusCode: 404 });
  if (recipient.id === userId) throw Object.assign(new Error("Cannot transfer to yourself"), { statusCode: 400 });
  if (sender.virtualBalance < amount) throw Object.assign(new Error("Insufficient balance"), { statusCode: 400 });

  const desc = note ?? `Transfer to ${recipient.name}`;

  await db.$transaction([
    db.wallet.update({
      where: { userId },
      data: {
        virtualBalance: { decrement: amount },
        totalWithdrawn: { increment: amount },
        transactions: { create: { type: "TRANSFER_SENT", amount: -amount, description: desc, receiverId: recipient.id, senderId: userId } },
      },
    }),
    db.wallet.update({
      where: { userId: recipient.id },
      data: {
        virtualBalance: { increment: amount },
        totalEarned: { increment: amount },
        transactions: { create: { type: "TRANSFER_RECEIVED", amount, description: `Transfer from a member`, senderId: userId, receiverId: recipient.id } },
      },
    }),
  ]);

  return { message: "Transfer successful", wallet: await db.wallet.findUnique({ where: { userId } }) };
}
