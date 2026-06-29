import { db } from "../../lib/db";
import { DAILY_TASK_LIMIT } from "../../lib/constants";
import { startOfDay, subHours } from "date-fns";

export async function getTasks(userId: string) {
  const todayStart = startOfDay(new Date());

  const [tasks, completions] = await Promise.all([
    db.task.findMany({ where: { isActive: true }, orderBy: { reward: "desc" } }),
    db.taskCompletion.findMany({
      where: { userId, completedAt: { gte: todayStart }, taskId: { not: null } },
      select: { taskId: true, completedAt: true },
    }),
  ]);

  const totalTasksToday = completions.length;
  const completionMap = new Map<string, Date[]>();
  for (const c of completions) {
    if (!c.taskId) continue;
    const arr = completionMap.get(c.taskId) ?? [];
    arr.push(c.completedAt);
    completionMap.set(c.taskId, arr);
  }

  const tasksWithStatus = tasks.map((task) => {
    const todayCompletions = completionMap.get(task.id) ?? [];
    const completionsToday = todayCompletions.length;
    const lastCompletion = [...todayCompletions].sort((a, b) => b.getTime() - a.getTime())[0];
    const cooldownEndsAt = lastCompletion ? new Date(lastCompletion.getTime() + task.cooldownHours * 3600 * 1000) : null;
    const isAvailable = completionsToday < task.maxPerDay && (!cooldownEndsAt || cooldownEndsAt <= new Date());
    return { ...task, completionsToday, isAvailable, cooldownEndsAt: cooldownEndsAt?.toISOString() ?? null };
  });

  return { tasks: tasksWithStatus, totalTasksToday, dailyLimit: DAILY_TASK_LIMIT };
}

export async function completeTask(userId: string, taskId: string) {
  const todayStart = startOfDay(new Date());
  const [task, membership] = await Promise.all([
    db.task.findUnique({ where: { id: taskId } }),
    db.membership.findUnique({ where: { userId } }),
  ]);

  if (!task?.isActive) throw Object.assign(new Error("Task not found"), { statusCode: 404 });
  if (!membership?.isActive) throw Object.assign(new Error("Active membership required"), { statusCode: 403 });

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
  const [video, membership] = await Promise.all([
    db.video.findUnique({ where: { id: videoId } }),
    db.membership.findUnique({ where: { userId } }),
  ]);

  if (!video) throw Object.assign(new Error("Video not found"), { statusCode: 404 });
  if (!membership?.isActive) throw Object.assign(new Error("Active membership required"), { statusCode: 403 });

  const existing = await db.videoWatch.findUnique({ where: { userId_videoId: { userId, videoId } } });
  if (existing?.rewarded) return { rewarded: true, message: "Already rewarded" };

  await db.videoWatch.upsert({
    where: { userId_videoId: { userId, videoId } },
    update: { watchedSeconds, percentWatched },
    create: { userId, videoId, watchedSeconds, percentWatched },
  });

  if (percentWatched >= video.minWatchPercent) {
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
