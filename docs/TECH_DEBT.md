# Tech Debt

## TD-002 — No formal migration directory; schema applied via `prisma db push`

**Status:** Open — no action blocked today, but must be resolved before any non-additive change.

### Problem

This project has no `prisma/migrations/` directory. All schema changes to date have been applied
via `npx prisma db push`, which diffs the live database against `schema.prisma` and applies
changes directly. There is no migration history, no `prisma migrate deploy` path, and no SQL
audit trail of what changed and when.

**Pre-promotion SQL diff (2026-07-02, commit `0502793`):**

```sql
-- This is an empty migration.
```

Output from `prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script`. The empty result confirms the live Neon DB already matches the target schema — the v0.3.0 schema changes (AiTask, AiTaskCompletion, AI_TASK_REWARD enum) were applied directly to the live DB during development via `db push`. No migration is needed at deploy time for this release, but no formal record of those changes exists.

### Why this is acceptable now

All v0.3.0 schema changes were additive (new tables, new enum values, no modifications to
existing columns). Additive changes applied via `db push` are safe:

- New tables can't break existing queries
- New PostgreSQL enum values (`ALTER TYPE ... ADD VALUE`) are non-transactional but non-destructive on PG 12+
- No existing column types were changed, no columns were dropped

### Why this becomes a problem

Any future **non-additive** change — column rename, column removal, type change, dropping an
enum value, changing a `String?` to a required `String` — cannot be safely applied via
`db push`. Prisma will either refuse (`--accept-data-loss` required) or silently run a
`DROP COLUMN`, which is **unrecoverable without a DB restore**.

There is also no rollback path: if a `db push` fails mid-apply, there is no migration to
revert. Neon's point-in-time recovery is the only backstop, and it's manual.

### What to do before the next non-additive change

1. **Baseline the schema:** Run `prisma migrate diff --from-empty --to-schema-datasource prisma/schema.prisma --script > prisma/migrations/0000_baseline/migration.sql` and create an initial migration that represents the current live schema. Mark it applied in the `_prisma_migrations` table (`prisma migrate resolve --applied 0000_baseline`).

2. **Switch to `prisma migrate dev` for future changes.** All new schema changes go through `migrate dev` (generates SQL, records in `_prisma_migrations`) and deploy via `migrate deploy` (applies only unapplied migrations). Never use `db push` again except against a throwaway local DB.

3. **Add a staging Neon branch.** Neon supports branching — create a `staging` branch that mirrors production. Run `migrate deploy` against it before applying to production. This provides a real dry-run environment.

### Priority

High — block any non-additive schema change until step 1+2 above are done. Steps 1–3 are
a few hours of work and should be done before the next feature that touches the data model.

---

## TD-001 — logo-hero.png: source file too large for web serving

**File:** `web/public/logo-hero.png`  
**Status:** Partially mitigated (resized 2026-07-02); LCP unconfirmed locally (see note); outstanding items below.

### Problem

Original source was 1983×793px at 783 KB. This caused LCP of 4.0s on localhost Lighthouse
run (post main→dev merge). Root cause: `readFileSync` in `web/app/opengraph-image.tsx` loads
the raw file at build time and embeds it as a base64 data URI in the OG image response — so
the full file size directly inflates the OG image payload.

For the nav (`<Image>` component), Next.js serves WebP at the correct display size in
production, so the nav usage is not a problem in prod — but locally there is no CDN
optimization, and the large source hurts dev server feedback.

### What was done

Resized to 600×240px (117 KB) using PowerShell System.Drawing. This covers:
- Landing nav: displayed at 120×48px (2.5× source → fine for 2x screens)
- Dashboard nav: displayed at 100×40px (same ratio)
- Auth pages: displayed at 140×56px
- OG image: displayed at 280×112px inside the 1200×630 canvas

### What "resize before prod" means

This has been done — 600×240 is already the committed version. What still needs to happen
before a public launch:

1. **Convert to WebP for the OG image.** `opengraph-image.tsx` embeds the logo as PNG
   base64. The OG image itself renders as PNG (required by `contentType = "image/png"`), but
   the logo source could be a smaller WebP to reduce the internal data URI size. Requires
   updating `readFileSync` to load a `.webp` variant and changing the `data:` URI prefix.
   Estimated savings: ~50–60% over current PNG (117 KB → ~50 KB for the embedded source).

2. **Add `sizes` prop to nav `<Image>` uses.** `web/app/page.tsx` and
   `web/components/layout/nav.tsx` render the logo without a `sizes` attribute. Next.js
   defaults to 100vw which causes it to generate unnecessarily wide srcset entries. Add
   `sizes="(max-width: 768px) 120px, 120px"` (or appropriate value) to stop over-fetching.

3. **Verify Vercel Image Optimization is enabled.** In production on Vercel, `<Image>` serves
   WebP automatically. Confirm the Vercel project has image optimization enabled (not
   disabled via `unoptimized` prop or `images: { unoptimized: true }` in next.config).
   Current `next.config.ts` has no override — this should be fine, but worth a check.

### LCP note (pre-promotion Lighthouse run, 2026-07-02)

A second Lighthouse run was done on the exact commit being promoted to main, against a local
production build on port 3002. LCP was still 4.0s, but the LCP element snippet was blank —
meaning Lighthouse measured the auth redirect/loading state, not the landing page. Root cause:
the backend is CORS-configured for `localhost:3000`; on port 3002 all API calls fail, so the
app never renders app content. This is a test environment artifact, not a regression.

The resize is still the correct fix. Impact on real LCP can only be confirmed on Vercel where
CDN serves WebP at display size and the CORS configuration matches the actual origin.

### Priority

Low — not blocking launch for a portfolio/learning project. LCP will be fine on Vercel CDN
with image optimization. Revisit if this goes into production with real users.
