import { PrismaClient, TaskType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding GETPAID database...");

  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@getpaid.dev" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@getpaid.dev",
      password: await bcrypt.hash("admin123", 12),
      role: "ADMIN",
      referralCode: "ADMIN001",
      wallet: { create: { virtualBalance: 10000, totalEarned: 10000 } },
    },
  });

  // Demo user with active membership
  const demo = await prisma.user.upsert({
    where: { email: "demo@getpaid.dev" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@getpaid.dev",
      password: await bcrypt.hash("demo1234", 12),
      role: "USER",
      referralCode: nanoid(8).toUpperCase(),
      wallet: { create: { virtualBalance: 270, totalEarned: 270 } },
      membership: { create: { isActive: true, cost: 150 } },
    },
  });

  // Seed activation transaction
  const demoWallet = await prisma.wallet.findUnique({ where: { userId: demo.id } });
  if (demoWallet) {
    await prisma.transaction.upsert({
      where: { id: `seed_activation_${demo.id}` },
      update: {},
      create: {
        id: `seed_activation_${demo.id}`,
        walletId: demoWallet.id,
        type: "MEMBERSHIP_ACTIVATION",
        amount: -150,
        description: "Member activation (educational simulation)",
      },
    });
    await prisma.transaction.upsert({
      where: { id: `seed_bonus_${demo.id}` },
      update: {},
      create: {
        id: `seed_bonus_${demo.id}`,
        walletId: demoWallet.id,
        type: "TASK_REWARD",
        amount: 420,
        description: "Sample task rewards",
      },
    });
  }

  // Engagement tasks
  const tasks = [
    {
      id: "task_daily_login",
      title: "Daily Check-in",
      description: "Log in each day to earn your daily bonus",
      type: TaskType.DAILY_LOGIN,
      reward: 10,
      cooldownHours: 24,
      maxPerDay: 1,
    },
    {
      id: "task_like_post_1",
      title: "Engage with Finance Content",
      description: "View and interact with today's featured finance post on Instagram",
      type: TaskType.LIKE_POST,
      reward: 5,
      cooldownHours: 6,
      maxPerDay: 2,
      contentUrl: "https://www.instagram.com/p/C8TdQq_NnqI/",
    },
    {
      id: "task_view_content",
      title: "Read Today's Article",
      description: "Browse the featured educational article about fintech",
      type: TaskType.VIEW_CONTENT,
      reward: 8,
      cooldownHours: 6,
      maxPerDay: 1,
    },
    {
      id: "task_quiz",
      title: "Fintech Knowledge Quiz",
      description: "Test your understanding of digital payments and wallet systems",
      type: TaskType.QUIZ_COMPLETION,
      reward: 20,
      cooldownHours: 24,
      maxPerDay: 1,
    },
    {
      id: "task_refer",
      title: "Share Your Referral Link",
      description: "Share your unique referral link on social media",
      type: TaskType.CUSTOM,
      reward: 5,
      cooldownHours: 48,
      maxPerDay: 1,
    },
  ];

  for (const task of tasks) {
    await prisma.task.upsert({ where: { id: task.id }, update: task, create: task });
  }

  // YouTube videos (real public educational content)
  const videos = [
    {
      id: "vid_defi",
      title: "Introduction to Decentralized Finance (DeFi)",
      description: "Learn how DeFi protocols work and why they're changing finance",
      youtubeId: "17QRFlml4pA",
      thumbnail: "https://img.youtube.com/vi/17QRFlml4pA/maxresdefault.jpg",
      duration: 600,
      minWatchPercent: 80,
      reward: 30,
    },
    {
      id: "vid_fintech",
      title: "How Fintech Apps Make Money",
      description: "Revenue models behind the most successful fintech platforms",
      youtubeId: "EvmM_SBSplc",
      thumbnail: "https://img.youtube.com/vi/EvmM_SBSplc/maxresdefault.jpg",
      duration: 480,
      minWatchPercent: 75,
      reward: 25,
    },
    {
      id: "vid_wallets",
      title: "Digital Wallets Explained",
      description: "How mobile money and digital wallets work under the hood",
      youtubeId: "GQybkr3_W6k",
      thumbnail: "https://img.youtube.com/vi/GQybkr3_W6k/maxresdefault.jpg",
      duration: 720,
      minWatchPercent: 80,
      reward: 35,
    },
    {
      id: "vid_referral",
      title: "Referral Marketing & Growth Loops",
      description: "How top apps use referral systems to grow exponentially",
      youtubeId: "kMLJfb4Hn6o",
      thumbnail: "https://img.youtube.com/vi/kMLJfb4Hn6o/maxresdefault.jpg",
      duration: 540,
      minWatchPercent: 70,
      reward: 20,
    },
    {
      id: "vid_gamification",
      title: "Gamification in Finance Apps",
      description: "Streaks, badges and rewards: why fintech apps use game mechanics",
      youtubeId: "Mzu7MkfHoqg",
      thumbnail: "https://img.youtube.com/vi/Mzu7MkfHoqg/maxresdefault.jpg",
      duration: 660,
      minWatchPercent: 80,
      reward: 30,
    },
  ];

  for (const video of videos) {
    await prisma.video.upsert({ where: { id: video.id }, update: video, create: video });
  }

  console.log("✅ Seed complete");
  console.log("   Admin:  admin@getpaid.dev / admin123");
  console.log("   Demo:   demo@getpaid.dev  / demo1234");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
