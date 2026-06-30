import { db } from "../../lib/db";
import { startOfDay } from "date-fns";

type CreateTaskInput = { title: string; description?: string; type: string; reward: number; cooldownHours: number; maxPerDay: number; contentUrl?: string };
type CreateVideoInput = { title: string; description?: string; youtubeId: string; duration: number; minWatchPercent: number; reward: number; thumbnail?: string };

export async function getAdminStats() {
  const today = startOfDay(new Date());

  const [totalUsers, newUsersToday, activeMembers, tasksToday, walletAgg, recentTx, topEarners] = await Promise.all([
    db.user.count({ where: { role: "USER" } }),
    db.user.count({ where: { role: "USER", createdAt: { gte: today } } }),
    db.membership.count({ where: { isActive: true } }),
    db.taskCompletion.count({ where: { completedAt: { gte: today } } }),
    db.wallet.aggregate({ _sum: { totalEarned: true } }),
    db.transaction.findMany({
      orderBy: { createdAt: "desc" }, take: 10,
      include: { wallet: { include: { user: { select: { name: true, email: true } } } } },
    }),
    db.user.findMany({
      where: { role: "USER" }, include: { wallet: true },
      orderBy: { wallet: { totalEarned: "desc" } }, take: 5,
    }),
  ]);

  return {
    totalUsers,
    newUsersToday,
    activeMembers,
    tasksCompletedToday: tasksToday,
    totalVirtualKES: walletAgg._sum.totalEarned ?? 0,
    recentTransactions: recentTx.map((tx) => ({
      ...tx,
      userName: tx.wallet.user.name,
      userEmail: tx.wallet.user.email,
    })),
    topEarners: topEarners.map((u) => ({ id: u.id, name: u.name, email: u.email, totalEarned: u.wallet?.totalEarned ?? 0 })),
  };
}

export async function getAdminUsers() {
  return db.user.findMany({
    where: { role: "USER" },
    include: { wallet: true, membership: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getAdminTasks() {
  return db.task.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createTask(data: CreateTaskInput) {
  return db.task.create({ data: { title: data.title, description: data.description, type: data.type as any, reward: data.reward, cooldownHours: data.cooldownHours, maxPerDay: data.maxPerDay, contentUrl: data.contentUrl } });
}

export async function updateTask(id: string, data: Partial<CreateTaskInput & { isActive: boolean }>) {
  return db.task.update({ where: { id }, data: { ...data, type: data.type as any } });
}

export async function getAdminVideos() {
  return db.video.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createVideo(data: CreateVideoInput) {
  const thumbnail = data.thumbnail ?? `https://img.youtube.com/vi/${data.youtubeId}/maxresdefault.jpg`;
  return db.video.create({ data: { ...data, thumbnail } });
}

export async function updateVideo(id: string, data: Partial<CreateVideoInput & { isActive: boolean }>) {
  return db.video.update({ where: { id }, data });
}

export { refreshVideos } from "../../lib/videoRefresh";
