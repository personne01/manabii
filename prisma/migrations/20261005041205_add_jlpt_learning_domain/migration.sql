-- CreateEnum
CREATE TYPE "JLPTLevel" AS ENUM ('N5', 'N4', 'N3', 'N2', 'N1');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE');

-- CreateTable
CREATE TABLE "Course" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" TEXT NOT NULL,
    "level" "JLPTLevel" NOT NULL,
    "order" INTEGER NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chapter" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" UUID NOT NULL,
    "chapterId" UUID NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vocabulary" (
    "id" UUID NOT NULL,
    "term" VARCHAR(120) NOT NULL,
    "reading" VARCHAR(120) NOT NULL,
    "meaning" VARCHAR(255) NOT NULL,
    "partOfSpeech" VARCHAR(60) NOT NULL,
    "jlpt" "JLPTLevel" NOT NULL,
    "exampleSentence" TEXT,
    "exampleReading" VARCHAR(400),
    "exampleTranslation" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Vocabulary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grammar" (
    "id" UUID NOT NULL,
    "pattern" VARCHAR(120) NOT NULL,
    "reading" VARCHAR(120),
    "meaning" VARCHAR(255) NOT NULL,
    "formation" VARCHAR(255) NOT NULL,
    "explanation" TEXT,
    "register" VARCHAR(60) NOT NULL,
    "exampleSentence" TEXT NOT NULL,
    "exampleReading" VARCHAR(400),
    "exampleTranslation" TEXT NOT NULL,
    "relatedSlugs" TEXT[],
    "jlpt" "JLPTLevel" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Grammar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kanji" (
    "id" UUID NOT NULL,
    "character" VARCHAR(8) NOT NULL,
    "meaning" VARCHAR(255) NOT NULL,
    "onyomi" TEXT[],
    "kunyomi" TEXT[],
    "strokeCount" INTEGER,
    "jlpt" "JLPTLevel" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Kanji_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonVocabulary" (
    "lessonId" UUID NOT NULL,
    "vocabularyId" UUID NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "LessonVocabulary_pkey" PRIMARY KEY ("lessonId","vocabularyId")
);

-- CreateTable
CREATE TABLE "LessonGrammar" (
    "lessonId" UUID NOT NULL,
    "grammarId" UUID NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "LessonGrammar_pkey" PRIMARY KEY ("lessonId","grammarId")
);

-- CreateTable
CREATE TABLE "LessonKanji" (
    "lessonId" UUID NOT NULL,
    "kanjiId" UUID NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "LessonKanji_pkey" PRIMARY KEY ("lessonId","kanjiId")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" UUID NOT NULL,
    "lessonId" UUID NOT NULL,
    "type" "ExerciseType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "explanation" TEXT,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseOption" (
    "id" UUID NOT NULL,
    "exerciseId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExerciseOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseAttempt" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "exerciseId" UUID NOT NULL,
    "lessonId" UUID NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "givenOptionId" UUID,
    "attemptNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExerciseAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonCompletion" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "lessonId" UUID NOT NULL,
    "completedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");

-- CreateIndex
CREATE INDEX "Course_level_order_idx" ON "Course"("level", "order");

-- CreateIndex
CREATE INDEX "Course_status_idx" ON "Course"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Chapter_courseId_slug_key" ON "Chapter"("courseId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Chapter_courseId_order_key" ON "Chapter"("courseId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_chapterId_slug_key" ON "Lesson"("chapterId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_chapterId_order_key" ON "Lesson"("chapterId", "order");

-- CreateIndex
CREATE INDEX "Vocabulary_jlpt_idx" ON "Vocabulary"("jlpt");

-- CreateIndex
CREATE INDEX "Grammar_jlpt_idx" ON "Grammar"("jlpt");

-- CreateIndex
CREATE INDEX "Kanji_jlpt_idx" ON "Kanji"("jlpt");

-- CreateIndex
CREATE INDEX "LessonVocabulary_lessonId_order_idx" ON "LessonVocabulary"("lessonId", "order");

-- CreateIndex
CREATE INDEX "LessonGrammar_lessonId_order_idx" ON "LessonGrammar"("lessonId", "order");

-- CreateIndex
CREATE INDEX "LessonKanji_lessonId_order_idx" ON "LessonKanji"("lessonId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_lessonId_order_key" ON "Exercise"("lessonId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseOption_exerciseId_order_key" ON "ExerciseOption"("exerciseId", "order");

-- CreateIndex
CREATE INDEX "ExerciseAttempt_userId_createdAt_idx" ON "ExerciseAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ExerciseAttempt_lessonId_idx" ON "ExerciseAttempt"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseAttempt_exerciseId_userId_attemptNumber_key" ON "ExerciseAttempt"("exerciseId", "userId", "attemptNumber");

-- CreateIndex
CREATE INDEX "LessonCompletion_userId_completedAt_idx" ON "LessonCompletion"("userId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LessonCompletion_userId_lessonId_key" ON "LessonCompletion"("userId", "lessonId");

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonVocabulary" ADD CONSTRAINT "LessonVocabulary_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonVocabulary" ADD CONSTRAINT "LessonVocabulary_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "Vocabulary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonGrammar" ADD CONSTRAINT "LessonGrammar_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonGrammar" ADD CONSTRAINT "LessonGrammar_grammarId_fkey" FOREIGN KEY ("grammarId") REFERENCES "Grammar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonKanji" ADD CONSTRAINT "LessonKanji_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonKanji" ADD CONSTRAINT "LessonKanji_kanjiId_fkey" FOREIGN KEY ("kanjiId") REFERENCES "Kanji"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseOption" ADD CONSTRAINT "ExerciseOption_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseAttempt" ADD CONSTRAINT "ExerciseAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseAttempt" ADD CONSTRAINT "ExerciseAttempt_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseAttempt" ADD CONSTRAINT "ExerciseAttempt_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseAttempt" ADD CONSTRAINT "ExerciseAttempt_givenOptionId_fkey" FOREIGN KEY ("givenOptionId") REFERENCES "ExerciseOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonCompletion" ADD CONSTRAINT "LessonCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonCompletion" ADD CONSTRAINT "LessonCompletion_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
