"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatKES } from "@/lib/shared";
import type { Task, Video, AiTask, AiTaskCompletion } from "@/lib/types";

const AI_CATEGORY_LABELS: Record<string, string> = {
  RESPONSE_COMPARISON: "Response Comparison",
  DATA_ANNOTATION: "Data Annotation",
  TRANSCRIPTION: "Transcription",
  PROMPT_WRITING: "Prompt Writing",
};

export default function AdminTasksPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"tasks" | "videos" | "ai-tasks" | "ai-reviews">("tasks");

  const { data: tasks = [] } = useQuery({ queryKey: ["admin-tasks"], queryFn: () => api.get<Task[]>("/admin/tasks") });
  const { data: videos = [] } = useQuery({ queryKey: ["admin-videos"], queryFn: () => api.get<Video[]>("/admin/videos") });
  const { data: aiTasks = [] } = useQuery({ queryKey: ["admin-ai-tasks"], queryFn: () => api.get<(AiTask & { _count: { completions: number } })[]>("/admin/ai-tasks") });
  const { data: aiReviews = [] } = useQuery({ queryKey: ["admin-ai-reviews"], queryFn: () => api.get<AiTaskCompletion[]>("/admin/ai-reviews"), refetchInterval: 30_000 });

  const [taskError, setTaskError] = useState("");
  const [videoError, setVideoError] = useState("");
  const [aiTaskError, setAiTaskError] = useState("");

  const createTaskMutation = useMutation({
    mutationFn: (body: object) => api.post("/admin/tasks", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-tasks"] }); setTaskError(""); },
    onError: (err) => setTaskError(err instanceof ApiError ? err.message : "Failed"),
  });

  const createVideoMutation = useMutation({
    mutationFn: (body: object) => api.post("/admin/videos", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-videos"] }); setVideoError(""); },
    onError: (err) => setVideoError(err instanceof ApiError ? err.message : "Failed"),
  });

  const createAiTaskMutation = useMutation({
    mutationFn: (body: object) => api.post("/admin/ai-tasks", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-ai-tasks"] }); setAiTaskError(""); },
    onError: (err) => setAiTaskError(err instanceof ApiError ? err.message : "Failed"),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/ai-reviews/${id}/approve`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-ai-reviews"] }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/ai-reviews/${id}/reject`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-ai-reviews"] }),
  });

  function handleCreateTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    createTaskMutation.mutate({ title: f.get("title"), description: f.get("description"), reward: Number(f.get("reward")), type: f.get("type"), maxPerDay: Number(f.get("maxPerDay")) || 1, cooldownHours: Number(f.get("cooldownHours")) || 0, contentUrl: f.get("contentUrl") || undefined });
    (e.target as HTMLFormElement).reset();
  }

  function handleCreateVideo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    createVideoMutation.mutate({ title: f.get("title"), description: f.get("description") || undefined, youtubeId: f.get("youtubeId"), reward: Number(f.get("reward")), duration: Number(f.get("duration")) || 600, minWatchPercent: Number(f.get("minWatchPercent")) || 80 });
    (e.target as HTMLFormElement).reset();
  }

  function handleCreateAiTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const category = f.get("category") as string;
    const optionA = (f.get("optionA") as string).trim();
    const optionB = (f.get("optionB") as string).trim();
    const body: Record<string, unknown> = {
      title: f.get("title"),
      description: f.get("description") || undefined,
      category,
      prompt: f.get("prompt"),
      rubric: f.get("rubric") || undefined,
      reward: Number(f.get("reward")),
    };
    if (category === "RESPONSE_COMPARISON" && optionA && optionB) {
      body.options = { a: optionA, b: optionB };
    }
    createAiTaskMutation.mutate(body);
    (e.target as HTMLFormElement).reset();
  }

  const pendingCount = aiReviews.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Tasks & Videos</h1>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {([
          { key: "tasks", label: `Engagement (${tasks.length})` },
          { key: "videos", label: `Videos (${videos.length})` },
          { key: "ai-tasks", label: `AI Tasks (${aiTasks.length})` },
          { key: "ai-reviews", label: `Reviews${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "tasks" && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Create Task</h2>
            <form onSubmit={handleCreateTask} className="grid sm:grid-cols-2 gap-3">
              <Input label="Title" name="title" placeholder="Like the post" required />
              <Input label="Description" name="description" placeholder="What users need to do" required />
              <Input label="Reward (KES)" name="reward" type="number" min="1" placeholder="10" required />
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select name="type" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                  <option value="DAILY_LOGIN">Daily Login</option><option value="LIKE_POST">Like Post</option><option value="VIEW_CONTENT">View Content</option><option value="QUIZ_COMPLETION">Quiz</option><option value="CUSTOM">Custom</option>
                </select>
              </div>
              <Input label="Max per day" name="maxPerDay" type="number" min="1" placeholder="1" />
              <Input label="Cooldown hours" name="cooldownHours" type="number" min="0" placeholder="0" />
              <div className="sm:col-span-2"><Input label="Content URL (optional)" name="contentUrl" placeholder="https://..." /></div>
              {taskError && <p className="sm:col-span-2 text-sm text-red-600">{taskError}</p>}
              <div className="sm:col-span-2"><Button type="submit" loading={createTaskMutation.isPending}>Create task</Button></div>
            </form>
          </Card>
          <Card>
            <h2 className="text-base font-semibold text-gray-900 mb-4">All Tasks</h2>
            <ul className="divide-y divide-gray-100">
              {tasks.map((task) => (
                <li key={task.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap"><p className="text-sm font-medium text-gray-900">{task.title}</p><Badge variant="secondary">{task.type}</Badge><Badge variant="success">+{formatKES(task.reward)}</Badge></div>
                    <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>
                  </div>
                  <p className="text-xs text-gray-400 flex-shrink-0">max {task.maxPerDay}/day</p>
                </li>
              ))}
              {tasks.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No tasks yet</p>}
            </ul>
          </Card>
        </div>
      )}

      {tab === "videos" && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Add Video</h2>
            <form onSubmit={handleCreateVideo} className="grid sm:grid-cols-2 gap-3">
              <Input label="Title" name="title" placeholder="Video title" required />
              <Input label="YouTube ID" name="youtubeId" placeholder="dQw4w9WgXcQ" required />
              <Input label="Description" name="description" placeholder="Optional" />
              <Input label="Reward (KES)" name="reward" type="number" min="1" placeholder="25" required />
              <Input label="Duration (seconds)" name="duration" type="number" min="1" placeholder="600" />
              <Input label="Min watch %" name="minWatchPercent" type="number" min="10" max="100" placeholder="80" />
              {videoError && <p className="sm:col-span-2 text-sm text-red-600">{videoError}</p>}
              <div className="sm:col-span-2"><Button type="submit" loading={createVideoMutation.isPending}>Add video</Button></div>
            </form>
          </Card>
          <Card>
            <h2 className="text-base font-semibold text-gray-900 mb-4">All Videos</h2>
            <ul className="divide-y divide-gray-100">
              {videos.map((video) => (
                <li key={video.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><p className="text-sm font-medium text-gray-900 truncate">{video.title}</p><Badge variant="success">+{formatKES(video.reward)}</Badge></div>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{video.youtubeId}</p>
                  </div>
                  <a href={`https://youtu.be/${video.youtubeId}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex-shrink-0">Watch →</a>
                </li>
              ))}
              {videos.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No videos yet</p>}
            </ul>
          </Card>
        </div>
      )}

      {tab === "ai-tasks" && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Create AI Task</h2>
            <form onSubmit={handleCreateAiTask} className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <Input label="Title" name="title" placeholder="Compare AI responses" required />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select name="category" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                    {Object.entries(AI_CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <Input label="Reward (KES)" name="reward" type="number" min="1" placeholder="5" required />
                <Input label="Description (optional)" name="description" placeholder="Brief summary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prompt / Task content</label>
                <textarea name="prompt" rows={3} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="The task content shown to the worker…" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rubric / Instructions (optional)</label>
                <textarea name="rubric" rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Grading criteria or additional instructions…" />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Response A (RESPONSE_COMPARISON only)</label>
                  <textarea name="optionA" rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="First AI response…" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Response B</label>
                  <textarea name="optionB" rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Second AI response…" />
                </div>
              </div>
              {aiTaskError && <p className="text-sm text-red-600">{aiTaskError}</p>}
              <Button type="submit" loading={createAiTaskMutation.isPending}>Create AI task</Button>
            </form>
          </Card>
          <Card>
            <h2 className="text-base font-semibold text-gray-900 mb-4">All AI Tasks</h2>
            <ul className="divide-y divide-gray-100">
              {aiTasks.map((task) => (
                <li key={task.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-medium text-gray-900">{task.title}</p>
                      <Badge variant="secondary">{AI_CATEGORY_LABELS[task.category] ?? task.category}</Badge>
                      <Badge variant="success">+{formatKES(task.reward)}</Badge>
                      {!task.isActive && <Badge variant="danger">Inactive</Badge>}
                    </div>
                    <p className="text-xs text-gray-400">{(task as any)._count?.completions ?? 0} submissions</p>
                  </div>
                </li>
              ))}
              {aiTasks.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No AI tasks yet</p>}
            </ul>
          </Card>
        </div>
      )}

      {tab === "ai-reviews" && (
        <div className="space-y-4">
          {aiReviews.length === 0 ? (
            <Card className="text-center py-10">
              <p className="text-sm text-gray-400">No pending submissions</p>
            </Card>
          ) : (
            aiReviews.map((review) => (
              <Card key={review.id}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-medium text-gray-900">{review.aiTask.title}</span>
                      <Badge variant="secondary">{AI_CATEGORY_LABELS[review.aiTask.category] ?? review.aiTask.category}</Badge>
                      <Badge variant="success">+{formatKES(review.reward)}</Badge>
                    </div>
                    <p className="text-xs text-gray-500">{review.user.name} · {review.user.email}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => approveMutation.mutate(review.id)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      className="bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => rejectMutation.mutate(review.id)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      className="bg-red-100 text-red-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-red-200 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Response</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{review.response}</p>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
