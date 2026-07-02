# Task Categories

## Overview

GETPAID supports two families of tasks. They share a daily completion limit
but differ in access rules and reward timing.

| Family | Model | Access | Earn gate | Reward timing |
|--------|-------|--------|-----------|---------------|
| Video tasks | `Video` + `VideoWatch` | All users (watch only) | Active membership | Immediate on video completion |
| AI data tasks | `AiTask` + `AiTaskCompletion` | Active members only | Active membership | On admin approval (PENDING → APPROVED) |

---

## Video Tasks

**Who can watch:** Everyone, regardless of membership status.

**Who earns:** Only users with an active `Membership` record (`isActive: true`).

**How the earn gate works:** The client checks `membership.isActive` from the
wallet query and only calls `POST /tasks/videos/:id/progress` if the user is
active. The server enforces the same check and returns 403 if an inactive user
reaches the endpoint directly.

**Daily limit:** Completions count toward `DAILY_TASK_LIMIT` (currently 5),
shared with AI tasks. Defined in `server/src/lib/constants.ts`.

---

## AI Data Task Categories

All four categories require active membership to view content or submit.
An inactive user sees the task card (title, category, reward amount) but
cannot open it. Clicking shows an "Activate membership to unlock" prompt.

### RESPONSE_COMPARISON
Given two AI-generated answers to the same prompt, the worker picks the
better one and explains why. Good for preference data and RLHF pipelines.

Schema: requires `options: { a: string, b: string }` in the `AiTask.options`
JSON field. The UI renders them side-by-side.

### DATA_ANNOTATION
Worker tags, labels, or classifies content against a rubric. Covers sentiment
labeling, named entity recognition, instruction-following scoring, etc.

Schema: `prompt` contains the content to annotate; `rubric` contains the
labeling guide. `options` is null.

### TRANSCRIPTION
Worker corrects or formats a speech-to-text transcript, or labels speaker
turns in a multi-party recording.

Schema: `prompt` contains the raw/incorrect transcript; `rubric` contains
correction instructions. `options` is null.

### PROMPT_WRITING
Worker writes a prompt or scenario against a spec. Used to build prompt
datasets for instruction tuning.

Schema: `prompt` describes what the worker must produce; `rubric` specifies
the quality criteria and required elements. `options` is null.

---

## Access Control

Single source of truth: `getTaskAccess(userId)` in
`server/src/modules/tasks/tasks.service.ts`.

```ts
{ canAccessVideo: true, canEarnVideo: boolean, canAccessAiTask: boolean }
```

- `canAccessVideo` is always `true` — watching is never gated.
- `canEarnVideo` = `canAccessAiTask` = `membership.isActive`.
- Every server handler that touches membership calls this one function.
  No second `db.membership.findUnique()` call exists elsewhere in task code.

### Server enforcement points

| Endpoint | Gate |
|----------|------|
| `GET /tasks` | None — returns `locked: true` flag for AI tasks; list always visible |
| `GET /tasks/ai/:id` | 403 if `!canAccessAiTask` — content never returned |
| `POST /tasks/ai/:id/submit` | 403 if `!canAccessAiTask` |
| `POST /tasks/videos/:id/progress` | 403 if `!canEarnVideo` |
| `POST /tasks/:id/complete` | 403 if `!canEarnVideo` |

---

## Completion Lifecycle

### Video tasks (immediate)

```
Watch video → POST /tasks/videos/:id/progress (percentWatched ≥ minWatchPercent)
→ $transaction: VideoWatch.rewarded=true + TaskCompletion + wallet credit
```

### AI tasks (deferred)

```
Open task → POST /tasks/ai/:id/submit (min 30 chars)
→ AiTaskCompletion created with status=PENDING (no wallet credit)

Admin reviews in /admin → AI Reviews tab
→ POST /admin/ai-reviews/:id/approve
→ $transaction: AiTaskCompletion.status=APPROVED + wallet credit (AI_TASK_REWARD)

or → POST /admin/ai-reviews/:id/reject
→ AiTaskCompletion.status=REJECTED (no credit; user may see Rejected badge)
```

---

## Seed Data

12 example tasks (`[SEED]` prefix), 3 per category. Run:

```bash
cd server && npx tsx prisma/seed-ai-tasks.ts
```

Safe to re-run (upsert by title). Use these to test UI states without
creating production content.

---

## Open Decisions (follow-up required)

1. **Daily limit scope for AI tasks:** PENDING submissions currently count
   toward `DAILY_TASK_LIMIT` (5/day shared with video tasks) to prevent
   gaming. Confirm whether AI tasks should have a separate limit.

2. **Per-category payout:** All AI tasks default to KES 5. Confirm whether
   harder categories (e.g. RESPONSE_COMPARISON with reasoning) should pay more.

3. **REJECTED task retry:** Currently a REJECTED submission sets a permanent
   unique-constraint record, so the user cannot re-submit. Decide: should
   REJECTED allow a retry (delete the record and re-open the task)?

4. **Task rotation:** AI tasks are a static admin-managed pool. No expiry or
   daily rotation. Flag if you want rotation behaviour.

5. **QA workflow:** No multi-stage review or inter-rater agreement. Approve/
   Reject is a single admin action. Add a second-reviewer step if needed for
   production data quality.
