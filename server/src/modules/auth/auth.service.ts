import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { db } from "../../lib/db";
import type { RegisterInput, LoginInput } from "./auth.schema";

const userSelect = {
  id: true, name: true, email: true, role: true,
  referralCode: true, isActive: true, createdAt: true,
  phone: true, phoneVerified: true,
} as const;

// In-memory OTP store — keyed by userId
const otpStore = new Map<string, { otp: string; phone: string; expiresAt: Date }>();

export async function requestPhoneOtp(userId: string, phone: string) {
  const normalized = phone.replace(/\s+/g, "");
  const existing = await db.user.findFirst({ where: { phone: normalized, NOT: { id: userId } } });
  if (existing) throw Object.assign(new Error("Phone number already in use"), { statusCode: 409 });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  otpStore.set(userId, { otp, phone: normalized, expiresAt });

  // TODO: send real SMS via Africa's Talking / Twilio
  console.log(`[OTP] ${normalized} → ${otp}`);

  return { sent: true, devOtp: process.env.NODE_ENV !== "production" ? otp : undefined };
}

export async function verifyPhoneOtp(userId: string, otp: string) {
  const entry = otpStore.get(userId);
  if (!entry) throw Object.assign(new Error("No OTP requested — please request a new code"), { statusCode: 400 });
  if (new Date() > entry.expiresAt) {
    otpStore.delete(userId);
    throw Object.assign(new Error("OTP expired — please request a new code"), { statusCode: 400 });
  }
  if (entry.otp !== otp) throw Object.assign(new Error("Incorrect code"), { statusCode: 400 });

  otpStore.delete(userId);
  return db.user.update({
    where: { id: userId },
    data: { phone: entry.phone, phoneVerified: true },
    select: userSelect,
  });
}

export async function registerUser(input: RegisterInput) {
  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) throw Object.assign(new Error("Email already registered"), { statusCode: 409 });

  let referredBy: string | null = null;
  if (input.referralCode) {
    const referrer = await db.user.findUnique({ where: { referralCode: input.referralCode } });
    if (referrer) referredBy = referrer.id;
  }

  const hashed = await bcrypt.hash(input.password, 12);
  const code = nanoid(8).toUpperCase();

  const user = await db.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      password: hashed,
      referralCode: code,
      referredById: referredBy ?? undefined,
      wallet: {
        create: {},
      },
    },
    select: userSelect,
  });

  if (referredBy) {
    await db.referral.create({ data: { referrerId: referredBy, referredId: user.id } });
  }

  await db.notification.create({
    data: {
      userId: user.id,
      title: "Welcome to GETPAID!",
      message: "Activate your membership to start earning virtual credits.",
      type: "info",
    },
  });

  return user;
}

export async function loginUser(input: LoginInput) {
  const user = await db.user.findUnique({
    where: { email: input.email.toLowerCase() },
    select: { ...userSelect, password: true },
  });

  if (!user) throw Object.assign(new Error("Invalid credentials"), { statusCode: 401 });
  if (!user.isActive) throw Object.assign(new Error("Account suspended"), { statusCode: 403 });

  const valid = await bcrypt.compare(input.password, user.password);
  if (!valid) throw Object.assign(new Error("Invalid credentials"), { statusCode: 401 });

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const { password: _, ...safeUser } = user;
  return safeUser;
}

export async function getMe(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: userSelect });
  if (!user) throw Object.assign(new Error("User not found"), { statusCode: 404 });
  return user;
}

export async function updateMe(userId: string, name: string) {
  return db.user.update({ where: { id: userId }, data: { name }, select: userSelect });
}
