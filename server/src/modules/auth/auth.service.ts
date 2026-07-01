import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { db } from "../../lib/db";
import type { RegisterInput, LoginInput } from "./auth.schema";

const userSelect = {
  id: true, name: true, email: true, role: true,
  referralCode: true, isActive: true, createdAt: true,
} as const;

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
