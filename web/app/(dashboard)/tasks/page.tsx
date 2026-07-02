"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatKES } from "@/lib/shared";
import Link from "next/link";
import type { TasksResponse, VideoProgressResponse, WalletResponse, VideoWithProgress, AiTaskListItem, AiTask } from "@/lib/types";

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

  const { videos = [], aiTasks = [], completedToday = 0, dailyLimit = 5, canEarnMore = true } = data ?? {};
  const isActivated = !!walletData?.membership?.isActive;
  const atLimit = isActivated && completedToday >= dailyLimit;

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Today&apos;s Tasks</h1>
          <p className="text-sm text-slate-500 mt-0.5">Complete tasks to earn credits.</p>
        </div>
        {isActivated && (
          <Badge variant={atLimit ? "danger" : "default"}>
            {completedToday}/{dailyLimit} done
          </Badge>
        )}
      </div>

      {!isActivated && (
        <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-sky-900">Activate to earn rewards</p>
            <p className="text-xs text-sky-600 mt-0.5">Watch videos free — rewards and AI tasks unlock after activation.</p>
          </div>
          <Link href="/wallet">
            <button className="flex-shrink-0 bg-sky-500 text-white text-xs font-medium px-4 py-2 rounded-md hover:bg-sky-600 transition-colors">
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
                : `${dailyLimit - completedToday} task${dailyLimit - completedToday === 1 ? "" : "s"} remaining`
            }
          />
        </Card>
      )}

      {atLimit && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
          You&apos;ve completed all {dailyLimit} tasks for today. Your earnings have been credited to your wallet.
        </div>
      )}

      {/* Video tasks section */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Video Tasks</h2>
        {videos.length === 0 ? (
          <Card className="text-center py-10">
            <p className="text-sm text-slate-500">No videos available right now. Check back soon.</p>
          </Card>
        ) : (
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
        )}
      </section>

      {/* AI task section */}
      {aiTasks.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">AI Data Tasks</h2>
          <div className="space-y-3">
            {aiTasks.map((task) =>
              task.locked ? (
                <LockedAiTaskCard key={task.id} task={task} />
              ) : (
                <AiTaskCard
                  key={task.id}
                  task={task}
                  onSubmit={() => qc.invalidateQueries({ queryKey: ["tasks"] })}
                />
              )
            )}
          </div>
        </section>
      )}
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
  const [watched, setWatched] = useState(false);
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
    <Card className={cn(rewarded ? "border-l-[3px] border-l-emerald-500" : "")}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => canOpen && setOpen((v) => !v)}
          disabled={!canOpen}
          className="relative w-24 h-16 rounded-md overflow-hidden flex-shrink-0 bg-slate-900 disabled:cursor-default"
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
            <span className="absolute inset-0 flex items-center justify-center bg-emerald-600/80">
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
            <h3 className="text-sm font-medium text-slate-900 leading-snug line-clamp-2">{video.title}</h3>
            {(rewarded || isActivated) && (
              <Badge variant={rewarded ? "info" : "success"} className="flex-shrink-0 whitespace-nowrap">
                {rewarded ? "✓ Done" : `+${formatKES(video.reward)}`}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 mt-2">
            {canOpen && (
              <button onClick={() => setOpen((v) => !v)} className="text-xs font-medium text-sky-600 hover:text-sky-700">
                {open ? "▲ Minimize" : isActivated ? "▶ Watch to earn" : "▶ Watch"}
              </button>
            )}
            {rewarded && <span className="text-xs font-medium text-emerald-600">+{formatKES(video.reward)} earned</span>}
            {isActivated && !canEarnMore && !rewarded && <span className="text-xs text-amber-600">daily limit reached</span>}
          </div>
        </div>
      </div>

      {open && !rewarded && (
        <div className="mt-3">
          {embedError ? (
            <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3 text-sm text-amber-800">
              This video can&apos;t be embedded.{" "}
              <a href={`https://www.youtube.com/watch?v=${video.youtubeId}`} target="_blank" rel="noopener noreferrer" className="font-medium underline">
                Watch on YouTube →
              </a>
            </div>
          ) : (
            <>
              <div className="aspect-video rounded-md overflow-hidden bg-slate-900">
                <div ref={containerRef} className="w-full h-full" />
              </div>
              <p className="mt-2 text-xs text-center text-slate-400">
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

      {watched && !rewarded && !open && (
        <div className="mt-3 bg-sky-50 border border-sky-200 rounded-md px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-sky-900">
            Activate your account to claim +{formatKES(video.reward)}
          </p>
          <Link href="/wallet">
            <button className="flex-shrink-0 bg-sky-500 text-white text-xs font-medium px-4 py-2 rounded-md hover:bg-sky-600 transition-colors">
              Activate
            </button>
          </Link>
        </div>
      )}

      {rewarded && (
        <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-md px-4 py-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm font-medium text-emerald-700">+{formatKES(video.reward)} credited to your wallet</p>
        </div>
      )}
    </Card>
  );
}

const AI_CATEGORY_LABELS: Record<string, string> = {
  RESPONSE_COMPARISON: "Response Comparison",
  DATA_ANNOTATION: "Data Annotation",
  TRANSCRIPTION: "Transcription",
  PROMPT_WRITING: "Prompt Writing",
};

function LockedAiTaskCard({ task }: { task: AiTaskListItem }) {
  return (
    <Card className="opacity-60">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-sm font-medium text-gray-700 truncate">{task.title}</span>
              <Badge variant="secondary">{AI_CATEGORY_LABELS[task.category] ?? task.category}</Badge>
            </div>
            <p className="text-xs text-gray-400">+{formatKES(task.reward)} · Activate membership to unlock</p>
          </div>
        </div>
        <Link href="/wallet" className="flex-shrink-0">
          <button className="bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700 whitespace-nowrap">
            Activate
          </button>
        </Link>
      </div>
    </Card>
  );
}

function AiTaskCard({ task, onSubmit }: { task: AiTaskListItem; onSubmit: () => void }) {
  const [open, setOpen] = useState(false);
  const [fullTask, setFullTask] = useState<AiTask | null>(null);
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const alreadySubmitted = task.submissionStatus !== null;
  const isApproved = task.submissionStatus === "APPROVED";
  const isPending = task.submissionStatus === "PENDING";
  const isRejected = task.submissionStatus === "REJECTED";

  async function handleOpen() {
    if (alreadySubmitted) return;
    setOpen((v) => !v);
    if (!fullTask && !open) {
      try {
        const data = await api.get<AiTask & { submissionStatus: string | null }>(`/tasks/ai/${task.id}`);
        setFullTask(data);
      } catch {}
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post(`/tasks/ai/${task.id}/submit`, { response });
      setOpen(false);
      onSubmit();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className={isApproved ? "border-l-[3px] border-l-green-500" : isPending ? "border-l-[3px] border-l-amber-400" : isRejected ? "border-l-[3px] border-l-red-400" : ""}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-sm font-medium text-gray-900">{task.title}</span>
            <Badge variant="secondary">{AI_CATEGORY_LABELS[task.category] ?? task.category}</Badge>
            {isApproved && <Badge variant="success">Approved</Badge>}
            {isPending && <Badge variant="warning">Pending review</Badge>}
            {isRejected && <Badge variant="danger">Rejected — retry</Badge>}
          </div>
          <p className="text-xs text-gray-500">+{formatKES(task.reward)}</p>
        </div>
        {!alreadySubmitted && (
          <button
            onClick={handleOpen}
            className="flex-shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            {open ? "▲ Collapse" : "▶ Open task"}
          </button>
        )}
      </div>

      {open && !alreadySubmitted && (
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
          {!fullTask ? (
            <div className="h-20 bg-gray-100 rounded animate-pulse" />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Task</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{fullTask.prompt}</p>
              </div>
              {fullTask.rubric && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Instructions</p>
                  <p className="text-xs text-gray-600 whitespace-pre-wrap">{fullTask.rubric}</p>
                </div>
              )}
              {fullTask.category === "RESPONSE_COMPARISON" && fullTask.options && (
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-xs font-bold text-gray-500 mb-1">Response A</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{fullTask.options.a}</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-xs font-bold text-gray-500 mb-1">Response B</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{fullTask.options.b}</p>
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Your response</label>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  rows={5}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  placeholder="Write your response here (min. 30 characters)…"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">{response.length} characters</p>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading || response.trim().length < 30}
                className="bg-blue-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Submitting…" : "Submit for review"}
              </button>
            </form>
          )}
        </div>
      )}
    </Card>
  );
}

function TasksSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-slate-200 rounded w-40" />
      <div className="h-4 bg-slate-200 rounded w-60" />
      <div className="h-16 bg-slate-200 rounded-lg" />
      <div className="space-y-4">
        {[...Array(15)].map((_, i) => (
          <div key={i} className="h-28 bg-slate-200 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
