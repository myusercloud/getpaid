import { nanoid } from "nanoid";
import { db } from "../../lib/db";
import { MEMBERSHIP_COST, MEMBERSHIP_BONUS } from "../../lib/constants";
import { mpesaConfigured, stkPush, type MpesaCallbackBody } from "../../lib/mpesa";

// ─── In-memory simulation store (no-MPESA dev mode) ────────────────────────
const simStore = new Map<string, { userId: string; status: "PENDING" | "SUCCESS" | "FAILED" }>();

// ─── Wallet ─────────────────────────────────────────────────────────────────
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

// ─── Membership activation (called after payment confirmed) ─────────────────
export async function activateMembership(userId: string) {
  const existing = await db.membership.findUnique({ where: { userId } });
  if (existing?.isActive) return { already: true }; // idempotent — callback may fire twice

  const [membership, wallet] = await db.$transaction([
    db.membership.upsert({
      where: { userId },
      update: { isActive: true, activatedAt: new Date() },
      create: { userId, isActive: true, cost: MEMBERSHIP_COST },
    }),
    db.wallet.update({
      where: { userId },
      data: {
        virtualBalance: { increment: MEMBERSHIP_BONUS },
        totalEarned:    { increment: MEMBERSHIP_BONUS },
        transactions: {
          create: {
            type: "TASK_REWARD",
            amount: MEMBERSHIP_BONUS,
            description: "Membership activation bonus — KES 20 credited",
          },
        },
      },
    }),
  ]);

  // Reward referrer if pending
  const referral = await db.referral.findUnique({ where: { referredId: userId } });
  if (referral?.status === "PENDING") {
    const referrerWallet = await db.wallet.findUnique({ where: { userId: referral.referrerId } });
    if (referrerWallet) {
      await db.$transaction([
        db.referral.update({
          where: { id: referral.id },
          data: { status: "REWARDED", bonusAmount: 50, activatedAt: new Date() },
        }),
        db.wallet.update({
          where: { userId: referral.referrerId },
          data: {
            virtualBalance: { increment: 50 },
            totalEarned:    { increment: 50 },
            transactions: {
              create: {
                type: "REFERRAL_BONUS",
                amount: 50,
                description: "Referral bonus — friend activated membership",
              },
            },
          },
        }),
        db.notification.create({
          data: {
            userId: referral.referrerId,
            title: "Referral Bonus!",
            message: "Your referral activated their membership. KES 50 credited.",
            type: "success",
          },
        }),
      ]);
    }
  }

  await db.notification.create({
    data: {
      userId,
      title: "Membership Activated!",
      message: `GETPAID membership active. KES ${MEMBERSHIP_BONUS} bonus added.`,
      type: "success",
    },
  });

  return { membership, wallet, message: "Membership activated successfully" };
}

// ─── STK Push ────────────────────────────────────────────────────────────────
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.length === 9) return `254${digits}`;
  throw Object.assign(new Error("Invalid phone number format"), { statusCode: 400 });
}

export async function initiateSTKPush(userId: string, phone: string) {
  const existing = await db.membership.findUnique({ where: { userId } });
  if (existing?.isActive) throw Object.assign(new Error("Membership already active"), { statusCode: 409 });

  const formatted = formatPhone(phone);

  if (!mpesaConfigured()) {
    // Simulation mode — auto-succeed after 5 s
    const fakeId = `sim_${nanoid(16)}`;
    simStore.set(fakeId, { userId, status: "PENDING" });
    setTimeout(async () => {
      try {
        await activateMembership(userId);
        simStore.set(fakeId, { userId, status: "SUCCESS" });
      } catch {
        simStore.set(fakeId, { userId, status: "FAILED" });
      }
    }, 5000);
    return {
      checkoutRequestId: fakeId,
      message: "STK push sent to your phone (simulation mode)",
      simMode: true,
    };
  }

  const result = await stkPush(formatted, MEMBERSHIP_COST, `GP-${userId.slice(0, 8).toUpperCase()}`);

  await db.mpesaPayment.create({
    data: {
      userId,
      checkoutRequestId: result.CheckoutRequestID,
      merchantRequestId: result.MerchantRequestID,
      phone: formatted,
      amount: MEMBERSHIP_COST,
      status: "PENDING",
    },
  });

  return {
    checkoutRequestId: result.CheckoutRequestID,
    message: result.CustomerMessage,
    simMode: false,
  };
}

export async function handleMpesaCallback(body: MpesaCallbackBody) {
  const { stkCallback } = body.Body;
  const { CheckoutRequestID, ResultCode, ResultDesc } = stkCallback;

  const payment = await db.mpesaPayment.findUnique({ where: { checkoutRequestId: CheckoutRequestID } });
  if (!payment) return; // unknown payment — ignore

  const status = ResultCode === 0 ? "SUCCESS" : "FAILED";

  await db.mpesaPayment.update({
    where: { id: payment.id },
    data: { status, resultCode: ResultCode, resultDesc: ResultDesc },
  });

  if (status === "SUCCESS") {
    await activateMembership(payment.userId);
  }
}

export async function getPaymentStatus(checkoutRequestId: string, userId: string) {
  // Simulation mode
  if (checkoutRequestId.startsWith("sim_")) {
    const sim = simStore.get(checkoutRequestId);
    if (!sim || sim.userId !== userId)
      throw Object.assign(new Error("Payment not found"), { statusCode: 404 });
    return { status: sim.status, resultDesc: null };
  }

  // Real payment
  const payment = await db.mpesaPayment.findFirst({
    where: { checkoutRequestId, userId },
    select: { status: true, resultDesc: true },
  });
  if (!payment) throw Object.assign(new Error("Payment not found"), { statusCode: 404 });
  return payment;
}

// ─── Transfer credits ─────────────────────────────────────────────────────────
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
        virtualBalance:  { decrement: amount },
        totalWithdrawn:  { increment: amount },
        transactions: {
          create: {
            type: "TRANSFER_SENT",
            amount: -amount,
            description: desc,
            receiverId: recipient.id,
            senderId: userId,
          },
        },
      },
    }),
    db.wallet.update({
      where: { userId: recipient.id },
      data: {
        virtualBalance: { increment: amount },
        totalEarned:    { increment: amount },
        transactions: {
          create: {
            type: "TRANSFER_RECEIVED",
            amount,
            description: `Transfer from a member`,
            senderId: userId,
            receiverId: recipient.id,
          },
        },
      },
    }),
  ]);

  return { message: "Transfer successful", wallet: await db.wallet.findUnique({ where: { userId } }) };
}
