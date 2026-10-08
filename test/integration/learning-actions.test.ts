import type { Session } from "next-auth";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { Role } from "@/app/generated/prisma/client";

/**
 * Drives `submitAnswer` against a real migrated PostgreSQL database.
 *
 * The subject is the server-side boundary, not the grader. `gradeAnswer` is a
 * pure function already covered by unit tests, so repeating its truth table here
 * would only assert the fixture. What cannot be unit tested is everything the
 * action adds on top of it:
 *
 * - `isCorrect` is selected in exactly one place, so a draft or archived
 *   question must be ungradable by UUID alone (a learner cannot grade their own
 *   quiz by guessing ids).
 * - An option borrowed from a different exercise must not score.
 * - Completion is derived from published exercises, is idempotent, and ignores
 *   attempts on exercises that have since been archived.
 * - Attempts are append-only with a per-learner counter, so a retry adds a row
 *   rather than overwriting the previous answer.
 *
 * Point `TEST_DATABASE_URL` at a **dedicated throwaway database**. The suite
 * writes rows and removes them again, but it must never share a database with
 * real learners.
 *
 * The suite is skipped when `TEST_DATABASE_URL` is absent. A skip is not a
 * pass: CI must provide the variable for these assertions to count as run.
 */
const testDatabaseUrl = process.env["TEST_DATABASE_URL"];

const { getServerSessionMock } = vi.hoisted(() => ({
  getServerSessionMock: vi.fn<() => Promise<Session | null>>(),
}));

/**
 * Replacing the module with a single session getter leaves `authOptions` intact
 * while making identity deterministic. The alternative — inserting a different
 * role into the session per test — is exactly the forgery this suite exists to
 * defeat, so the database stays the source of truth.
 */
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }));

const STUDENT_ID = "0190f2d3-0001-7a5b-8c9d-0e1f2a3b4c01";
const EDITOR_ID = "0190f2d3-0002-7a5b-8c9d-0e1f2a3b4c02";
const DELETED_ID = "0190f2d3-0003-7a5b-8c9d-0e1f2a3b4c03";
const UNRELATED_ID = "0190f2d3-0004-7a5b-8c9d-0e1f2a3b4c04";

const SUITE_USER_IDS: readonly string[] = [STUDENT_ID, EDITOR_ID, DELETED_ID, UNRELATED_ID];

/** Published spine. Three lessons share it so each rule is isolated in its own. */
const COURSE_ID = "0190f2d3-0100-7a5b-8c9d-0e1f2a3b4c01";
const CHAPTER_ID = "0190f2d3-0101-7a5b-8c9d-0e1f2a3b4c01";

/** Two exercises: a lesson completes only once both are answered. */
const LESSON_ID = "0190f2d3-0102-7a5b-8c9d-0e1f2a3b4c01";
const EXERCISE_ONE = "0190f2d3-0103-7a5b-8c9d-0e1f2a3b4c01";
const EXERCISE_TWO = "0190f2d3-0104-7a5b-8c9d-0e1f2a3b4c01";
const OPTION_ONE_WRONG = "0190f2d3-0105-7a5b-8c9d-0e1f2a3b4c01";
const OPTION_ONE_RIGHT = "0190f2d3-0106-7a5b-8c9d-0e1f2a3b4c01";
const OPTION_TWO_RIGHT = "0190f2d3-0107-7a5b-8c9d-0e1f2a3b4c01";
const OPTION_TWO_WRONG = "0190f2d3-0108-7a5b-8c9d-0e1f2a3b4c01";

/** A published exercise whose options all claim to be wrong. */
const LESSON_UNGRADEABLE = "0190f2d3-0109-7a5b-8c9d-0e1f2a3b4c01";
const EXERCISE_UNGRADEABLE = "0190f2d3-0110-7a5b-8c9d-0e1f2a3b4c01";
const OPTION_UNGRADEABLE_A = "0190f2d3-0111-7a5b-8c9d-0e1f2a3b4c01";
const OPTION_UNGRADEABLE_B = "0190f2d3-0112-7a5b-8c9d-0e1f2a3b4c01";

/** One published and one archived exercise, for the completion denominator. */
const LESSON_MIXED = "0190f2d3-0113-7a5b-8c9d-0e1f2a3b4c01";
const EXERCISE_MIXED_LIVE = "0190f2d3-0114-7a5b-8c9d-0e1f2a3b4c01";
const EXERCISE_MIXED_ARCHIVED = "0190f2d3-0115-7a5b-8c9d-0e1f2a3b4c01";
const OPTION_MIXED_LIVE = "0190f2d3-0116-7a5b-8c9d-0e1f2a3b4c01";
const OPTION_MIXED_LIVE_WRONG = "0190f2d3-0118-7a5b-8c9d-0e1f2a3b4c01";
const OPTION_MIXED_ARCHIVED = "0190f2d3-0117-7a5b-8c9d-0e1f2a3b4c01";
const OPTION_MIXED_ARCHIVED_WRONG = "0190f2d3-0119-7a5b-8c9d-0e1f2a3b4c01";

/** Deliberately one option, which `gradeAnswer` refuses. Do not pad it with a second. */
const LESSON_SINGLE = "0190f2d3-011a-7a5b-8c9d-0e1f2a3b4c01";
const EXERCISE_SINGLE = "0190f2d3-011b-7a5b-8c9d-0e1f2a3b4c01";
const OPTION_SINGLE = "0190f2d3-011c-7a5b-8c9d-0e1f2a3b4c01";

/** Draft spine: a perfectly well-formed question that must stay ungradable. */
const COURSE_DRAFT = "0190f2d3-0200-7a5b-8c9d-0e1f2a3b4c01";
const CHAPTER_DRAFT = "0190f2d3-0201-7a5b-8c9d-0e1f2a3b4c01";
const LESSON_DRAFT = "0190f2d3-0202-7a5b-8c9d-0e1f2a3b4c01";
const EXERCISE_DRAFT = "0190f2d3-0203-7a5b-8c9d-0e1f2a3b4c01";
const OPTION_DRAFT = "0190f2d3-0204-7a5b-8c9d-0e1f2a3b4c01";

const COURSE_IDS: readonly string[] = [COURSE_ID, COURSE_DRAFT];

function requireTestDatabaseUrl(): string {
  if (testDatabaseUrl === undefined || testDatabaseUrl === "") {
    throw new Error("TEST_DATABASE_URL must be set to run the learning suite");
  }

  if (testDatabaseUrl.includes("schema=public")) {
    throw new Error("TEST_DATABASE_URL must not include ?schema=public");
  }

  // Defence in depth. The URL is handed to node-postgres verbatim, so the
  // database name is the only signal separating a throwaway from a real
  // database. Without this a mistyped variable would silently wipe real rows.
  if (!testDatabaseUrl.endsWith("_test")) {
    throw new Error("TEST_DATABASE_URL must point at a database whose name ends in _test");
  }

  return testDatabaseUrl;
}

/** Builds a session the learner could otherwise dictate. */
function sessionFor(id: string, role: Role): Session {
  return {
    user: { id, role },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

describe.skipIf(testDatabaseUrl === undefined)("submitAnswer", () => {
  const originalEnvironment = {
    DATABASE_URL: process.env["DATABASE_URL"],
    GOOGLE_CLIENT_ID: process.env["GOOGLE_CLIENT_ID"],
    GOOGLE_CLIENT_SECRET: process.env["GOOGLE_CLIENT_SECRET"],
  };

  let prisma: typeof import("@/lib/db").db;
  let submitAnswer: typeof import("@/features/learning/actions").submitAnswer;
  let clientReady = false;

  /** Asserts a rejection without repeating the union shape at every call site. */
  async function expectFailure(
    exerciseId: string,
    optionId: string,
    reason: string,
  ): Promise<void> {
    expect(await submitAnswer({ exerciseId, optionId })).toEqual({ ok: false, reason });
  }

  beforeAll(async () => {
    process.env["DATABASE_URL"] = requireTestDatabaseUrl();

    // `lib/auth.ts` refuses to build `authOptions` without Google credentials and
    // the action imports it. Placeholders suffice: no OAuth exchange happens here.
    process.env["GOOGLE_CLIENT_ID"] ??= "learning-suite@example.test";
    process.env["GOOGLE_CLIENT_SECRET"] ??= "learning-suite-secret";

    // `@/lib/db` reads DATABASE_URL when the module is first evaluated and caches
    // the client on globalThis, so both have to be cleared before the modules
    // under test are imported. Without this the action would write attempts to the
    // development database instead of the throwaway one.
    Reflect.deleteProperty(globalThis, "prisma");
    vi.resetModules();

    ({ db: prisma } = await import("@/lib/db"));
    ({ submitAnswer } = await import("@/features/learning/actions"));
    clientReady = true;

    await prisma.user.createMany({
      data: [
        { id: STUDENT_ID, email: "student@learning-suite.test", name: "Suite Student", role: "STUDENT" },
        { id: EDITOR_ID, email: "editor@learning-suite.test", name: "Suite Editor", role: "CONTENT_EDITOR" },
        { id: UNRELATED_ID, email: "bystander@learning-suite.test", name: "Suite Bystander", role: "STUDENT" },
      ],
    });

    await prisma.course.create({
      data: {
        id: COURSE_ID,
        slug: "n5-published-suite",
        title: "JLPT N5 (published)",
        description: "Published spine for the answer-submission suite.",
        level: "N5",
        order: 1,
        status: "PUBLISHED",
        chapters: {
          create: {
            id: CHAPTER_ID,
            slug: "n5-basics-suite",
            title: "Basics",
            description: "Published chapter for the answer-submission suite.",
            order: 1,
            status: "PUBLISHED",
            lessons: {
              create: [
                {
                  id: LESSON_ID,
                  slug: "greetings-suite",
                  title: "Greetings",
                  description: "Two exercises, so completion needs both.",
                  order: 1,
                  status: "PUBLISHED",
                  exercises: {
                    create: [
                      {
                        id: EXERCISE_ONE,
                        type: "MULTIPLE_CHOICE",
                        prompt: "msup",
                        explanation: "The polite past form of ます is ました.",
                        order: 1,
                        status: "PUBLISHED",
                        options: {
                          create: [
                            { id: OPTION_ONE_WRONG, label: "masu", isCorrect: false, order: 1 },
                            { id: OPTION_ONE_RIGHT, label: "mashita", isCorrect: true, order: 2 },
                          ],
                        },
                      },
                      {
                        id: EXERCISE_TWO,
                        type: "MULTIPLE_CHOICE",
                        prompt: "arigatou",
                        explanation: "The past form of ありがとう is ありました.",
                        order: 2,
                        status: "PUBLISHED",
                        options: {
                          create: [
                            { id: OPTION_TWO_RIGHT, label: "arigatou gozaimashita", isCorrect: true, order: 1 },
                            { id: OPTION_TWO_WRONG, label: "arigatou mashita", isCorrect: false, order: 2 },
                          ],
                        },
                      },
                    ],
                  },
                },
                {
                  id: LESSON_UNGRADEABLE,
                  slug: "ungradeable-suite",
                  title: "Ungradeable",
                  description: "Holds an exercise with no correct option.",
                  order: 2,
                  status: "PUBLISHED",
                  exercises: {
                    create: {
                      id: EXERCISE_UNGRADEABLE,
                      type: "MULTIPLE_CHOICE",
                      prompt: "unanswerable",
                      order: 1,
                      status: "PUBLISHED",
                      options: {
                        create: [
                          { id: OPTION_UNGRADEABLE_A, label: "first", isCorrect: false, order: 1 },
                          { id: OPTION_UNGRADEABLE_B, label: "second", isCorrect: false, order: 2 },
                        ],
                      },
                    },
                  },
                },
                {
                  id: LESSON_MIXED,
                  slug: "mixed-status-suite",
                  title: "Mixed status",
                  description: "One published and one archived exercise.",
                  order: 3,
                  status: "PUBLISHED",
                  exercises: {
                    create: [
                      {
                        id: EXERCISE_MIXED_LIVE,
                        type: "MULTIPLE_CHOICE",
                        prompt: "live question",
                        order: 1,
                        status: "PUBLISHED",
                        options: {
                          create: [
                            {
                              id: OPTION_MIXED_LIVE,
                              label: "live answer",
                              isCorrect: true,
                              order: 1,
                            },
                            {
                              id: OPTION_MIXED_LIVE_WRONG,
                              label: "live distractor",
                              isCorrect: false,
                              order: 2,
                            },
                          ],
                        },
                      },
                      {
                        id: EXERCISE_MIXED_ARCHIVED,
                        type: "MULTIPLE_CHOICE",
                        prompt: "retired question",
                        order: 2,
                        status: "ARCHIVED",
                        options: {
                          create: [
                            {
                              id: OPTION_MIXED_ARCHIVED,
                              label: "retired answer",
                              isCorrect: true,
                              order: 1,
                            },
                            {
                              id: OPTION_MIXED_ARCHIVED_WRONG,
                              label: "retired distractor",
                              isCorrect: false,
                              order: 2,
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
                {
                  id: LESSON_SINGLE,
                  slug: "single-option-suite",
                  title: "Single option",
                  description: "One option, which is not a gradeable question.",
                  order: 4,
                  status: "PUBLISHED",
                  exercises: {
                    create: {
                      id: EXERCISE_SINGLE,
                      type: "MULTIPLE_CHOICE",
                      prompt: "single question",
                      order: 1,
                      status: "PUBLISHED",
                      options: {
                        create: {
                          id: OPTION_SINGLE,
                          label: "only answer",
                          isCorrect: true,
                          order: 1,
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    });

    await prisma.course.create({
      data: {
        id: COURSE_DRAFT,
        slug: "n5-draft-suite",
        title: "JLPT N5 (draft)",
        description: "Draft spine: structurally valid but never published.",
        level: "N5",
        order: 2,
        status: "DRAFT",
        chapters: {
          create: {
            id: CHAPTER_DRAFT,
            slug: "n5-draft-chapter-suite",
            title: "Draft chapter",
            description: "Draft chapter for the answer-submission suite.",
            order: 1,
            status: "PUBLISHED",
            lessons: {
              create: {
                id: LESSON_DRAFT,
                slug: "draft-lesson-suite",
                title: "Draft lesson",
                description: "A draft question must be ungradable.",
                order: 1,
                status: "PUBLISHED",
                exercises: {
                  create: {
                    id: EXERCISE_DRAFT,
                    type: "MULTIPLE_CHOICE",
                    prompt: "draft question",
                    order: 1,
                    status: "PUBLISHED",
                    options: {
                      create: { id: OPTION_DRAFT, label: "draft answer", isCorrect: true, order: 1 },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  afterAll(async () => {
    for (const [name, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) {
        Reflect.deleteProperty(process.env, name);
      } else {
        process.env[name] = value;
      }
    }

    // `beforeAll` can fail before the client exists — a rejected
    // TEST_DATABASE_URL is the common case. Cleanup would then throw a TypeError
    // that hides the real reason the suite never started.
    if (!clientReady) {
      return;
    }

    // Best effort: runs even when an earlier assertion failed, so a red suite
    // does not leave rows behind in the test database.
    //
    // Attempts are removed before the course rather than relying on cascades.
    // `ExerciseAttempt.exercise` is `onDelete: Restrict`, which PostgreSQL checks
    // immediately, so cascading from a course into exercises while attempts still
    // reference them is an error rather than a silent cleanup.
    await prisma.exerciseAttempt.deleteMany({ where: { userId: { in: [...SUITE_USER_IDS] } } });
    await prisma.lessonCompletion.deleteMany({ where: { userId: { in: [...SUITE_USER_IDS] } } });
    await prisma.course.deleteMany({ where: { id: { in: [...COURSE_IDS] } } });
    expect(await prisma.course.count({ where: { id: { in: [...COURSE_IDS] } } })).toBe(0);
    expect(await prisma.exerciseAttempt.count({ where: { userId: { in: [...SUITE_USER_IDS] } } })).toBe(0);
    expect(await prisma.lessonCompletion.count({ where: { userId: { in: [...SUITE_USER_IDS] } } })).toBe(0);

    await prisma.user.deleteMany({ where: { id: { in: [...SUITE_USER_IDS] } } });
    expect(await prisma.user.count({ where: { id: { in: [...SUITE_USER_IDS] } } })).toBe(0);

    await prisma.$disconnect();
    Reflect.deleteProperty(globalThis, "prisma");
  });

  beforeEach(async () => {
    getServerSessionMock.mockReset();
    getServerSessionMock.mockResolvedValue(sessionFor(STUDENT_ID, "STUDENT"));

    // Each test starts from an empty history so the append-only and completion
    // assertions cannot leak into one another. Every suite identity is cleared,
    // not just the student: a test that answers as the editor would otherwise
    // leave a row that a later count assertion reads.
    await prisma.exerciseAttempt.deleteMany({ where: { userId: { in: [...SUITE_USER_IDS] } } });
    await prisma.lessonCompletion.deleteMany({ where: { userId: { in: [...SUITE_USER_IDS] } } });
  });

  describe("authorization", () => {
    it("refuses a missing session without writing an attempt", async () => {
      getServerSessionMock.mockResolvedValue(null);

      await expectFailure(EXERCISE_ONE, OPTION_ONE_RIGHT, "unauthenticated");
      expect(await prisma.exerciseAttempt.count({ where: { userId: STUDENT_ID } })).toBe(0);
    });

    it("refuses a session whose id is not in the database", async () => {
      // The session claims an id the attacker chose. Only the stored row may
      // grant access, so this must not become an attempt.
      await prisma.user.create({
        data: { id: DELETED_ID, email: "deleted@learning-suite.test" },
      });
      await prisma.user.delete({ where: { id: DELETED_ID } });
      getServerSessionMock.mockResolvedValue(sessionFor(DELETED_ID, "ADMIN"));

      // Answering as `unknown_user` would let the caller enumerate account UUIDs,
      // so it is deliberately indistinguishable from having no session at all.
      await expectFailure(EXERCISE_ONE, OPTION_ONE_RIGHT, "unauthenticated");
      expect(await prisma.exerciseAttempt.count({ where: { userId: DELETED_ID } })).toBe(0);
    });

    it("admits a content editor, because the ladder ranks editors above students", async () => {
      getServerSessionMock.mockResolvedValue(sessionFor(EDITOR_ID, "CONTENT_EDITOR"));

      expect(await submitAnswer({ exerciseId: EXERCISE_ONE, optionId: OPTION_ONE_RIGHT }))
        .toMatchObject({ ok: true, isCorrect: true });
      expect(await prisma.exerciseAttempt.count({ where: { userId: EDITOR_ID } })).toBe(1);
    });
  });

  describe("input validation", () => {
    it("refuses a malformed exercise id", async () => {
      await expectFailure("not-a-uuid", OPTION_ONE_RIGHT, "invalid_input");
    });

    it("refuses a malformed option id", async () => {
      await expectFailure(EXERCISE_ONE, "not-a-uuid", "invalid_input");
    });

    it("refuses an unknown exercise rather than reporting it as unanswerable", async () => {
      await expectFailure(UNRELATED_ID, OPTION_ONE_RIGHT, "unknown_exercise");
    });
  });

  describe("published-content gating", () => {
    it("refuses an exercise whose course is still a draft", async () => {
      // The draft question is fully formed and its option is correct, so only the
      // publication filter can reject it. Without that filter a learner could
      // grade their own quiz by guessing the exercise UUID.
      await expectFailure(EXERCISE_DRAFT, OPTION_DRAFT, "unknown_exercise");
      expect(await prisma.exerciseAttempt.count()).toBe(0);
    });

    it("refuses an archived exercise", async () => {
      await expectFailure(EXERCISE_MIXED_ARCHIVED, OPTION_MIXED_ARCHIVED, "unknown_exercise");
    });
  });

  describe("grading", () => {
    it("grades a correct submission and reveals the key afterwards", async () => {
      const result = await submitAnswer({
        exerciseId: EXERCISE_ONE,
        optionId: OPTION_ONE_RIGHT,
      });

      expect(result).toEqual({
        ok: true,
        isCorrect: true,
        correctOptionId: OPTION_ONE_RIGHT,
        correctLabel: "mashita",
        explanation: "The polite past form of ます is ました.",
        attemptNumber: 1,
        lessonCompleted: false,
      });
    });

    it("grades an incorrect submission without claiming success", async () => {
      const result = await submitAnswer({
        exerciseId: EXERCISE_ONE,
        optionId: OPTION_ONE_WRONG,
      });

      expect(result).toMatchObject({ ok: true, isCorrect: false, attemptNumber: 1 });
    });

    it("refuses an option that belongs to a different exercise", async () => {
      // Real ids from a real published exercise, sent to the wrong question. The
      // option lookup is scoped to the exercise, so this cannot score.
      await expectFailure(EXERCISE_TWO, OPTION_ONE_RIGHT, "unknown_option");
      expect(await prisma.exerciseAttempt.count()).toBe(0);
    });

    it("refuses an exercise that has no correct option", async () => {
      await expectFailure(EXERCISE_UNGRADEABLE, OPTION_UNGRADEABLE_A, "ungradeable_exercise");
      expect(await prisma.exerciseAttempt.count()).toBe(0);
    });

    it("refuses a multiple choice that offers only one option", async () => {
      await expectFailure(EXERCISE_SINGLE, OPTION_SINGLE, "ungradeable_exercise");
      expect(await prisma.exerciseAttempt.count()).toBe(0);
    });

    it("persists the chosen option and denormalized lesson id", async () => {
      await submitAnswer({ exerciseId: EXERCISE_ONE, optionId: OPTION_ONE_WRONG });

      const attempt = await prisma.exerciseAttempt.findFirstOrThrow({
        where: { userId: STUDENT_ID, exerciseId: EXERCISE_ONE },
      });
      expect(attempt.givenOptionId).toBe(OPTION_ONE_WRONG);
      expect(attempt.lessonId).toBe(LESSON_ID);
      expect(attempt.isCorrect).toBe(false);
      expect(attempt.attemptNumber).toBe(1);
    });
  });

  describe("attempt history", () => {
    it("appends a retry instead of overwriting the previous answer", async () => {
      const first = await submitAnswer({ exerciseId: EXERCISE_ONE, optionId: OPTION_ONE_WRONG });
      const second = await submitAnswer({ exerciseId: EXERCISE_ONE, optionId: OPTION_ONE_RIGHT });

      expect(first).toMatchObject({ ok: true, attemptNumber: 1, isCorrect: false });
      expect(second).toMatchObject({ ok: true, attemptNumber: 2, isCorrect: true });

      // Both attempts survive: the score uses the latest, so the history is kept.
      const attempts = await prisma.exerciseAttempt.findMany({
        where: { userId: STUDENT_ID, exerciseId: EXERCISE_ONE },
        orderBy: { attemptNumber: "asc" },
        select: { attemptNumber: true, isCorrect: true, givenOptionId: true },
      });
      expect(attempts).toEqual([
        { attemptNumber: 1, isCorrect: false, givenOptionId: OPTION_ONE_WRONG },
        { attemptNumber: 2, isCorrect: true, givenOptionId: OPTION_ONE_RIGHT },
      ]);
    });

    it("counts attempts per learner, so a second learner starts at one", async () => {
      await submitAnswer({ exerciseId: EXERCISE_ONE, optionId: OPTION_ONE_RIGHT });
      getServerSessionMock.mockResolvedValue(sessionFor(UNRELATED_ID, "STUDENT"));

      expect(await submitAnswer({ exerciseId: EXERCISE_ONE, optionId: OPTION_ONE_RIGHT })).toMatchObject({
        ok: true,
        attemptNumber: 1,
      });
      expect(await prisma.exerciseAttempt.count({ where: { userId: UNRELATED_ID } })).toBe(1);
    });
  });

  describe("lesson completion", () => {
    it("does not complete a lesson while an exercise is unanswered", async () => {
      const result = await submitAnswer({ exerciseId: EXERCISE_ONE, optionId: OPTION_ONE_RIGHT });

      expect(result).toMatchObject({ ok: true, lessonCompleted: false });
      expect(await prisma.lessonCompletion.count({ where: { userId: STUDENT_ID } })).toBe(0);
    });

    it("completes a lesson once every published exercise is answered", async () => {
      await submitAnswer({ exerciseId: EXERCISE_ONE, optionId: OPTION_ONE_RIGHT });
      const second = await submitAnswer({ exerciseId: EXERCISE_TWO, optionId: OPTION_TWO_RIGHT });

      expect(second).toMatchObject({ ok: true, lessonCompleted: true });
      const completion = await prisma.lessonCompletion.findMany({
        where: { userId: STUDENT_ID },
        select: { lessonId: true },
      });
      expect(completion).toEqual([{ lessonId: LESSON_ID }]);
    });

    it("completes a lesson with exactly one published exercise", async () => {
      expect(
        await submitAnswer({ exerciseId: EXERCISE_MIXED_LIVE, optionId: OPTION_MIXED_LIVE }),
      ).toMatchObject({ ok: true, lessonCompleted: true });
    });

    it("ignores archived exercises when counting a lesson complete", async () => {
      // An attempt recorded while the exercise was still published must not keep
      // the lesson permanently completable against a question that has since
      // been retired, and the retired question must not raise the denominator.
      await prisma.exerciseAttempt.create({
        data: {
          userId: STUDENT_ID,
          exerciseId: EXERCISE_MIXED_ARCHIVED,
          lessonId: LESSON_MIXED,
          isCorrect: true,
          givenOptionId: OPTION_MIXED_ARCHIVED,
          attemptNumber: 1,
        },
      });

      expect(
        await submitAnswer({ exerciseId: EXERCISE_MIXED_LIVE, optionId: OPTION_MIXED_LIVE }),
      ).toMatchObject({ ok: true, lessonCompleted: true });
    });

    it("records completion once however many times the lesson is revisited", async () => {
      await submitAnswer({ exerciseId: EXERCISE_ONE, optionId: OPTION_ONE_RIGHT });
      await submitAnswer({ exerciseId: EXERCISE_TWO, optionId: OPTION_TWO_RIGHT });
      await submitAnswer({ exerciseId: EXERCISE_ONE, optionId: OPTION_ONE_RIGHT });
      await submitAnswer({ exerciseId: EXERCISE_TWO, optionId: OPTION_TWO_WRONG });

      // Four submissions, one row: revisiting a completed lesson must not add
      // duplicate progress events.
      expect(await prisma.lessonCompletion.count({ where: { userId: STUDENT_ID } })).toBe(1);
    });

    it("keeps completion scoped to the lesson that was finished", async () => {
      await submitAnswer({ exerciseId: EXERCISE_ONE, optionId: OPTION_ONE_RIGHT });
      await submitAnswer({ exerciseId: EXERCISE_TWO, optionId: OPTION_TWO_RIGHT });

      // The unrelated lesson shares the chapter and course but was never answered.
      expect(await prisma.lessonCompletion.count({ where: { userId: STUDENT_ID } })).toBe(1);
      expect(
        await prisma.lessonCompletion.findFirst({
          where: { userId: STUDENT_ID },
          select: { lessonId: true },
        }),
      ).toEqual({ lessonId: LESSON_ID });
    });
  });
});
