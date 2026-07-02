"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatKES } from "@/lib/shared";
import type { Task, Video } from "@/lib/types";

export default function AdminTasksPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"tasks" | "videos">("tasks");

  const { data: tasks = [] } = useQuery({ queryKey: ["admin-tasks"], queryFn: () => api.get<Task[]>("/admin/tasks") });
  const { data: videos = [] } = useQuery({ queryKey: ["admin-videos"], queryFn: () => api.get<Video[]>("/admin/videos") });

  const [taskError, setTaskError] = useState("");
  const [videoError, setVideoError] = useState("");

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Tasks & Videos</h1>

      <div className="flex gap-1 border-b border-slate-200">
        {(["tasks", "videos"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-sky-500 text-sky-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t === "tasks" ? `Engagement Tasks (${tasks.length})` : `Video Tasks (${videos.length})`}
          </button>
        ))}
      </div>

      {tab === "tasks" && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-base font-semibold text-slate-900 mb-4">Create Task</h2>
            <form onSubmit={handleCreateTask} className="grid sm:grid-cols-2 gap-3">
              <Input label="Title" name="title" placeholder="Like the post" required />
              <Input label="Description" name="description" placeholder="What users need to do" required />
              <Input label="Reward (KES)" name="reward" type="number" min="1" placeholder="10" required />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
                <select name="type" className="w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors bg-white text-slate-900" required>
                  <option value="DAILY_LOGIN">Daily Login</option>
                  <option value="LIKE_POST">Like Post</option>
                  <option value="VIEW_CONTENT">View Content</option>
                  <option value="QUIZ_COMPLETION">Quiz</option>
                  <option value="CUSTOM">Custom</option>
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
            <h2 className="text-base font-semibold text-slate-900 mb-4">All Tasks</h2>
            <ul className="divide-y divide-slate-100">
              {tasks.map((task) => (
                <li key={task.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-900">{task.title}</p>
                      <Badge variant="secondary">{task.type}</Badge>
                      <Badge variant="success">+{formatKES(task.reward)}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>
                  </div>
                  <p className="text-xs text-slate-400 flex-shrink-0">max {task.maxPerDay}/day</p>
                </li>
              ))}
              {tasks.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No tasks yet</p>}
            </ul>
          </Card>
        </div>
      )}

      {tab === "videos" && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-base font-semibold text-slate-900 mb-4">Add Video</h2>
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
            <h2 className="text-base font-semibold text-slate-900 mb-4">All Videos</h2>
            <ul className="divide-y divide-slate-100">
              {videos.map((video) => (
                <li key={video.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900 truncate">{video.title}</p>
                      <Badge variant="success">+{formatKES(video.reward)}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{video.youtubeId}</p>
                  </div>
                  <a href={`https://youtu.be/${video.youtubeId}`} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-600 hover:underline flex-shrink-0">Watch →</a>
                </li>
              ))}
              {videos.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No videos yet</p>}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
