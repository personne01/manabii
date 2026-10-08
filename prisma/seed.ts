import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import {
  ContentStatus,
  type Prisma,
  PrismaClient,
} from "../app/generated/prisma/client";
import {
  type SeedChapter,
  type SeedCourse,
  type SeedExercise,
  type SeedGrammar,
  type SeedKanji,
  type SeedLesson,
  type SeedVocabulary,
  describe,
  seedCourse,
} from "./seed-content";

const connectionString = process.env["DATABASE_URL"];

if (connectionString === undefined || connectionString === "") {
  throw new Error("Missing required environment variable: DATABASE_URL");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

// Vocabulary, Grammar, and Kanji carry no natural unique key: the schema
// intentionally allows the same term at two JLPT levels, so identity is
// resolved with `findFirst` on the (term|pattern|character, level) pair that
// makes a row unique in practice. Compound `@@unique` constraints on the
// structural tables are used directly as the upsert key instead.
async function upsertVocabulary(
  tx: Prisma.TransactionClient,
  entry: SeedVocabulary,
) {
  const data = {
    reading: entry.reading,
    meaning: entry.meaning,
    partOfSpeech: entry.partOfSpeech,
    exampleSentence: entry.exampleSentence,
    exampleReading: entry.exampleReading,
    exampleTranslation: entry.exampleTranslation,
    tags: entry.tags,
  };

  const existing = await tx.vocabulary.findFirst({
    where: { term: entry.term, jlpt: "N5" },
    select: { id: true },
  });

  if (existing !== null) {
    return tx.vocabulary.update({
      where: { id: existing.id },
      data,
      select: { id: true },
    });
  }

  return tx.vocabulary.create({
    data: { term: entry.term, jlpt: "N5", ...data },
    select: { id: true },
  });
}

async function upsertGrammar(tx: Prisma.TransactionClient, entry: SeedGrammar) {
  const data = {
    reading: entry.reading,
    meaning: entry.meaning,
    formation: entry.formation,
    explanation: entry.explanation,
    register: entry.register,
    exampleSentence: entry.exampleSentence,
    exampleReading: entry.exampleReading,
    exampleTranslation: entry.exampleTranslation,
    relatedSlugs: entry.relatedSlugs,
  };

  const existing = await tx.grammar.findFirst({
    where: { pattern: entry.pattern, jlpt: "N5" },
    select: { id: true },
  });

  if (existing !== null) {
    return tx.grammar.update({
      where: { id: existing.id },
      data,
      select: { id: true },
    });
  }

  return tx.grammar.create({
    data: { pattern: entry.pattern, jlpt: "N5", ...data },
    select: { id: true },
  });
}

async function upsertKanji(tx: Prisma.TransactionClient, entry: SeedKanji) {
  const data = {
    meaning: entry.meaning,
    onyomi: entry.onyomi,
    kunyomi: entry.kunyomi,
    strokeCount: entry.strokeCount,
  };

  const existing = await tx.kanji.findFirst({
    where: { character: entry.character, jlpt: "N5" },
    select: { id: true },
  });

  if (existing !== null) {
    return tx.kanji.update({
      where: { id: existing.id },
      data,
      select: { id: true },
    });
  }

  return tx.kanji.create({
    data: { character: entry.character, jlpt: "N5", ...data },
    select: { id: true },
  });
}

// Options are keyed by (exerciseId, order) and then pruned back to the authored
// set. Without the prune, shrinking an option list would leave the trailing
// options behind — and `gradeAnswer` refuses any exercise that does not have
// exactly one correct option, so a stale survivor would make the exercise
// permanently ungradeable. Attempt rows are preserved: `ExerciseAttempt.givenOption`
// is `onDelete: SetNull`.
async function upsertExercise(
  tx: Prisma.TransactionClient,
  lessonId: string,
  order: number,
  entry: SeedExercise,
) {
  const exercise = await tx.exercise.upsert({
    where: { lessonId_order: { lessonId, order } },
    create: {
      lessonId,
      order,
      type: entry.type,
      prompt: entry.prompt,
      explanation: entry.explanation,
      difficulty: entry.difficulty,
      status: ContentStatus.PUBLISHED,
    },
    update: {
      type: entry.type,
      prompt: entry.prompt,
      explanation: entry.explanation,
      difficulty: entry.difficulty,
      status: ContentStatus.PUBLISHED,
    },
    select: { id: true },
  });

  const labels = entry.options.map((option) => option.label);

  await tx.exerciseOption.deleteMany({
    where: {
      exerciseId: exercise.id,
      ...(labels.length > 0 ? { label: { notIn: labels } } : {}),
    },
  });

  for (const [order, option] of entry.options.entries()) {
    await tx.exerciseOption.upsert({
      where: { exerciseId_order: { exerciseId: exercise.id, order } },
      create: {
        exerciseId: exercise.id,
        order,
        label: option.label,
        isCorrect: option.isCorrect,
      },
      update: { label: option.label, isCorrect: option.isCorrect },
    });
  }
}

async function upsertLesson(
  tx: Prisma.TransactionClient,
  chapterId: string,
  lesson: SeedLesson,
) {
  const row = await tx.lesson.upsert({
    where: { chapterId_slug: { chapterId, slug: lesson.slug } },
    create: {
      chapterId,
      slug: lesson.slug,
      title: lesson.title,
      description: describe(lesson.description),
      order: lesson.order,
      estimatedMinutes: lesson.estimatedMinutes,
      status: ContentStatus.PUBLISHED,
    },
    update: {
      title: lesson.title,
      description: describe(lesson.description),
      order: lesson.order,
      estimatedMinutes: lesson.estimatedMinutes,
      status: ContentStatus.PUBLISHED,
    },
    select: { id: true },
  });

  for (const [order, entry] of lesson.vocabulary.entries()) {
    const vocabulary = await upsertVocabulary(tx, entry);
    await tx.lessonVocabulary.upsert({
      where: {
        lessonId_vocabularyId: { lessonId: row.id, vocabularyId: vocabulary.id },
      },
      create: { lessonId: row.id, vocabularyId: vocabulary.id, order },
      update: { order },
    });
  }

  for (const [order, entry] of lesson.grammar.entries()) {
    const grammar = await upsertGrammar(tx, entry);
    await tx.lessonGrammar.upsert({
      where: { lessonId_grammarId: { lessonId: row.id, grammarId: grammar.id } },
      create: { lessonId: row.id, grammarId: grammar.id, order },
      update: { order },
    });
  }

  for (const [order, entry] of lesson.kanji.entries()) {
    const kanji = await upsertKanji(tx, entry);
    await tx.lessonKanji.upsert({
      where: { lessonId_kanjiId: { lessonId: row.id, kanjiId: kanji.id } },
      create: { lessonId: row.id, kanjiId: kanji.id, order },
      update: { order },
    });
  }

  for (const [order, exercise] of lesson.exercises.entries()) {
    await upsertExercise(tx, row.id, order, exercise);
  }
}

async function upsertChapter(
  tx: Prisma.TransactionClient,
  courseId: string,
  chapter: SeedChapter,
) {
  const row = await tx.chapter.upsert({
    where: { courseId_slug: { courseId, slug: chapter.slug } },
    create: {
      courseId,
      slug: chapter.slug,
      title: chapter.title,
      description: describe(chapter.description),
      order: chapter.order,
      status: ContentStatus.PUBLISHED,
    },
    update: {
      title: chapter.title,
      description: describe(chapter.description),
      order: chapter.order,
      status: ContentStatus.PUBLISHED,
    },
    select: { id: true },
  });

  for (const lesson of chapter.lessons) {
    await upsertLesson(tx, row.id, lesson);
  }
}

async function upsertCourse(tx: Prisma.TransactionClient, course: SeedCourse) {
  const row = await tx.course.upsert({
    where: { slug: course.slug },
    create: {
      slug: course.slug,
      title: course.title,
      description: describe(course.description),
      level: course.level,
      order: course.order,
      status: ContentStatus.PUBLISHED,
    },
    update: {
      title: course.title,
      description: describe(course.description),
      level: course.level,
      order: course.order,
      status: ContentStatus.PUBLISHED,
    },
    select: { id: true },
  });

  for (const chapter of course.chapters) {
    await upsertChapter(tx, row.id, chapter);
  }
}

async function main() {
  // One transaction for the whole graph: a partially applied curriculum would
  // publish a course whose lessons or exercises are missing, and the throwaway
  // run below would then read a state no single seed invocation can produce.
  // The timeout is raised because the default (5s) is the interactive-transaction
  // default, not a measured budget for a first-run insert of the full tree.
  await prisma.$transaction(async (tx) => upsertCourse(tx, seedCourse), {
    timeout: 120_000,
  });

  const [
    courses,
    chapters,
    lessons,
    exercises,
    exerciseOptions,
    vocabulary,
    grammar,
    kanji,
  ] = await prisma.$transaction([
    prisma.course.count(),
    prisma.chapter.count(),
    prisma.lesson.count(),
    prisma.exercise.count(),
    prisma.exerciseOption.count(),
    prisma.vocabulary.count(),
    prisma.grammar.count(),
    prisma.kanji.count(),
  ]);

  console.log(
    [
      "Seed complete.",
      `  course:         ${courses}`,
      `  chapter:        ${chapters}`,
      `  lesson:         ${lessons}`,
      `  exercise:       ${exercises}`,
      `  exerciseOption: ${exerciseOptions}`,
      `  vocabulary:     ${vocabulary}`,
      `  grammar:        ${grammar}`,
      `  kanji:          ${kanji}`,
    ].join("\n"),
  );
}

const run = async (): Promise<void> => {
  try {
    await main();
  } finally {
    await prisma.$disconnect();
  }
};

// `tsx` emits CommonJS here, so top-level `await` is a transform error that
// `tsc` does not catch — reintroducing it passes typecheck and breaks the seed.
void run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
