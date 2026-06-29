import { db } from "../../lib/db";

export async function getReferrals(userId: string) {
  const [user, referrals] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { referralCode: true } }),
    db.referral.findMany({
      where: { referrerId: userId },
      include: {
        referred: {
          select: { id: true, name: true, email: true, createdAt: true, membership: { select: { isActive: true, activatedAt: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!user) throw Object.assign(new Error("User not found"), { statusCode: 404 });

  const stats = {
    totalReferrals: referrals.length,
    activeReferrals: referrals.filter((r) => r.status !== "PENDING").length,
    pendingReferrals: referrals.filter((r) => r.status === "PENDING").length,
    totalBonus: referrals.reduce((s, r) => s + r.bonusAmount, 0),
  };

  const leaderboard = await db.user.findMany({
    where: { role: "USER" },
    include: { referralsGiven: true, wallet: true },
    orderBy: { referralsGiven: { _count: "desc" } },
    take: 10,
  });

  return {
    referralCode: user.referralCode,
    referralLink: `${process.env.WEB_URL ?? "http://localhost:3000"}/register?ref=${user.referralCode}`,
    referrals,
    stats,
    leaderboard: leaderboard.map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      name: u.name,
      totalReferrals: u.referralsGiven.length,
      totalEarned: u.wallet?.totalEarned ?? 0,
    })),
  };
}
