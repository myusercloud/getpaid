import { db } from "../../lib/db";
import { DAILY_TASK_LIMIT } from "../../lib/constants";
import { refreshVideos } from "../../lib/videoRefresh";
import { startOfDay, subHours } from "date-fns";

// Single source of truth for task access. All handlers call this; no
// second membership query elsewhere.
export async function getTaskAccess(userId: string) {
  const membership = await db.membership.findUnique({ where: { userId } });
  const isActive = !!membership?.isActive;
  return {
    canAccessVideo:  true,      // watch is always open
    canEarnVideo:    isActive,  // credit only if member
    canAccessAiTask: isActive,  // view + attempt gated
  };
}

// In-memory gate: prevents multiple refreshes within the same calendar day.
// Resets on server restart, which is fine — the DB check below is the real guard.
let lastRefreshedDate = "";

async function ensureDailyVideos(): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  if (lastRefreshedDate === today) return;

  const dayStart = startOfDay(new Date());
  const count = await db.video.count({ where: { isActive: true, updatedAt: { gte: dayStart } } });

  if (count >= 15) {
    lastRefreshedDate = today;
    return;
  }

  if (!process.env.YOUTUBE_API_KEY) return;

  try {
    await refreshVideos(15);
    lastRefreshedDate = today;
  } catch (err) {
    console.error("[daily-videos] Auto-refresh failed:", err);
  }
}

export async function getTasks(userId: string) {
  await ensureDailyVideos();

  const todayStart = startOfDay(new Date());

  const [videos, watches, completedToday, access, aiTasks, aiCompletions] = await Promise.all([
    db.video.findMany({ where: { isActive: true }, take: 5 }),
    db.videoWatch.findMany({
      where: { userId },
      select: { videoId: true, percentWatched: true, rewarded: true },
    }),
    db.taskCompletion.count({ where: { userId, completedAt: { gte: todayStart } } }),
    getTaskAccess(userId),
    db.aiTask.findMany({ where: { isActive: true }, select: { id: true, title: true, description: true, category: true, reward: true } }),
    db.aiTaskCompletion.findMany({ where: { userId }, select: { aiTaskId: true, status: true } }),
  ]);

  const watchMap = new Map(watches.map((w) => [w.videoId, w]));
  const completionMap = new Map(aiCompletions.map((c) => [c.aiTaskId, c.status]));

  return {
    videos: videos.map((v) => {
      const w = watchMap.get(v.id);
      return { ...v, percentWatched: w?.percentWatched ?? 0, isRewarded: w?.rewarded ?? false };
    }),
    aiTasks: aiTasks.map((t) => ({
      ...t,
      locked: !access.canAccessAiTask,
      submissionStatus: completionMap.get(t.id) ?? null,
    })),
    completedToday,
    dailyLimit: DAILY_TASK_LIMIT,
    canEarnMore: completedToday < DAILY_TASK_LIMIT,
  };
}

export async function getAiTask(userId: string, aiTaskId: string) {
  const [task, access] = await Promise.all([
    db.aiTask.findUnique({ where: { id: aiTaskId } }),
    getTaskAccess(userId),
  ]);

  if (!task?.isActive) throw Object.assign(new Error("Task not found"), { statusCode: 404 });
  if (!access.canAccessAiTask) throw Object.assign(new Error("Active membership required to access AI tasks"), { statusCode: 403 });

  const completion = await db.aiTaskCompletion.findUnique({ where: { userId_aiTaskId: { userId, aiTaskId } } });
  return { ...task, submissionStatus: completion?.status ?? null };
}

const MIN_RESPONSE_LENGTH = 30;

export async function submitAiTask(userId: string, aiTaskId: string, response: string) {
  if (!response || response.trim().length < MIN_RESPONSE_LENGTH) {
    throw Object.assign(new Error(`Response must be at least ${MIN_RESPONSE_LENGTH} characters`), { statusCode: 400 });
  }

  const [task, access] = await Promise.all([
    db.aiTask.findUnique({ where: { id: aiTaskId } }),
    getTaskAccess(userId),
  ]);

  if (!task?.isActive) throw Object.assign(new Error("Task not found"), { statusCode: 404 });
  if (!access.canAccessAiTask) throw Object.assign(new Error("Active membership required to access AI tasks"), { statusCode: 403 });

  const existing = await db.aiTaskCompletion.findUnique({ where: { userId_aiTaskId: { userId, aiTaskId } } });
  if (existing) throw Object.assign(new Error("You have already submitted this task"), { statusCode: 409 });

  const completion = await db.aiTaskCompletion.create({
    data: { userId, aiTaskId, response: response.trim(), reward: task.reward, status: "PENDING" },
  });

  return { id: completion.id, status: "PENDING", message: "Response submitted for review. Reward will be credited on approval." };
}

export async function approveAiTaskCompletion(completionId: string, reviewNote?: string) {
  const completion = await db.aiTaskCompletion.findUnique({ where: { id: completionId }, include: { aiTask: true } });
  if (!completion) throw Object.assign(new Error("Completion not found"), { statusCode: 404 });
  if (completion.status !== "PENDING") throw Object.assign(new Error("Only PENDING submissions can be approved"), { statusCode: 409 });

  const wallet = await db.wallet.findUnique({ where: { userId: completion.userId } });
  if (!wallet) throw Object.assign(new Error("Wallet not found"), { statusCode: 404 });

  await db.$transaction([
    db.aiTaskCompletion.update({
      where: { id: completionId },
      data: { status: "APPROVED", reviewNote: reviewNote ?? null, reviewedAt: new Date() },
    }),
    db.wallet.update({
      where: { userId: completion.userId },
      data: {
        virtualBalance: { increment: completion.reward },
        totalEarned: { increment: completion.reward },
        transactions: {
          create: { type: "AI_TASK_REWARD", amount: completion.reward, description: `AI task approved: ${completion.aiTask.title}` },
        },
      },
    }),
  ]);

  return { message: "Submission approved and reward credited" };
}

export async function rejectAiTaskCompletion(completionId: string, reviewNote?: string) {
  const completion = await db.aiTaskCompletion.findUnique({ where: { id: completionId } });
  if (!completion) throw Object.assign(new Error("Completion not found"), { statusCode: 404 });
  if (completion.status !== "PENDING") throw Object.assign(new Error("Only PENDING submissions can be rejected"), { statusCode: 409 });

  await db.aiTaskCompletion.update({
    where: { id: completionId },
    data: { status: "REJECTED", reviewNote: reviewNote ?? null, reviewedAt: new Date() },
  });

  return { message: "Submission rejected" };
}

export async function getPendingAiReviews() {
  return db.aiTaskCompletion.findMany({
    where: { status: "PENDING" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      aiTask: { select: { id: true, title: true, category: true } },
    },
    orderBy: { submittedAt: "asc" },
  });
}

export async function completeTask(userId: string, taskId: string) {
  const todayStart = startOfDay(new Date());
  const [task, access] = await Promise.all([
    db.task.findUnique({ where: { id: taskId } }),
    getTaskAccess(userId),
  ]);

  if (!task?.isActive) throw Object.assign(new Error("Task not found"), { statusCode: 404 });
  if (!access.canEarnVideo) throw Object.assign(new Error("Active membership required"), { statusCode: 403 });

  const totalToday = await db.taskCompletion.count({ where: { userId, completedAt: { gte: todayStart }, taskId: { not: null } } });
  if (totalToday >= DAILY_TASK_LIMIT) {
    throw Object.assign(new Error(`Daily limit of ${DAILY_TASK_LIMIT} tasks reached. Come back tomorrow!`), { statusCode: 429 });
  }

  const taskCompletionsToday = await db.taskCompletion.count({ where: { userId, taskId, completedAt: { gte: todayStart } } });
  if (taskCompletionsToday >= task.maxPerDay) throw Object.assign(new Error("Task limit reached for today"), { statusCode: 429 });

  if (task.cooldownHours > 0) {
    const recent = await db.taskCompletion.findFirst({ where: { userId, taskId, completedAt: { gte: subHours(new Date(), task.cooldownHours) } } });
    if (recent) throw Object.assign(new Error("Task is on cooldown"), { statusCode: 429 });
  }

  const wallet = await db.wallet.findUnique({ where: { userId } });
  if (!wallet) throw Object.assign(new Error("Wallet not found"), { statusCode: 404 });

  await db.$transaction([
    db.taskCompletion.create({ data: { userId, taskId, reward: task.reward } }),
    db.wallet.update({
      where: { userId },
      data: {
        virtualBalance: { increment: task.reward },
        totalEarned: { increment: task.reward },
        transactions: { create: { type: "TASK_REWARD", amount: task.reward, description: `Task reward: ${task.title}` } },
      },
    }),
  ]);

  return { reward: task.reward, totalTasksToday: totalToday + 1, message: `Task completed! KES ${task.reward} earned.` };
}

export async function getVideos(userId: string) {
  const [videos, watches] = await Promise.all([
    db.video.findMany({ where: { isActive: true }, orderBy: { reward: "desc" } }),
    db.videoWatch.findMany({ where: { userId }, select: { videoId: true, percentWatched: true, rewarded: true } }),
  ]);

  const watchMap = new Map(watches.map((w) => [w.videoId, w]));
  return {
    videos: videos.map((v) => {
      const watch = watchMap.get(v.id);
      return { ...v, percentWatched: watch?.percentWatched ?? 0, isRewarded: watch?.rewarded ?? false };
    }),
  };
}

export async function recordVideoProgress(userId: string, videoId: string, watchedSeconds: number, percentWatched: number) {
  const todayStart = startOfDay(new Date());
  const [video, access] = await Promise.all([
    db.video.findUnique({ where: { id: videoId } }),
    getTaskAccess(userId),
  ]);

  if (!video) throw Object.assign(new Error("Video not found"), { statusCode: 404 });
  if (!access.canEarnVideo) throw Object.assign(new Error("Active membership required"), { statusCode: 403 });

  const existing = await db.videoWatch.findUnique({ where: { userId_videoId: { userId, videoId } } });
  if (existing?.rewarded) return { rewarded: true, message: "Already rewarded" };

  await db.videoWatch.upsert({
    where: { userId_videoId: { userId, videoId } },
    update: { watchedSeconds, percentWatched },
    create: { userId, videoId, watchedSeconds, percentWatched },
  });

  if (percentWatched >= video.minWatchPercent) {
    const completedToday = await db.taskCompletion.count({ where: { userId, completedAt: { gte: todayStart } } });
    if (completedToday >= DAILY_TASK_LIMIT) {
      return { rewarded: false, message: "Daily limit reached — come back tomorrow!" };
    }

    const wallet = await db.wallet.findUnique({ where: { userId } });
    if (!wallet) return { rewarded: false, message: "Wallet not found" };

    await db.$transaction([
      db.videoWatch.update({ where: { userId_videoId: { userId, videoId } }, data: { rewarded: true, completedAt: new Date() } }),
      db.taskCompletion.create({ data: { userId, videoId, reward: video.reward } }),
      db.wallet.update({
        where: { userId },
        data: {
          virtualBalance: { increment: video.reward },
          totalEarned: { increment: video.reward },
          transactions: { create: { type: "VIDEO_REWARD", amount: video.reward, description: `Video reward: ${video.title}` } },
        },
      }),
    ]);

    return { rewarded: true, reward: video.reward, message: `Video reward unlocked! KES ${video.reward} earned.` };
  }

  return { rewarded: false, message: `Progress saved: ${Math.round(percentWatched)}%` };
}

export async function getDashboard(userId: string) {
  const todayStart = startOfDay(new Date());
  const walletRow = await db.wallet.findUnique({ where: { userId }, select: { id: true } });

  const [user, wallet, membership, tasksToday, referrals, activity, notifications] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, role: true, referralCode: true, isActive: true, createdAt: true } }),
    db.wallet.findUnique({ where: { userId } }),
    db.membership.findUnique({ where: { userId } }),
    db.taskCompletion.findMany({ where: { userId, completedAt: { gte: todayStart } }, select: { reward: true } }),
    db.referral.findMany({ where: { referrerId: userId } }),
    db.transaction.findMany({ where: { walletId: walletRow?.id ?? "" }, orderBy: { createdAt: "desc" }, take: 10 }),
    db.notification.findMany({ where: { userId, isRead: false }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  if (!user || !wallet) throw Object.assign(new Error("User not found"), { statusCode: 404 });

  return {
    user, wallet, membership,
    stats: {
      tasksCompletedToday: tasksToday.length,
      dailyEarnings: tasksToday.reduce((s, t) => s + t.reward, 0),
      totalReferrals: referrals.length,
      activeReferrals: referrals.filter((r) => r.status !== "PENDING").length,
    },
    recentActivity: activity,
    notifications,
  };
}
