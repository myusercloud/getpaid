"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatKES } from "@/lib/shared";
import Link from "next/link";
import type { TasksResponse, CompleteTaskResponse, VideosResponse, VideoProgressResponse, WalletResponse } from "@/lib/types";


export default function TasksPage() {
  const qc = useQueryClient();
  const { data: tasksData, isLoading } = useQuery({ queryKey: ["tasks"], queryFn: () => api.get<TasksResponse>("/tasks") });
  const { data: videosData } = useQuery({ queryKey: ["videos"], queryFn: () => api.get<VideosResponse>("/tasks/videos") });
  const { data: walletData } = useQuery({ queryKey: ["wallet"], queryFn: () => api.get<WalletResponse>("/wallet") });

  const [pendingTasks, setPendingTasks] = useState<Set<string>>(new Set());
  const [rewardFlash, setRewardFlash] = useState<{ taskId: string; amount: number } | null>(null);
  const [taskErrors, setTaskErrors] = useState<Record<string, string>>({});

  const completeMutation = useMutation({
    mutationFn: ({ taskId }: { taskId: string }) =>
      api.post<CompleteTaskResponse>(`/tasks/${taskId}/complete`),
    onSuccess: (res, { taskId }) => {
      setPendingTasks((p) => { const s = new Set(p); s.delete(taskId); return s; });
      setRewardFlash({ taskId, amount: res.reward });
      setTimeout(() => setRewardFlash(null), 2500);
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (err, { taskId }) => {
      setPendingTasks((p) => { const s = new Set(p); s.delete(taskId); return s; });
      setTaskErrors((p) => ({ ...p, [taskId]: err instanceof ApiError ? err.message : "Failed" }));
    },
  });

  function handleComplete(taskId: string) {
    setTaskErrors((p) => ({ ...p, [taskId]: "" }));
    setPendingTasks((p) => new Set(p).add(taskId));
    completeMutation.mutate({ taskId });
  }

  if (isLoading) return <TasksSkeleton />;

  const { tasks, totalTasksToday, dailyLimit } = tasksData ?? {};
  const videos = videosData?.videos ?? [];
  const membership = walletData?.membership;
  const atLimit = (totalTasksToday ?? 0) >= (dailyLimit ?? 5);

  if (!membership?.isActive) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">Tasks</h1>
        <Card className="text-center py-10">
          <p className="text-lg font-medium text-gray-800 mb-2">Membership required</p>
          <p className="text-sm text-gray-500 mb-4">Activate your GETPAID membership to access tasks and earn virtual credits.</p>
          <Link href="/wallet"><Button>Activate membership</Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Tasks</h1>
        <Badge variant={atLimit ? "danger" : "default"}>{totalTasksToday}/{dailyLimit} today</Badge>
      </div>

      {atLimit && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          Daily limit of {dailyLimit} tasks reached. Come back tomorrow!
        </div>
      )}

      <Card className="p-4">
        <Progress
          value={((totalTasksToday ?? 0) / (dailyLimit ?? 5)) * 100}
          label={atLimit ? "All done for today!" : `${(dailyLimit ?? 5) - (totalTasksToday ?? 0)} tasks remaining today`}
        />
      </Card>

      {tasks && tasks.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Engagement Tasks</h2>
          <div className="space-y-3">
            {tasks.map((task) => {
              const isPending = pendingTasks.has(task.id);
              const justRewarded = rewardFlash?.taskId === task.id;
              return (
                <Card key={task.id} className={!task.isAvailable ? "opacity-60" : ""}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-medium text-gray-900">{task.title}</h3>
                        <Badge variant="success" className="text-xs">+{formatKES(task.reward)}</Badge>
                        {!task.isAvailable && <Badge variant="warning" className="text-xs">cooldown</Badge>}
                        {task.completionsToday > 0 && !justRewarded && (
                          <Badge variant="secondary" className="text-xs">done {task.completionsToday}×</Badge>
                        )}
                        {justRewarded && (
                          <span className="text-xs font-bold text-green-600 animate-bounce">
                            +{formatKES(rewardFlash!.amount)} earned!
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{task.description}</p>
                      {task.contentUrl && (
                        <a href={task.contentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                          View content →
                        </a>
                      )}
                      {taskErrors[task.id] && (
                        <p className="text-xs text-red-600 mt-1">{taskErrors[task.id]}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      disabled={!task.isAvailable || atLimit || isPending}
                      loading={isPending}
                      onClick={() => handleComplete(task.id)}
                    >
                      {task.isAvailable ? "Complete" : "Done"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {videos.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Video Tasks</h2>
          <div className="space-y-4">
            {videos.map((video) => (
              <VideoTaskCard
                key={video.id}
                video={video}
                onComplete={() => {
                  qc.invalidateQueries({ queryKey: ["videos"] });
                  qc.invalidateQueries({ queryKey: ["wallet"] });
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── VideoTaskCard ──────────────────────────────────────────────────────────
// Progress is tracked via a wall-clock timer rather than the YT IFrame API.
// The YT Player API modifies the iframe's src on init, which triggers React
// to reconcile and reload the iframe — causing the "goes back to thumbnail"
// bug. Keeping React fully in control of the iframe (no third-party DOM
// mutations) makes playback stable.

function VideoTaskCard({ video, onComplete }: {
  video: VideosResponse["videos"][number];
  onComplete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(video.percentWatched ?? 0);
  const [rewarded, setRewarded] = useState(video.isRewarded);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  const progressMutation = useMutation({
    mutationFn: (pct: number) =>
      api.post<VideoProgressResponse>(`/tasks/videos/${video.id}/progress`, {
        watchedSeconds: Math.round((pct / 100) * (video.duration ?? 600)),
        percentWatched: pct,
      }),
    onSuccess: (res) => {
      if (res.rewarded && !rewarded) {
        setRewarded(true);
        onComplete();
      }
    },
  });

  useEffect(() => {
    if (!open || rewarded) return;

    const threshold = video.minWatchPercent ?? 60;
    // How many real seconds the user needs the video open to earn the reward
    const secondsNeeded = Math.round((threshold / 100) * (video.duration ?? 600));

    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      const pct = Math.min(
        Math.round((elapsedRef.current / secondsNeeded) * threshold),
        threshold,
      );
      setProgress(pct);

      if (elapsedRef.current >= secondsNeeded) {
        clearInterval(timerRef.current!);
        progressMutation.mutate(threshold);
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open, video.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const threshold = video.minWatchPercent ?? 60;
  const secondsNeeded = Math.round((threshold / 100) * (video.duration ?? 600));
  const secondsLeft = Math.max(secondsNeeded - elapsedRef.current, 0);

  return (
    <Card>
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className="relative w-24 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-900">
          <Image
            src={video.thumbnail ?? `https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`}
            alt={video.title}
            fill
            className="object-cover"
          />
          {!open && !rewarded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="w-7 h-7 bg-red-600 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}
          {rewarded && (
            <div className="absolute inset-0 flex items-center justify-center bg-green-600/80">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium text-gray-900 leading-snug">{video.title}</h3>
            <Badge variant={rewarded ? "info" : "success"} className="flex-shrink-0">
              {rewarded ? "Rewarded ✓" : `+${formatKES(video.reward)}`}
            </Badge>
          </div>
          {video.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{video.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            {!rewarded && (
              <button
                onClick={() => setOpen((v) => !v)}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                {open ? "▲ Hide video" : "▶ Watch to earn"}
              </button>
            )}
            {open && !rewarded && progress > 0 && (
              <span className="text-xs text-gray-400 animate-pulse">
                ● {secondsLeft > 0 ? `${Math.ceil(secondsLeft / 60)}m left` : "Claiming…"}
              </span>
            )}
            {rewarded && (
              <span className="text-xs text-green-600 font-medium">+{formatKES(video.reward)} earned</span>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <Progress
          value={Math.min((progress / threshold) * 100, 100)}
          label={
            rewarded
              ? "Reward claimed!"
              : progress === 0
              ? `Watch ~${Math.ceil(secondsNeeded / 60)} min to earn +${formatKES(video.reward)}`
              : `${progress}% / ${threshold}% — keep watching`
          }
        />
      </div>

      {/* Iframe — React owns this entirely, no third-party DOM mutations */}
      {open && !rewarded && (
        <div className="mt-3 aspect-video rounded-xl overflow-hidden bg-gray-900">
          <iframe
            src={`https://www.youtube.com/embed/${video.youtubeId}?rel=0&modestbranding=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>
      )}

      {rewarded && (
        <div className="mt-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm font-medium text-green-700">+{formatKES(video.reward)} credited to your wallet</p>
        </div>
      )}
    </Card>
  );
}

function TasksSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-24" />
      <div className="h-16 bg-gray-200 rounded-xl" />
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}
      </div>
    </div>
  );
}
