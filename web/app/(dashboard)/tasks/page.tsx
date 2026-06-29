"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
      setTimeout(() => setRewardFlash(null), 2000);
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (err, { taskId }) => {
      setPendingTasks((p) => { const s = new Set(p); s.delete(taskId); return s; });
      setTaskErrors((p) => ({ ...p, [taskId]: err instanceof ApiError ? err.message : "Failed" }));
    },
  });

  async function handleComplete(taskId: string) {
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

function VideoTaskCard({ video, onComplete }: { video: VideosResponse["videos"][number]; onComplete: () => void }) {
  const iframeId = `yt-${video.id}`;
  const [progress, setProgress] = useState(video.percentWatched ?? 0);
  const [rewarded, setRewarded] = useState(video.isRewarded);

  const progressMutation = useMutation({
    mutationFn: (pct: number) =>
      api.post<VideoProgressResponse>(`/tasks/videos/${video.id}/progress`, { watchedSeconds: 0, percentWatched: pct }),
    onSuccess: (res) => {
      if (res.rewarded && !rewarded) { setRewarded(true); onComplete(); }
    },
  });

  useEffect(() => {
    if (rewarded) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let player: any = null;
    let interval: ReturnType<typeof setInterval>;

    function startPolling() {
      interval = setInterval(() => {
        try {
          const duration = player?.getDuration() ?? 0;
          const current = player?.getCurrentTime() ?? 0;
          if (duration > 0) {
            const pct = Math.round((current / duration) * 100);
            setProgress(pct);
            if (pct >= (video.minWatchPercent ?? 80)) progressMutation.mutate(pct);
          }
        } catch { /* ignore */ }
      }, 5000);
    }

    function initPlayer() {
      player = new window.YT.Player(iframeId, { events: { onReady: startPolling } });
    }

    if (window.YT?.Player) {
      initPlayer();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); initPlayer(); };
      if (!document.getElementById("yt-api-script")) {
        const s = document.createElement("script");
        s.id = "yt-api-script";
        s.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(s);
      }
    }

    return () => { clearInterval(interval); try { player?.destroy(); } catch { /* ignore */ } };
  }, [video.id, rewarded]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-medium text-gray-900">{video.title}</h3>
          {video.description && <p className="text-xs text-gray-500 mt-0.5">{video.description}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="success">+{formatKES(video.reward)}</Badge>
          {rewarded && <Badge variant="info">Rewarded ✓</Badge>}
        </div>
      </div>
      <div className="aspect-video rounded-lg overflow-hidden bg-gray-900">
        <iframe
          id={iframeId}
          src={`https://www.youtube.com/embed/${video.youtubeId}?enablejsapi=1`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
      <div className="mt-3">
        <Progress
          value={Math.min(progress, 100)}
          label={rewarded ? "Reward claimed!" : `Watch at least ${video.minWatchPercent ?? 80}% to earn +${formatKES(video.reward)}`}
        />
      </div>
    </Card>
  );
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { YT: any; onYouTubeIframeAPIReady: () => void; }
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
