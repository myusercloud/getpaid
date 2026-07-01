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

// ── YT IFrame API singleton ────────────────────────────────────────────────
const ytCallbacks: Array<() => void> = [];
let ytReady = false;
let ytLoading = false;

function onYTReady(cb: () => void) {
  if (ytReady) { cb(); return; }
  ytCallbacks.push(cb);
  if (ytLoading) return;
  ytLoading = true;
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
  (window as any).onYouTubeIframeAPIReady = () => {
    ytReady = true;
    ytCallbacks.splice(0).forEach((fn) => fn());
  };
}

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
  const isActivated = !!walletData?.membership?.isActive;
  const atLimit = isActivated && completedToday >= dailyLimit;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Today's Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">Watch videos to earn virtual credits. New videos every day.</p>
        </div>
        {isActivated && (
          <Badge variant={atLimit ? "danger" : "default"}>
            {completedToday}/{dailyLimit} done
          </Badge>
        )}
      </div>

      {!isActivated && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-900">Activate to earn rewards</p>
            <p className="text-xs text-blue-600 mt-0.5">You can watch all videos — rewards are unlocked after activation.</p>
          </div>
          <Link href="/wallet">
            <button className="flex-shrink-0 bg-blue-600 text-white text-xs font-medium px-4 py-2 rounded-xl hover:bg-blue-700">
              Activate
            </button>
          </Link>
        </div>
      )}

      {isActivated && (
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
      )}

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
            isActivated={isActivated}
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

function VideoTaskCard({
  index,
  video,
  isActivated,
  canEarnMore,
  onComplete,
}: {
  index: number;
  video: VideoWithProgress;
  isActivated: boolean;
  canEarnMore: boolean;
  onComplete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [rewarded, setRewarded] = useState(video.isRewarded);
  const [watched, setWatched] = useState(false); // video ended, not yet activated
  const [embedError, setEmbedError] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  const completeMutation = useMutation({
    mutationFn: () =>
      api.post<VideoProgressResponse>(`/tasks/videos/${video.id}/progress`, {
        watchedSeconds: video.duration ?? 600,
        percentWatched: 100,
      }),
    onSuccess: (res) => {
      if (res.rewarded) {
        setRewarded(true);
        setOpen(false);
        onComplete();
      }
    },
  });

  useEffect(() => {
    if (!open || rewarded || !containerRef.current) return;

    let active = true;
    setEmbedError(false);

    onYTReady(() => {
      if (!active || !containerRef.current) return;

      playerRef.current = new (window as any).YT.Player(containerRef.current, {
        videoId: video.youtubeId,
        width: "100%",
        height: "100%",
        playerVars: { rel: 0, modestbranding: 1, origin: window.location.origin },
        events: {
          onStateChange: ({ data }: { data: number }) => {
            if (data === 0 && active) {
              if (isActivated) {
                completeMutation.mutate();
              } else {
                setWatched(true);
                setOpen(false);
              }
            }
          },
          onError: () => { if (active) setEmbedError(true); },
        },
      });
    });

    return () => {
      active = false;
      try { playerRef.current?.destroy?.(); } catch {}
      playerRef.current = null;
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const canOpen = !rewarded && (!isActivated || canEarnMore);

  return (
    <Card>
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => canOpen && setOpen((v) => !v)}
          disabled={!canOpen}
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

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">{video.title}</h3>
            {(rewarded || isActivated) && (
              <Badge variant={rewarded ? "info" : "success"} className="flex-shrink-0 whitespace-nowrap">
                {rewarded ? "✓ Done" : `+${formatKES(video.reward)}`}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 mt-2">
            {canOpen && (
              <button onClick={() => setOpen((v) => !v)} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                {open ? "▲ Minimize" : isActivated ? "▶ Watch to earn" : "▶ Watch"}
              </button>
            )}
            {rewarded && <span className="text-xs font-medium text-green-600">+{formatKES(video.reward)} earned</span>}
            {isActivated && !canEarnMore && !rewarded && <span className="text-xs text-amber-600">daily limit reached</span>}
          </div>
        </div>
      </div>

      {/* Player */}
      {open && !rewarded && (
        <div className="mt-3">
          {embedError ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
              This video can't be embedded.{" "}
              <a href={`https://www.youtube.com/watch?v=${video.youtubeId}`} target="_blank" rel="noopener noreferrer" className="font-medium underline">
                Watch on YouTube →
              </a>
            </div>
          ) : (
            <>
              <div className="aspect-video rounded-xl overflow-hidden bg-gray-900">
                <div ref={containerRef} className="w-full h-full" />
              </div>
              <p className="mt-2 text-xs text-center text-gray-400">
                {completeMutation.isPending
                  ? "Crediting reward…"
                  : isActivated
                  ? `Watch the full video to earn +${formatKES(video.reward)}`
                  : "Watch the full video — activate your account to claim the reward"}
              </p>
            </>
          )}
        </div>
      )}

      {/* Activate prompt — shown after an unactivated user finishes a video */}
      {watched && !rewarded && !open && (
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-blue-900">
            Activate your account to claim +{formatKES(video.reward)}
          </p>
          <Link href="/wallet">
            <button className="flex-shrink-0 bg-blue-600 text-white text-xs font-medium px-4 py-2 rounded-xl hover:bg-blue-700">
              Activate
            </button>
          </Link>
        </div>
      )}

      {/* Reward banner — activated users only */}
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
