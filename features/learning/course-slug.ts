/**
 * The course the learner routes open by default.
 *
 * `/learn` and `/learn/[lessonSlug]` carry no course segment, so the entry point
 * needs a concrete slug. Until a second course exists this stays a single named
 * constant rather than a repeated literal: when N4 lands, one edit here plus the
 * link changes retarget the whole surface, and the risk of one page silently
 * pointing at a different course is a compile error instead of a stale string.
 *
 * Deliberately not imported from `prisma/seed-content.ts`. That module is a
 * fixture owned by the seed script; the UI must not depend on seed internals.
 */
export const DEFAULT_COURSE_SLUG = "jlpt-n5";