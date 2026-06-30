// ─── Domain Models ──────────────────────────────────────────────────────────
export type Role = "USER" | "ADMIN";
export type TaskType = "DAILY_LOGIN" | "LIKE_POST" | "VIEW_CONTENT" | "QUIZ_COMPLETION" | "WATCH_VIDEO" | "CUSTOM";
export type TransactionType = "MEMBERSHIP_ACTIVATION" | "TASK_REWARD" | "VIDEO_REWARD" | "REFERRAL_BONUS" | "TRANSFER_SENT" | "TRANSFER_RECEIVED" | "REGISTRATION_CREDIT";
export type ReferralStatus = "PENDING" | "ACTIVE" | "REWARDED";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  referralCode: string;
  isActive: boolean;
  createdAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  virtualBalance: number;
  pendingRewards: number;
  totalEarned: number;
  totalWithdrawn: number;
}

export interface Membership {
  id: string;
  userId: string;
  isActive: boolean;
  cost: number;
  activatedAt: string;
}

export interface Transaction {
  id: string;
  walletId: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  type: TaskType;
  reward: number;
  cooldownHours: number;
  maxPerDay: number;
  isActive: boolean;
  contentUrl: string | null;
}

export interface TaskWithStatus extends Task {
  completionsToday: number;
  isAvailable: boolean;
  cooldownEndsAt: string | null;
}

export interface Video {
  id: string;
  title: string;
  description: string | null;
  youtubeId: string;
  thumbnail: string | null;
  duration: number;
  minWatchPercent: number;
  reward: number;
  isActive: boolean;
}

export interface VideoWithProgress extends Video {
  percentWatched: number;
  isRewarded: boolean;
}

export interface Referral {
  id: string;
  referrerId: string;
  referredId: string;
  status: ReferralStatus;
  bonusAmount: number;
  createdAt: string;
  referred: { id: string; name: string; email: string; createdAt: string; membership: Membership | null };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

// ─── API Request / Response ─────────────────────────────────────────────────
export interface RegisterRequest { name: string; email: string; password: string; confirmPassword: string; referralCode?: string }
export interface RegisterResponse { message: string; user: User }
export interface LoginRequest { email: string; password: string }
export interface LoginResponse { user: User }
export interface MeResponse { user: User }

export interface WalletResponse { wallet: Wallet; membership: Membership | null; transactions: Transaction[] }
export interface ActivateMembershipResponse { membership: Membership; wallet: Wallet; message: string }
export interface TransferRequest { recipientEmail: string; amount: number; note?: string }
export interface TransferResponse { message: string; wallet: Wallet }

export interface TasksResponse { videos: VideoWithProgress[]; completedToday: number; dailyLimit: number; canEarnMore: boolean }
export interface CompleteTaskRequest { taskId: string }
export interface CompleteTaskResponse { reward: number; totalTasksToday: number; message: string }
export interface VideosResponse { videos: VideoWithProgress[] }
export interface VideoProgressRequest { videoId: string; watchedSeconds: number; percentWatched: number }
export interface VideoProgressResponse { rewarded: boolean; reward?: number; message: string }

export interface ReferralsResponse {
  referralCode: string;
  referralLink: string;
  referrals: Referral[];
  stats: { totalReferrals: number; activeReferrals: number; pendingReferrals: number; totalBonus: number };
  leaderboard: { rank: number; userId: string; name: string; totalReferrals: number; totalEarned: number }[];
}

export interface DashboardResponse {
  user: User;
  wallet: Wallet;
  membership: Membership | null;
  stats: { tasksCompletedToday: number; dailyEarnings: number; totalReferrals: number; activeReferrals: number };
  recentActivity: Transaction[];
  notifications: Notification[];
}

export interface AdminStatsResponse {
  totalUsers: number;
  newUsersToday: number;
  activeMembers: number;
  tasksCompletedToday: number;
  totalVirtualKES: number;
  recentTransactions: (Transaction & { userName: string; userEmail: string })[];
  topEarners: { id: string; name: string; email: string; totalEarned: number }[];
}

export interface CreateTaskRequest { title: string; description?: string; type: string; reward: number; cooldownHours: number; maxPerDay: number; contentUrl?: string }
export interface CreateVideoRequest { title: string; description?: string; youtubeId: string; duration: number; minWatchPercent: number; reward: number }
