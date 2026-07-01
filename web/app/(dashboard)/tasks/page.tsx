"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatKES } from "@/lib/shared";
import Link from "next/link";
import type { TasksResponse, VideoProgressResponse, WalletResponse, VideoWithProgress } from "@/lib/types";

export default function TasksPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get<TasksResponse>("/tasks"),
  });
  const { data: walletData } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => api.get<WalletResponse>("/wallet"),
  });

  if (isLoading) return <TasksSkeleton />;

  const { videos = [], completedToday = 0, dailyLimit = 5, canEarnMore = true } = data ?? {};
  const membership = walletData?.membership;
  const atLimit = completedToday >= dailyLimit;

  if (!membership?.isActive) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">Tasks</h1>
        <Card className="text-center py-10">
          <p className="text-lg font-medium text-gray-800 mb-2">Membership required</p>
          <p className="text-sm text-gray-500 mb-4">
            Activate your GETPAID membership to access tasks and earn virtual credits.
          </p>
          <Link href="/wallet">
            <button className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-gray-800">
              Activate membership
            </button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Today's Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">Watch videos to earn virtual credits. New videos every day.</p>
        </div>
        <Badge variant={atLimit ? "danger" : "default"}>
          {completedToday}/{dailyLimit} done
        </Badge>
      </div>

      <Card className="p-4">
        <Progress
          value={(completedToday / dailyLimit) * 100}
          label={
            atLimit
              ? "All tasks complete for today — come back tomorrow!"
              : `${dailyLimit - completedToday} video${dailyLimit - completedToday === 1 ? "" : "s"} remaining`
          }
        />
      </Card>

      {atLimit && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          You've completed all {dailyLimit} tasks for today. Your earnings have been credited to your wallet.
        </div>
      )}

      {videos.length === 0 && (
        <Card className="text-center py-10">
          <p className="text-sm text-gray-500">No videos available right now. Check back soon.</p>
        </Card>
      )}

      <div className="space-y-4">
        {videos.map((video, i) => (
          <VideoTaskCard
            key={video.id}
            index={i + 1}
            video={video}
            canEarnMore={canEarnMore}
            onComplete={() => {
              qc.invalidateQueries({ queryKey: ["tasks"] });
              qc.invalidateQueries({ queryKey: ["wallet"] });
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── VideoTaskCard ──────────────────────────────────────────────────────────
// Plain <iframe> with enablejsapi=1 so YouTube broadcasts state changes via
// postMessage. We listen on window, filter by e.source so multiple open cards
// don't cross-talk, and only tick the timer when state === 1 (PLAYING).
// This means the progress bar only advances while the video is actually playing —
// pausing the video pauses the timer.

function VideoTaskCard({
  index,
  video,
  canEarnMore,
  onComplete,
}: {
  index: number;
  video: VideoWithProgress;
  canEarnMore: boolean;
  onComplete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(video.percentWatched);
  const [rewarded, setRewarded] = useState(video.isRewarded);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  const threshold = video.minWatchPercent ?? 60;
  const secondsNeeded = Math.round((threshold / 100) * (video.duration ?? 600));

  const progressMutation = useMutation({
    mutationFn: (pct: number) =>
      api.post<VideoProgressResponse>(`/tasks/videos/${video.id}/progress`, {
        watchedSeconds: Math.round((pct / 100) * (video.duration ?? 600)),
        percentWatched: pct,
      }),
    onSuccess: (res) => {
      if (res.rewarded) {
        setRewarded(true);
        setOpen(false);
        onComplete();
      }
    },
  });

  // Listen for YouTube postMessage state changes.
  // e.source === iframeRef.current.contentWindow ensures we only react to
  // events from THIS card's iframe, not other open cards on the page.
  useEffect(() => {
    if (!open || rewarded) return;

    function handleMessage(e: MessageEvent) {
      if (!e.origin.includes("youtube")) return;
      if (e.source !== iframeRef.current?.contentWindow) return;
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        // onStateChange info: -1=unstarted 0=ended 1=playing 2=paused 3=buffering
        if (data.event === "onStateChange") {
          setIsPlaying(data.info === 1);
        }
      } catch {}
    }

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      setIsPlaying(false);
    };
  }, [open, rewarded]);

  // Timer only ticks while the video is in PLAYING state.
  useEffect(() => {
    if (!isPlaying || rewarded) return;

    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      const pct = Math.min(
        Math.round((elapsedRef.current / secondsNeeded) * threshold),
        threshold,
      );
      setProgress(pct);

      if (elapsedRef.current >= secondsNeeded) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        progressMutation.mutate(threshold);
      }
    }, 1000);

    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };
  }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tell YouTube we're listening after the iframe loads — this opens the
  // postMessage channel so state change events start flowing.
  function handleIframeLoad() {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "listening" }),
      "*",
    );
  }

  const secondsLeft = Math.max(secondsNeeded - elapsedRef.current, 0);
  const minLeft = Math.ceil(secondsLeft / 60);

  return (
    <Card>
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Thumbnail */}
        <button
          onClick={() => !rewarded && canEarnMore && setOpen((v) => !v)}
          disabled={rewarded || !canEarnMore}
          className="relative w-24 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-900 disabled:cursor-default"
        >
          <Image
            src={video.thumbnail ?? `https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`}
            alt=""
            fill
            className="object-cover"
            unoptimized
          />
          {!open && !rewarded && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>
          )}
          {rewarded && (
            <span className="absolute inset-0 flex items-center justify-center bg-green-600/80">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </span>
          )}
          <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            #{index}
          </span>
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">{video.title}</h3>
            <Badge variant={rewarded ? "info" : "success"} className="flex-shrink-0 whitespace-nowrap">
              {rewarded ? "✓ Done" : `+${formatKES(video.reward)}`}
            </Badge>
          </div>

          <div className="flex items-center gap-3 mt-2">
            {!rewarded && canEarnMore && (
              <button
                onClick={() => setOpen((v) => !v)}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                {open ? "▲ Minimize" : "▶ Watch to earn"}
              </button>
            )}
            {open && !rewarded && isPlaying && (
              <span className="text-xs text-green-600 animate-pulse">
                ● {secondsLeft > 0 ? `${minLeft}m left` : "Claiming reward…"}
              </span>
            )}
            {open && !rewarded && !isPlaying && progress === 0 && (
              <span className="text-xs text-gray-400">Press ▶ in the video to start</span>
            )}
            {open && !rewarded && !isPlaying && progress > 0 && (
              <span className="text-xs text-gray-400">⏸ paused — resume to continue</span>
            )}
            {rewarded && (
              <span className="text-xs font-medium text-green-600">+{formatKES(video.reward)} earned</span>
            )}
            {!canEarnMore && !rewarded && (
              <span className="text-xs text-amber-600">daily limit reached</span>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {!rewarded && (
        <div className="mt-3">
          <Progress
            value={Math.min((progress / threshold) * 100, 100)}
            label={
              progress === 0
                ? `Watch ~${Math.ceil(secondsNeeded / 60)} min to earn +${formatKES(video.reward)}`
                : `${Math.round(progress)}% / ${threshold}% watched`
            }
          />
        </div>
      )}

      {/* Video player — enablejsapi=1 opens the postMessage channel */}
      {open && !rewarded && (
        <div className="mt-3 aspect-video rounded-xl overflow-hidden bg-gray-900">
          <iframe
            ref={iframeRef}
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?enablejsapi=1&rel=0&modestbranding=1`}
            title={video.title}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={handleIframeLoad}
            className="w-full h-full border-0"
          />
        </div>
      )}

      {/* Reward banner */}
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
      <div className="h-8 bg-gray-200 rounded w-40" />
      <div className="h-4 bg-gray-200 rounded w-60" />
      <div className="h-16 bg-gray-200 rounded-xl" />
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-200 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
