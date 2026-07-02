# Test Plan: Task Tiers & Access Control

Manual test plan for the `feature/task-tiers-and-og-image` feature.
Run against a local stack with seed data loaded.

---

## Setup

```bash
# Start server
cd server && npm run dev

# Start web
cd web && npm run dev

# Seed AI tasks (if not already seeded)
cd server && npx tsx prisma/seed-ai-tasks.ts

# Ensure you have two test accounts:
# - inactive@test.com  — registered user, NO active membership
# - active@test.com    — registered user, WITH active membership
```

---

## A — getTaskAccess helper

These are unit-level checks via direct API calls (curl or REST client).

### A1 — Inactive user: video earn is blocked at API level

```
POST /tasks/videos/:videoId/progress
Auth: inactive user JWT
Body: { watchedSeconds: 600, percentWatched: 100 }

Expected: 403 { error: "Active membership required" }
```

### A2 — Active user: video earn succeeds

```
POST /tasks/videos/:videoId/progress
Auth: active user JWT
Body: { watchedSeconds: 600, percentWatched: 100 }

Expected: 200 { rewarded: true, reward: <amount> }
```

### A3 — Inactive user: AI task content is blocked at GET level

```
GET /tasks/ai/:aiTaskId
Auth: inactive user JWT

Expected: 403 { error: "Active membership required to access AI tasks" }
Pass: response body contains NO prompt, rubric, or options fields
```

### A4 — Active user: AI task content is returned

```
GET /tasks/ai/:aiTaskId
Auth: active user JWT

Expected: 200 with prompt, rubric (if present), options (if present)
```

### A5 — Inactive user: AI task submit is blocked

```
POST /tasks/ai/:aiTaskId/submit
Auth: inactive user JWT
Body: { response: "This is a valid response with more than thirty characters." }

Expected: 403 { error: "Active membership required to access AI tasks" }
Pass: NO AiTaskCompletion row created in DB
```

### A6 — Active user: short response is rejected

```
POST /tasks/ai/:aiTaskId/submit
Auth: active user JWT
Body: { response: "Too short." }

Expected: 400 { error: "Response must be at least 30 characters" }
Pass: NO AiTaskCompletion row created in DB
```

### A7 — Active user: valid submit creates PENDING record, no wallet credit

```
POST /tasks/ai/:aiTaskId/submit
Auth: active user JWT
Body: { response: "This is a sufficient response that exceeds the thirty character minimum." }

Expected: 201 { status: "PENDING", message: "Response submitted for review..." }
Pass:
  - AiTaskCompletion row exists with status=PENDING
  - wallet.virtualBalance is UNCHANGED
  - wallet.totalEarned is UNCHANGED
  - No Transaction row of type AI_TASK_REWARD
```

### A8 — Duplicate submit is rejected

```
POST /tasks/ai/:aiTaskId/submit   (same task, same active user, second time)
Auth: active user JWT

Expected: 409 { error: "You have already submitted this task" }
```

---

## B — Admin approval flow

### B1 — Approve credits wallet

```
1. Submit an AI task as active user (creates PENDING record)
2. As admin: POST /admin/ai-reviews/:completionId/approve  Body: {}
3. Check DB:
   - AiTaskCompletion.status = APPROVED
   - AiTaskCompletion.reviewedAt is set
   - wallet.virtualBalance increased by task.reward
   - Transaction row exists with type=AI_TASK_REWARD
```

### B2 — Reject does not credit wallet

```
1. Submit an AI task as active user (new task, fresh PENDING)
2. As admin: POST /admin/ai-reviews/:completionId/reject  Body: {}
3. Check DB:
   - AiTaskCompletion.status = REJECTED
   - wallet.virtualBalance is UNCHANGED
   - No AI_TASK_REWARD transaction
```

### B3 — Cannot approve/reject a non-PENDING record

```
1. Approve a completion (status becomes APPROVED)
2. POST /admin/ai-reviews/:completionId/approve again

Expected: 409 { error: "Only PENDING submissions can be approved" }
```

---

## C — Existing video task behavior (regression)

### C1 — Inactive user can still open and watch videos

```
UI: Log in as inactive user → /tasks
Pass: Video task cards are visible and expandable
Pass: YouTube player loads
Pass: "Activate your account to claim" prompt appears after video ends
Pass: NO call to /tasks/videos/:id/progress is made (check network tab)
```

### C2 — Active user earns from videos as before

```
UI: Log in as active user → /tasks → watch a video to completion
Pass: "Rewarded" state shown on card
Pass: wallet.virtualBalance increases immediately
Pass: Transaction type is VIDEO_REWARD (not AI_TASK_REWARD)
```

### C3 — Daily limit still applies to video completions

```
As active user: complete 5 video tasks in one day
Expected: 6th attempt returns 429 "Daily limit reached"
Pass: UI shows "All tasks complete for today" progress bar state
```

---

## D — UI states

### D1 — Inactive user sees locked AI task cards

```
UI: Log in as inactive user → /tasks
Pass: AI Data Tasks section is visible
Pass: Each AI task card shows lock icon + "Activate membership to unlock"
Pass: Clicking does NOT open task content
Pass: Activate button links to /wallet
```

### D2 — Active user sees unlocked AI task cards

```
UI: Log in as active user → /tasks
Pass: AI task cards are expandable
Pass: Clicking "Open task" fetches and displays prompt + rubric
Pass: RESPONSE_COMPARISON tasks show side-by-side A/B panels
Pass: Textarea shows live character count
Pass: Submit button is disabled until ≥ 30 characters typed
```

### D3 — Submission status badges appear correctly

```
After submitting an AI task as active user:
Pass: Card shows amber "Pending review" badge
After admin approves:
Pass: Card shows green "Approved" border + badge (after page refresh)
After admin rejects:
Pass: Card shows red "Rejected — retry" badge
```

### D4 — Admin review queue

```
UI: Log in as admin → /admin/tasks → Reviews tab
Pass: Pending submissions appear
Pass: Full response text is visible for review
Pass: Approve button credits user + removes item from queue
Pass: Reject button removes item from queue without crediting
Pass: Queue auto-refreshes every 30s
```

---

## E — OG image

### E1 — OG image renders

```
Browser: GET http://localhost:3000/opengraph-image
Pass: PNG renders with GETPAID logo, "Complete tasks. Start earning." headline,
      slate-50 background, sky-500 accent on "Start earning."
Pass: No 500 error, no broken image
```

### E2 — Meta tags are present

```
Browser: view-source:http://localhost:3000
Pass: <meta property="og:image" content="...opengraph-image..." /> present
Pass: <meta property="og:title" /> present
Pass: <meta name="twitter:card" content="summary_large_image" /> present
```

---

## F — Build

```bash
cd web && npm run build
Pass: 0 TypeScript errors
Pass: All existing routes compile (including /tasks, /admin/tasks)
Pass: opengraph-image route present in build output
```
