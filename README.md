# Manabii

**Every day, a little more Japanese.**

Manabii is a Japanese-language learning platform supporting structured study from
JLPT N5 up to N1. The initial release targets a functional JLPT N5 learning
experience.

Learning modules are planned across Kotoba (vocabulary), Bunpou (grammar), Kanji,
Dokkai (reading), Sakubun (writing), Choukai (listening), Kaiwa (speaking), JLPT
practice, learning progress, and the AI Tutor.

## Current Status

Early foundation. Implemented today:

- Next.js App Router shell with the Manabii brand identity (tokens, logo assets,
  metadata, favicon).
- PostgreSQL + Prisma 7 data layer with a reviewed initial migration and the
  `User` / `Role` authorization core.
- Google OAuth sign-in through Auth.js v4 (`next-auth@4.24.15`) with a
  PostgreSQL-backed Prisma adapter and database sessions. Sessions carry the
  user's UUID and role for presentation only.
- Server-side authorization: a PostgreSQL-authoritative `requireUser()` gate, a
  ranked role ladder, and two consuming endpoints (`GET /api/me` and an
  ADMIN-only `GET /api/admin/users`). See [Authorization](#authorization).
- The JLPT N5 learning domain and its answer-submission path: published-only
  curriculum and lesson queries, server-side answer validation and grading, and
  append-only attempt history with derived lesson completion. See
  [Learning](#learning).
- An idempotent, transactional `db:seed` that provisions a first JLPT N5 slice
  (course, chapters, lessons, exercises, vocabulary, grammar, kanji) inside a
  single transaction, so it is safe to re-run. It is review-gated: every seeded
  Japanese string is AI-drafted and labelled unverified until a human flips
  `CONTENT_REVIEWED`. See [Learning](#learning).
- The student-facing learning UI: a course dashboard at `/learn` that previews
  published content to signed-out visitors, a lesson page at
  `/learn/[lessonSlug]` rendering vocabulary, grammar, kanji and its exercises,
  a server-authoritative result page at `/learn/[lessonSlug]/result`, a branded
  sign-in page, and route-level `loading.tsx` / `error.tsx` boundaries.
  Grading still runs through `submitAnswer()` alone — the answer key is never
  sent to the browser. See [Learning](#learning).
- A branded public landing page at `/`, replacing the `create-next-app` scaffold.
  It is a Server Component with no client state that reads the **published**
  curriculum through the same `getCourseOutline()` query `/learn` uses, so the
  marketing surface cannot advertise a chapter a learner cannot open. It passes
  `userId: null` deliberately: nothing on it is per-learner, and `/learn` already
  serves the anonymous preview and the signed-in dashboard. With no published
  course it renders an honest "still being prepared" state rather than inventing
  a level badge or lesson count. It renders `force-dynamic`: the page resolves no
  session, so it cannot inherit dynamic rendering from a session read the way
  `/learn` does, and a build-time snapshot would keep advertising a chapter that
  has since been published or archived until the next rebuild. The unreferenced
  scaffold SVGs (`next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg`)
  were deleted.

Not implemented yet: content authoring, and the reviewed N5 curriculum itself.

The learner UI has been exercised **over HTTP**, but not in a JavaScript-capable
browser. Five routes were served from the production build and inspected:
`/login`, `/learn`, `/learn/[lessonSlug]`, `/learn/[lessonSlug]/result`, and `/`
each return `200`; the anonymous preview, the sign-in gates, the vocabulary,
grammar, and kanji sections, and the landing page's published-curriculum outline
all render; and the served HTML contains no `isCorrect`, `correctOptionId`, or
`explanation`, confirming the answer key does not reach the client. What the HTTP
pass does **not** cover: hydration, client-side navigation, keyboard focus order,
responsive layout, and the error state — none of which a `curl` can observe.
Playwright is not installed, and `AGENTS.md` section 2 forbids adding
dependencies without justification, so no e2e suite exists. See
[Learning](#learning) for the one route defect this pass surfaced.

Google sign-in has **not** been exercised end-to-end against real Google
credentials, so every result above is the *signed-out* path. What is verified is
listed under [Authentication](#authentication).

## Stack

| Concern            | Choice                                    |
| ------------------ | ----------------------------------------- |
| Framework          | Next.js 16 (App Router, Server Components) |
| Language           | TypeScript (strict)                       |
| Styling            | Tailwind CSS 4, centralized design tokens |
| Database           | PostgreSQL                                |
| ORM                | Prisma 7                                  |
| Authentication     | Auth.js v4 (`next-auth@4.24.15`), Google OAuth, database sessions |
| Database driver    | `@prisma/adapter-pg` (`PrismaPg`)          |
| Runtime            | Node.js                                   |

## Prerequisites

- Node.js `^20.19`, `^22.12`, or `>=24` (Prisma 7 requirement)
- A reachable PostgreSQL database

## Local Development

```bash
npm install                 # install dependencies
cp .env.example .env        # create your local env file (see below)
npx prisma migrate dev      # apply migrations to the database
npm run dev                 # start the dev server
```

### Available scripts

| Script                     | Purpose                             |
| -------------------------- | ----------------------------------- |
| `npm run dev`              | Start the development server        |
| `npm run build`            | Production build                    |
| `npm run start`            | Serve the production build          |
| `npm run lint`             | Run ESLint                          |
| `npm run typecheck`        | Run `tsc --noEmit`                  |
| `npm test`                 | Run all Vitest suites once          |
| `npm run test:watch`       | Run Vitest in watch mode            |
| `npm run test:integration` | Run only the database-backed suites |
| `npm run db:seed`          | Apply the seed script               |

> `npm run typecheck` depends on Next.js having generated its type declarations
> at least once. Run `npm run build` (or start `npm run dev`) first in a fresh
> clone, or deleteing `.next/` will leave `tsc` unable to resolve the generated
> `LayoutProps` and route types referenced from `next-env.d.ts`.

Prisma is invoked through the CLI directly (`npx prisma <command>`).

## Environment Variables

| Variable               | Required | Purpose                                            |
| ---------------------- | -------- | -------------------------------------------------- |
| `DATABASE_URL`         | Yes      | PostgreSQL connection string                       |
| `NEXTAUTH_URL`         | Yes      | Canonical app origin, no trailing slash             |
| `NEXTAUTH_SECRET`      | Yes      | Session cookie signing secret                      |
| `GOOGLE_CLIENT_ID`     | Yes      | Google OAuth client ID                              |
| `GOOGLE_CLIENT_SECRET` | Yes      | Google OAuth client secret                          |
| `TEST_DATABASE_URL`    | For tests | PostgreSQL connection string for the integration suite only |

`.env.example` ships non-secret placeholders for the four auth variables so a
fresh clone can build and boot without real credentials. Replace all of them
before any shared or deployed environment receives traffic. `lib/auth.ts` fails
fast by name when a required variable is unset or empty, and
`NEXTAUTH_SECRET` can be generated with `openssl rand -base64 32`.

`.env*` is gitignored. Never commit credentials. The local `DATABASE_URL` is read
by `prisma7.config.ts`, which imports `dotenv/config` explicitly — this is why
`dotenv` is a declared dev dependency rather than a transitive one.

## Database

Schema source of truth: `prisma/schema.prisma`.
Migrations: `prisma/migrations/` — each migration is reviewed before it is applied.

```bash
npx prisma validate       # check schema validity
npx prisma generate       # regenerate the client into app/generated/prisma
npx prisma migrate dev    # create + apply a migration (development)
npx prisma migrate status # confirm the database matches the schema
npx prisma studio         # inspect data locally
```

The generated client is written to `app/generated/prisma` and is gitignored.

### Current models

- `User` — `id` (UUID), `email` (unique), `emailVerified`, `name`, `image`,
  `role`, `createdAt`, `updatedAt`. Indexed on `role` for server-side
  role-based lookups.
- `Role` enum — `STUDENT`, `CONTENT_EDITOR`, `ADMIN`. Authorization is enforced
  server-side; roles are never trusted from client input.
- `Account` — links a `User` to an OAuth provider. Stores `provider`,
  `providerAccountId`, access/refresh tokens, and token expiry. Unique on
  `(provider, providerAccountId)`, cascades from `User`.
- `Session` — one database session per signed-in user. Stores the hashed
  `sessionToken` and its `expires` timestamp. Cascades from `User`.
- `VerificationToken` — standard adapter table for verifying email addresses.
  Unused while Google is the only provider, but kept schema-complete for the
  adapter.

### Learning models

Added by `prisma/migrations/20261005041205_add_jlpt_learning_domain/migration.sql`.

- `Course` — `slug` (unique), `title`, `description`, `level` (`JLPTLevel`),
  `order`, `status` (`ContentStatus`, defaults to `DRAFT`). Indexed on
  `(level, order)` and `status` because student queries always filter on
  publication status.
- `Chapter` — belongs to a `Course`; `slug`, `title`, `description`, `order`,
  `status`. Cascades from `Course`.
- `Lesson` — belongs to a `Chapter`; adds `estimatedMinutes` (default 5).
  Unique on `(chapterId, slug)` and `(chapterId, order)`. Cascades from
  `Chapter`.
- `Vocabulary`, `Grammar`, `Kanji` — the reference content tables. Each carries
  `jlpt` plus its own fields: `Vocabulary` has `term`, `reading`, `meaning`,
  `partOfSpeech`, and an example sentence/reading/translation; `Grammar` has
  `pattern`, `reading`, `meaning`, `formation`, `explanation`, `register`, and an
  example sentence/reading/translation; `Kanji` has `character`, `meaning`,
  `onyomi` and `kunyomi` as separate string arrays, and an optional
  `strokeCount` that is nullable precisely because `AGENTS.md` section 9 allows a
  stroke count only when a reliable source supports it.
- `LessonVocabulary`, `LessonGrammar`, `LessonKanji` — ordered many-to-many
  joins, composite primary key on `(lessonId, <content>Id)` plus an `order`
  column. Cascade from `Lesson`; `Restrict` on the content side, so a
  referenced word or kanji cannot be deleted out from under a lesson.
- `Exercise` — belongs to a `Lesson`. `type`, `prompt`, optional `explanation`,
  `difficulty` (default 1), `order`, and its own `status`, so a lesson can be
  published while one exercise stays unpublished.
- `ExerciseOption` — a selectable answer belonging to an `Exercise`. Exactly one
  carries `isCorrect`; that column is never selected outside the grading action.
- `ExerciseAttempt` — an immutable graded answer. Unique on
  `(exerciseId, userId, attemptNumber)`, which is what makes attempt numbering
  safe under concurrent submissions. `Restrict` from `Exercise` (attempt history
  outlives exercise edits) and `SetNull` from `givenOption`.
- `LessonCompletion` — one row per user/lesson, unique on `(userId, lessonId)`.

Relevant enums: `JLPTLevel` (`N5`…`N1`), `ContentStatus` (`DRAFT`, `PUBLISHED`,
`ARCHIVED`), `ExerciseType` (`MULTIPLE_CHOICE`, `TRUE_FALSE`).

### Implementation notes worth knowing

- **`prisma` and `@prisma/client` are pinned to exact `7.10.0`.** At the time of
  writing, `prisma@latest` resolves to `8.0.0-rc.19` while `@prisma/client@latest`
  resolves to stable `7.10.0`, and the client declares `prisma: "*"` as a peer
  dependency. npm therefore will *not* flag a major-version mismatch. The exact
  pins keep the CLI and client on the same major version. Do not "fix" this by
  running `npm audit fix --force` or bumping to `latest`.
- **Primary keys use `uuid(7)`, not `uuid(4)`.** PostgreSQL B-tree indexes
  degrade under random key insertion, and UUID primary keys are required by
  `AGENTS.md`. UUIDv7 is time-ordered, keeping index pages dense.
- **`id` and `updatedAt` are generated by the Prisma client, not by the
  database.** Neither column has a database-side default. Consequence: seed and
  maintenance scripts must go through the Prisma client. Raw SQL that inserts
  into `User` must supply `id` and `updatedAt` itself.
- **Authentication is pinned to `next-auth@4.24.15` (Auth.js v4).** `4.24.15` is
  npm's `latest` tag; v5 exists only under the `beta` tag (`5.0.0-beta.32`), and
  building against a beta is not acceptable. Do not apply v5 (`@auth/*` packages,
  `handlers`, `auth()`, `AUTH_SECRET`) patterns to this codebase — v4 uses
  `next-auth`, `getServerSession`, and `NEXTAUTH_SECRET`.
- **`@auth/core` is declared in `devDependencies` and pinned to exact `0.34.3`.**
  `next-auth@4.24.15` declares `@auth/core` as a peer dependency rather than
  bundling it, so a standalone install of this directory previously had no
  `@auth/core` of its own and TypeScript fell back to whatever copy happened to
  exist in a parent `node_modules` — here `0.41.3`, whose declarations do not
  match v4's. Because this repository is nested inside a larger workspace, that
  fallback is silent: the parent copy resolves, so nothing warns, and the
  resulting type errors land far from the cause. Declaring the exact peer
  version makes this install self-contained and independent of the parent tree.
  Do not widen the range to `^0.34.3` or `latest`: v5's core is `@auth/core@0.41.x`
  and is API-incompatible with v4's `next-auth`.
- **The first sign-in method is Google OAuth.** No password is ever stored, so
  there is no credential column and no hashing code to get wrong. Email + password
  (the Credentials provider) is deferred; adding it later means adding a
  `passwordHash` column plus verification and reset flows, which is a separate
  reviewed slice. A live sign-in round trip requires real Google OAuth client
  credentials.
- **The adapter tables are declared and migrated.** `Account`, `Session`, and
  `VerificationToken` were added in
  `prisma/migrations/20261003193056_add_auth_adapter_tables/migration.sql` after
  verifying that the v4 Prisma adapter is compatible with this schema's UUID
  `User.id`. `Account.userId` and `Session.userId` are native UUID foreign keys
  with `onDelete: Cascade`, `Account` is unique on `(provider, providerAccountId)`,
  and `Session.sessionToken` is unique. See [Authentication](#authentication)
  for what was verified at runtime.

## Authentication

Google OAuth through Auth.js v4. No password is ever stored, so there is no
credential column and no hashing code.

### How it is wired

| File                            | Responsibility                                                              |
| ------------------------------- | --------------------------------------------------------------------------- |
| `lib/auth.ts`                   | `authOptions`: Google provider, `PrismaAdapter`, database sessions, role-aware session callback |
| `lib/db.ts`                     | Prisma client singleton built on `PrismaPg` from `@prisma/adapter-pg`        |
| `app/api/auth/[...nextauth]/route.ts` | Dynamic App Router handler exporting `GET` and `POST` from `next-auth/next` |

The session strategy is `database`, so sessions live in the `Session` table
rather than a cookie and can be revoked server-side. The session callback copies
the adapter-loaded `user.id` and `user.role` onto `session.user`.

> **The session role is presentation only.** It is convenient for rendering, but
> authorization must re-read the user from PostgreSQL on the server. Never trust
> `session.user.role` or any client-supplied user ID for a permission decision.

The Google Cloud OAuth client must register this exact redirect URI:

```
http://localhost:3000/api/auth/callback/google
```

### What has been verified

- `npm run build`, `npm run lint`, and `npm run typecheck` all exit 0, and both
  the auth route and `/` are emitted as dynamic (`ƒ`), not prerendered. Re-verified
  on `2026-10-06`; see [Testing](#testing) for the type-resolution issue that had
  broken `npm run build` and `npm run typecheck` in this working copy, and how it
  was resolved.
- Unauthenticated HTTP behavior against a running server: `/api/auth/providers`
  returns 200 listing Google with the correct callback URL, `/api/auth/csrf`
  returns 200 with a token, and `/api/auth/session` returns 200 with `{}`.
- **Adapter persistence is covered by an automated test.**
  `test/integration/prisma-adapter.test.ts` drives the real `PrismaAdapter`
  against a migrated PostgreSQL database and confirms that it creates a `User`
  row, applies the `STUDENT` database default when the adapter omits a role,
  links a Google `Account` row with the UUID foreign key, creates and reads a
  `Session`, and returns the authoritative role (`ADMIN` after a deliberate
  promotion, not the `STUDENT` default). Cascade cleanup is asserted by the
  suite's final teardown. An earlier throwaway route proved the same behavior by
  hand; that harness was deleted and this suite is the durable replacement. See
  [Testing](#testing).
- `npm audit --omit=dev` reports 0 vulnerabilities.
- `npm run build` succeeded from a fresh `.env` containing only the placeholders
  from `.env.example`, so review does not require Google credentials or even a
  live database. Confirmed on `2026-10-05`; re-confirmed on `2026-10-06` that
  `npm run build` exits 0 now that the type-resolution issue is resolved. Because
  `/` is now `force-dynamic`, the build no longer reads the curriculum at build
  time, so the placeholder-only claim is if anything stronger than it was.

### What has not been verified

- **A live Google sign-in round trip.** That needs real
  `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` and a publicly reachable callback
  URL. Placeholder credentials let the app boot and serve the sign-in page, but
  the OAuth exchange will be rejected by Google.
- A live sign-in was never exercised in CI or with Docker; the Docker daemon was
  unavailable in this environment.

## Authorization

Server-side permission enforcement over a ranked role ladder. Every decision
re-reads the user from PostgreSQL; nothing in this path trusts a client-supplied
role or user ID.

### The role ladder

`STUDENT: 0 < CONTENT_EDITOR: 1 < ADMIN: 2`. A role satisfies a requirement when
its rank is at least the required rank, so `ADMIN` satisfies a `CONTENT_EDITOR`
requirement.

The ladder is one frozen record rather than a comparison function, so adding a
role later forces an explicit decision about where it belongs instead of failing
silently at runtime. Recorded assumption per `AGENTS.md` section 23:
administrators are a strict superset of content editors, because an administrator
manages content by definition.

### How it is wired

| File                            | Responsibility                                                              |
| ------------------------------- | --------------------------------------------------------------------------- |
| `lib/authorization.ts`          | The ladder, `authorize()`, and `refuse()`. Deliberately free of any database import, so the security-critical rules are unit-testable with no DB, no environment variables, and no Next.js request. |
| `lib/authorization.server.ts`   | `requireUser(session, requiredRole)` — the only place allowed to turn a session into an identity a permission decision may rely on. Named `.server` so a client-component import is a visible mistake. |
| `lib/api.ts`                    | `authorizationErrorResponse()` and `apiError()` — one error envelope for authorization failures. |
| `app/api/me/route.ts`           | `GET` — the caller's own identity as PostgreSQL currently stores it. |
| `app/api/admin/users/route.ts`  | `GET` — ADMIN-only user listing, capped at 100 rows. |

### The rules that matter

- **The session role is ignored.** `requireUser` uses `session.user.id` only as a
  lookup key, then re-reads `{ id, email, role }` from PostgreSQL. A forged
  session role cannot grant access, and an administrator's demotion takes effect
  on the caller's very next request.
- **Only three columns are selected.** A sensitive field added to `User` later
  cannot leak into a response by accident.
- **User enumeration is blocked.** `unauthenticated` (no session, or a session
  with an empty id) and `unknown_user` (a session whose user row is gone) return
  byte-identical `401` responses, so the API cannot be used to probe which UUIDs
  exist.
- **Forbidden is distinguishable.** An authenticated user below the required rank
  gets `403`; only authentication failures get `401`.
- **The admin listing is bounded.** `AGENTS.md` section 7 forbids unbounded
  queries, so the endpoint takes at most 100 rows in a stable
  (`createdAt asc, id asc`) order. Cursor pagination is deliberately deferred; the
  cap must be replaced with real pagination before this endpoint is exposed to end
  users.

### What has been verified

See [Authorization tests](#testing) for the full suite list.

- **Role matrix, exhaustively.** All nine role/requirement combinations are
  asserted by `test/lib/authorization.test.ts`. That test also guards itself: it
  compares the matrix it actually walked against the full cross product, so
  deleting a row fails the suite instead of quietly reducing coverage.
- **The ladder against real rows.** The integration suite seeds users at each
  role and checks the ladder where a database is genuinely involved — that a
  higher role satisfies a lower requirement, that an editor is refused an
  administrative requirement, and that `requireUser` defaults to the `STUDENT`
  requirement.
- **The gate does not trust the session.** A session claiming `ADMIN` over a row
  stored as `STUDENT` is refused; a session under-claiming (`STUDENT`) over a row
  stored as `ADMIN` is granted, because the stored role is what counts.
- **Anti-enumeration.** A deleted account and an anonymous caller produce
  identical status, code, and body.
- **The 401/403 split is real.** An anonymous caller gets `401` from both
  endpoints, while a signed-in `STUDENT` and a `CONTENT_EDITOR` each get `403`
  from the admin endpoint. `/api/me` returns the stored identity rather than the
  session's, and the admin listing's ordering is asserted for a permitted admin.

### What has not been verified

- **Live HTTP.** These routes are exercised by calling the route handlers
  directly in Vitest, not by issuing requests against a running dev server. The
  middleware, cookie, and edge-runtime path is untested.
- Ownership checks when *reading* personal learning records. Attempts and
  completions are written server-side against the authenticated user rather than
  a client-supplied ID, and a second learner's attempt numbering is proven
  independent, but no endpoint yet serves a learner's history, so there is no
  read path to protect.

## Learning

The JLPT N5 learning domain: published-only curriculum and lesson reads, a single
server-side answer path, append-only attempt history, and derived completion.
Those queries now render in the learner UI, but they remain the only entry
points: the browser reaches them through Server Components and
`submitAnswer()`, never through a hand-rolled client fetch or a new API.
See [Current Status](#current-status).

### How it is wired

| File                                     | Responsibility                                                                                           |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `features/learning/answer-validation.ts` | `gradeAnswer()` and `toPublicExercise()`; no database or session imports                                 |
| `features/learning/progress.ts`          | `latestAttemptPerExercise()`, `computeLessonScore()`, `lessonProgressState()`, `courseProgressPercent()` |
| `features/learning/curriculum.server.ts` | `getCourseOutline()`: published course tree with per-lesson progress                                     |
| `features/learning/lesson.server.ts`     | `getLessonForLearner()`: one published lesson, its exercises, and the caller's progress                  |
| `features/learning/actions.ts`           | `submitAnswer()`: the only reader of `ExerciseOption.isCorrect`                                          |

### The rules that matter

- **The answer key has exactly one reader.** `isCorrect` is selected in
  `actions.ts` and nowhere else. `getLessonForLearner` selects exercise options as
  `{ id, label }` only, and `toPublicExercise()` builds the client projection by
  *selecting fields explicitly* rather than by omitting fields — so a future column
  on `Exercise` or `ExerciseOption` cannot leak into a Client Component by
  accident.
- **Publication is enforced at every level.** `submitAnswer` refuses to grade
  unless the exercise, its lesson, its chapter, and its course are all
  `PUBLISHED`. A draft exercise therefore cannot be graded by guessing its UUID,
  and an archived question stops accepting answers the moment it is archived. The
  same filter shapes both reads.
- **Unpublished is indistinguishable from absent.** `getLessonForLearner` returns
  `null` when the lesson, its chapter, or its course is missing *or* unpublished.
  The read cannot be used to discover draft material, or to learn that a slug
  exists but has not been released.
- **Grading fails closed.** `gradeAnswer` rejects rather than guesses: an
  exercise with zero or multiple correct options, an option count that does not
  match the exercise type (`MULTIPLE_CHOICE` needs ≥2, `TRUE_FALSE` needs exactly
  2), or an option id that does not belong to *this* exercise. That last check is
  why an option id borrowed from another question is rejected instead of scored
  against this one.
- **Completion is derived, never requested.** A client cannot claim a lesson is
  finished. The attempt row and the `LessonCompletion` upsert share one
  transaction, so a learner can never hold an attempt without its completion, and
  the completion denominator counts only *currently published* exercises — the
  same set `computeLessonScore` scores against. A lesson with no published
  exercises is never completed, which stops a first visit from instantly marking
  an empty lesson complete.
- **Attempt history is append-only and per-learner.** `attemptNumber` is derived
  from the current maximum under the
  `@@unique([exerciseId, userId, attemptNumber])` constraint, so it is monotonic
  and collision-free without trusting timestamp precision. A `P2002` during the
  write can therefore only mean the counter collided, and is retried up to three
  times; anything else is logged without learner content and returned as
  `internal_error`.
- **Refusals are a discriminated union.** `submitAnswer` returns
  `{ ok: false, reason }` rather than throwing, so a caller cannot treat a refusal
  as a success by forgetting to check `ok`. `unauthenticated` deliberately does
  not distinguish "no session" from "session with no user row", because
  `lib/api.ts` already answers those identically over HTTP and a Server Action must
  not reopen that enumeration hole.
- **Reads are bounded and tolerate anonymous callers.** `userId` may be `null`
  throughout: every lesson then reports `not_started` with a zero score rather
  than failing, so one query serves the signed-out preview and the signed-in
  dashboard. Chapter, lesson, vocabulary, grammar, kanji, and attempt-history reads
  all carry an explicit `take`.
- **Retries cannot inflate a score.** `computeLessonScore` counts only the latest
  attempt per exercise, once, and takes the current exercise ids rather than a
  total — so an attempt against a since-unpublished exercise can neither mark a
  lesson answered nor lift its score.

### What has been verified

See [Testing](#testing) for the suite list.

- **The whole answer path against real PostgreSQL.** 22 cases in
  `test/integration/learning-actions.test.ts` cover the graded and refused
  outcomes, publication gating at all four levels, option-id substitution, attempt
  numbering (including a second learner starting at 1), the `P2002` retry path,
  lesson completion derivation, and role enforcement on the action.
- **Grading and progress in isolation.** 13 cases in
  `test/features/answer-validation.test.ts` pin `gradeAnswer` and
  `toPublicExercise`, including that the public projection carries no `isCorrect`
  and no `explanation`. 31 cases in `test/features/progress.test.ts` pin the
  score, state, and percentage derivations, including the unpublished-exercise and
  retry cases above.
- One integration fixture deliberately contains a single option, which
  `gradeAnswer` refuses. It is not padded with a second option; the malformed
  shape is the thing under test.

### What has not been verified

- **The UI has been verified over HTTP only, never in a browser.** Served from
  the production build, `/login`, `/learn`, `/learn/[lessonSlug]`, and
  `/learn/[lessonSlug]/result` all return `200`, and the signed-out path renders
  the expected content: the course outline with its chapters, the vocabulary,
  grammar, and kanji sections, "This is a preview. Sign in to answer questions",
  and "Sign in to see your score". The served HTML was also grepped for `isCorrect`,
  `correctOptionId`, `"correct":true`, and `explanation` — **all zero matches**,
  which is the property the design is built around, now confirmed on the wire
  rather than only by unit test. Note that the anonymous lesson page emits no
  `<fieldset>`: options are withheld from signed-out visitors entirely, so the
  answer choices are not merely hidden. `curl` cannot observe hydration,
  client-side navigation, focus order, responsive layout, or the `error.tsx`
  boundary, so those remain unverified.
- **The landing page at `/` has been served but never exercised in a browser.**
  It returns `200` from the production build and renders the published N5 outline
  read live from PostgreSQL — `2` chapters, `2` lessons, `11` minutes — alongside
  the `⚠ Unverified seed content` notices, the Kotoba / Bunpou / Kanji / Practice
  sections, and both calls to action. Its served HTML was grepped for `isCorrect`,
  `correctOptionId`, `"correct":true`, `explanation`, `NEXTAUTH_SECRET`, and
  `DATABASE_URL`: **all zero matches**. The route also emits no page-specific
  client chunk — the only `<script>` tags are Next.js runtime bootstrap — which is
  the concrete sense in which it ships no client JavaScript, not a claim that the
  document contains no scripts at all. Hydration, client-side navigation,
  responsive layout, and focus order remain unobserved for the same `curl`
  limitation that applies to every other route above.
- **A missing lesson returns HTTP `200`, not `404`** — a soft-404 that this pass
  found. `notFound()` is called correctly: the RSC payload carries
  `NEXT_HTTP_ERROR_FALLBACK;404`, the not-found body, and
  `<meta name="robots" content="noindex">`. But `app/learn/loading.tsx` puts a
  Suspense boundary above the route, so the loading shell flushes at roughly byte
  1540 while the 404 payload arrives near byte 4969. Once the first chunk commits
  a status, Next.js cannot revise it, and the streamed response is `200` with
  `Transfer-Encoding: chunked`. The consequence is bounded — crawlers get
  `noindex`, client-side navigation shows the not-found UI, and the read itself is
  already safe, since `getLessonForLearner` returns `null` for unpublished
  material just as it does for a missing one. But a link checker or CDN will
  record these URLs as valid. Fixing it means not streaming that route — for
  example by scoping `loading.tsx` to `app/learn/` rather than wrapping the
  lesson segment — which trades away the loading state and is a deliberate call,
  not a silent one.
- **No authoring path.** `AGENTS.md` section 18 requires draft, preview, and
  publication flows; none are built. `db:seed` is a fixed fixture, not an
  authoring tool: it cannot create drafts, preview them, or publish them, and it
  deliberately writes no `DRAFT` or `ARCHIVED` row.
- **The seeded N5 content is AI-generated and therefore unverified.** The
  `CONTENT_REVIEWED` gate in `prisma/seed-content.ts` is what keeps that honest:
  while it is `false`, every seeded description is prefixed with a review notice,
  and flipping it is a deliberate human act. Do not treat the seed as reviewed
  curriculum until a human has reviewed it per `AGENTS.md` section 9.

## Dependency Security

`npm audit --omit=dev` reports **0 vulnerabilities**. The full tree reports 5
high-severity findings, all dev-only, arising from a single advisory:
[`braces`](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
(stack-exhaustion denial of service through deeply nested patterns). npm counts
each package in the dependency chain, which is why one advisory reports as five:

```
eslint-config-next -> @next/eslint-plugin-next -> fast-glob -> micromatch -> braces
```

`braces@3.0.3` is the newest version ever published, so no version bump or
override can clear this advisory. The only fix npm offers is
`npm audit fix --force`, which installs `eslint-config-next@14.2.35` — a breaking
major downgrade that must not be run. This risk is reachable only through linting
trusted local input; none of these packages ship in the runtime graph. Re-check
it whenever `eslint-config-next` is bumped.

### npm overrides

Two further advisories were reachable only through the Prisma CLI's own
dependency tree, never from application code, and were pinned forward in
`package.json`:

| Override        | Pinned to   | Why                                                                                             |
| --------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| `deepmerge-ts`  | `8.0.2`     | Prototype-pollution advisory in versions reachable via the `prisma` CLI.                          |
| `mysql2`        | `3.24.5`    | Advisories in versions reachable via the `prisma` CLI. Manabii is PostgreSQL-only and never loads it. |

`@prisma/client` depends on neither package, so neither override reaches
application code or the deployed runtime. `mysql2` is a major-version override,
so re-verify after any `prisma` upgrade.

## Conventions

`AGENTS.md` is the authoritative contributor guide and defines the architecture,
brand tokens, database rules, authorization model, testing expectations, and
definition of done. Read it before making changes.

## Testing

Vitest `3.2.7` runs both unit and integration suites. No browser or e2e tests
exist yet.

| Script                     | Purpose                                   |
| -------------------------- | ----------------------------------------- |
| `npm test`                 | Run every suite once                      |
| `npm run test:watch`       | Re-run on change                          |
| `npm run test:integration` | Run only the three database-backed suites |

### Current coverage

| Suite                                     | Tests | Needs a database           |
| ----------------------------------------- | ----- | -------------------------- |
| `test/lib/auth.test.ts`                   | 12    | No                         |
| `test/lib/db.test.ts`                     | 4     | No                         |
| `test/lib/authorization.test.ts`          | 19    | No                         |
| `test/features/answer-validation.test.ts` | 13    | No                         |
| `test/features/progress.test.ts`          | 31    | No                         |
| `test/integration/prisma-adapter.test.ts` | 7     | Yes (`TEST_DATABASE_URL`)  |
| `test/integration/authorization.test.ts`  | 15    | Yes (`TEST_DATABASE_URL`)  |
| `test/integration/learning-actions.test.ts` | 22  | Yes (`TEST_DATABASE_URL`)  |

123 tests in total. The most recent local run passed 79 and skipped 44; the
skipped cases are the three database-backed suites, which only execute when
`TEST_DATABASE_URL` is set (see
[Running the integration suites](#running-the-integration-suites)). A skip is not
a pass. Those 44 cases were last executed against real PostgreSQL 17 on
`2026-10-05`, when `npm test`, `npm run build`, `npm run typecheck`, and
`npm run lint` all exited 0.

> **Resolved on `2026-10-06` — `npm run typecheck` and `npm run build` both exit 0
> again.** This working copy previously carried six errors, all in
> `test/integration/prisma-adapter.test.ts`, and `next build` stopped at "Running
> TypeScript" even though the application itself compiled cleanly. The cause was
> environmental, not logical: the nested `next-auth@4.24.15` install contained no
> `@auth/core` of its own, so TypeScript fell back to the parent directory's
> `@auth/core@0.41.3` and paired v4 declarations with core declarations that do not
> match. Excluding that one test file from `tsc` exited 0, which located the fault
> precisely.
>
> The fix was to make the nested install self-contained rather than to relax the
> adapter test's types: `@auth/core` is now declared in `devDependencies` and
> pinned to the exact `0.34.3` that `next-auth@4.24.15` requires as a peer, with
> `package-lock.json` regenerated by `npm install --package-lock-only`. Three
> things were corrected in the process, each of which the old test had silently
> absorbed because `any`-shaped adapter types accept anything:
>
> - The `AdapterUser` literal was missing `role`, which the v4 `AdapterUser`
>   type marks optional only on the create path. Omitting it would let a test pass
>   that could not compile against the real adapter contract.
> - Four `Account` literals mismatched the adapter's expected `type`/`provider`
>   shape.
>
> `attachIdentityToSession` now rejects a role-less adapter user with
> `Error("Adapter returned a user without a role")` instead of silently widening
> the session role, and `test/lib/auth.test.ts` pins that behavior. The session
> role stays required; `AGENTS.md` section 8 is not relaxed to accommodate a
> missing database default. Do not reintroduce the mismatch by loosening the
> adapter test's types, editing the lockfile by hand, or relying on the parent
> directory's `node_modules`.

> **Test files run sequentially.** `vitest.config.ts` sets
> `fileParallelism: false`. Every integration suite shares the one database named
> by `TEST_DATABASE_URL`, and `authorization.test.ts` asserts the admin user
> listing equals *exactly* its own three fixtures. Under file-level parallelism a
> neighbouring suite's seeded users are visible mid-run, that assertion fails, and
> the failure looks like a real authorization bug. Serializing files lets each
> suite's `afterAll` teardown finish before the next seeds, so no assertion has to
> be weakened to tolerate a concurrent neighbour. Do not re-enable parallelism
> without first removing that cross-suite coupling.

The unit suites cover `attachIdentityToSession` (propagating each `Role`,
preserving adapter-populated fields), the `authOptions` wiring (database
sessions, Prisma adapter, Google provider, session callback), fail-fast on unset
or empty Google credentials, the `DATABASE_URL` guard plus Prisma singleton
reuse, and the authorization ladder — the complete role/requirement cross
product, the exact identity returned on success, the named required and actual
role on refusal, and the mapping of every failure onto the API error envelope
(including that an anonymous caller and a deleted account are answered
identically).

`test/integration/prisma-adapter.test.ts` replaced the throwaway route that
previously proved adapter persistence by hand. It drives the real
`PrismaAdapter` against a migrated PostgreSQL database and asserts that a user
is created, a Google account is linked, a session is written and read back, the
authoritative role survives, and deletion cascades.

`test/integration/authorization.test.ts` is the database-backed counterpart to the
unit ladder: it seeds real users at each role and proves that `requireUser` and
both route handlers authorize on the **stored** role. The exhaustive 3×3 matrix
stays in the unit suite, where it runs without a database; what the integration
suite adds is the part a unit test cannot reach — that a session whose claimed
`ADMIN` role is absent from the database is refused, that a session which
under-claims its role is granted on the stored role instead, the
missing/empty/deleted-identity paths, the 401-versus-403 split across both
endpoints, `/api/me` returning the stored identity rather than the session's, a
higher role satisfying a lower requirement, and the admin listing's stable
ordering.

### Running the integration suites

The integration suites are **skipped unless `TEST_DATABASE_URL` is set**, and a
skip is not a pass. Point them at a dedicated throwaway database, never the
development or production `DATABASE_URL`:

```bash
createdb manabii_test
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/manabii_test" npx prisma migrate deploy
TEST_DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/manabii_test" npm test
```

`TEST_DATABASE_URL` must **not** carry Prisma's `?schema=public` suffix. This is a
deliberate guard in both DB-backed suites, not a driver limitation:
`@prisma/adapter-pg` is node-postgres and ignores the parameter, so the seed runs
against a URL containing `?schema=public` without complaint. `schema=public` is
meaningless to node-postgres, and `search_path` is the correct way to select a
schema, so the suites reject the Prisma-CLI-only suffix to keep the connection
string honest about what it controls.

The authorization suite adds two deliberate safety checks on top of that, and
refuses to run rather than trust a careless URL:

- The database name must end in `_test`, so a mistyped `TEST_DATABASE_URL`
  pointing at real data fails loudly instead of deleting rows.
- It deletes only the rows it created, and asserts that cleanup reached zero
  before disconnecting.

Both suites derive everything they need from `TEST_DATABASE_URL` alone. The
authorization suite repoints `DATABASE_URL` at the throwaway database internally
before importing the Prisma singleton, and the adapter suite stubs both the
Google credentials and `DATABASE_URL` for the same reason — so a test run cannot
reach the development database even by accident.

### Not covered yet

- Component and end-to-end tests.
- A live Google sign-in round trip, which needs real credentials.
- Authorization exercised over live HTTP rather than by calling the route
  handlers directly, so the middleware and cookie path is untested.
- Ownership checks when reading a learner's own history. Writes are covered —
  attempts and completions are attributed server-side, and per-learner attempt
  numbering is proven independent — but no endpoint serves that history yet.