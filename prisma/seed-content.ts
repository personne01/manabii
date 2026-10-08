// Seed data for the JLPT N5 slice.
//
// IMPORTANT — READ BEFORE EDITING (AGENTS.md section 9):
//
// Every Japanese string below was written by an AI and is therefore UNVERIFIED.
// It exists so the learning path has something to render and so the published-only
// read path can be exercised end to end. It is not authoritative curriculum.
//
// `CONTENT_REVIEWED` gates the notice the seeder prepends to student-visible
// descriptions. Flip it to true only once a human has verified the readings and
// glosses below; `false` is the honest default while they are AI-drafted
// (AGENTS.md section 9).
//
// Readings are written out explicitly rather than derived, because kanji readings
// cannot be generated reliably from Unicode and fabricating one is forbidden
// (AGENTS.md section 9).

export type SeedExerciseType = "MULTIPLE_CHOICE" | "TRUE_FALSE";

export interface SeedOption {
  label: string;
  isCorrect: boolean;
}

export interface SeedExercise {
  type: SeedExerciseType;
  prompt: string;
  explanation: string;
  difficulty: number;
  options: SeedOption[];
}

export interface SeedVocabulary {
  term: string;
  reading: string;
  meaning: string;
  partOfSpeech: string;
  exampleSentence: string;
  exampleReading: string;
  exampleTranslation: string;
  tags: string[];
}

export interface SeedGrammar {
  pattern: string;
  reading: string;
  meaning: string;
  formation: string;
  explanation: string;
  register: string;
  exampleSentence: string;
  exampleReading: string;
  exampleTranslation: string;
  relatedSlugs: string[];
}

export interface SeedKanji {
  character: string;
  meaning: string;
  onyomi: string[];
  kunyomi: string[];
  /** Present only where a reliable published source gives a count. */
  strokeCount: number | null;
}

export interface SeedLesson {
  slug: string;
  title: string;
  description: string;
  order: number;
  estimatedMinutes: number;
  vocabulary: SeedVocabulary[];
  grammar: SeedGrammar[];
  kanji: SeedKanji[];
  exercises: SeedExercise[];
}

export interface SeedChapter {
  slug: string;
  title: string;
  description: string;
  order: number;
  lessons: SeedLesson[];
}

export interface SeedCourse {
  slug: string;
  title: string;
  description: string;
  level: "N5";
  order: number;
  chapters: SeedChapter[];
}

export const CONTENT_REVIEWED = false;

export const REVIEW_PENDING_NOTICE =
  "⚠ Unverified seed content — AI-drafted and awaiting human review. ";

export function describe(text: string): string {
  return CONTENT_REVIEWED ? text : `${REVIEW_PENDING_NOTICE}${text}`;
}

export const seedCourse: SeedCourse = {
  slug: "jlpt-n5",
  title: "JLPT N5 — First Steps",
  description:
    "Greetings and everyday food, the two things a beginner needs in the first " +
    "week.",
  level: "N5",
  order: 1,
  chapters: [
    {
      slug: "aisatsu",
      title: "Greetings",
      description:
        "Saying hello, good morning, good evening, and thank you.",
      order: 1,
      lessons: [
        {
          slug: "aisatsu-basic",
          title: "Everyday Greetings",
          description:
            "Four greetings you will use in every lesson from here on.",
          order: 1,
          estimatedMinutes: 5,
          vocabulary: [
            {
              term: "こんにちは",
              reading: "こんにちは",
              meaning: "hello / good afternoon",
              partOfSpeech: "Interjection",
              exampleSentence: "こんにちは、わたしは がくせいです。",
              exampleReading: "こんにちは、わたしは がくせいです。",
              exampleTranslation: "Hello, I am a student.",
              tags: ["greeting", "daily"],
            },
            {
              term: "おはようございます",
              reading: "おはようございます",
              meaning: "good morning (polite)",
              partOfSpeech: "Interjection",
              exampleSentence: "おはようございます。よく きます。",
              exampleReading: "おはようございます。よく きます。",
              exampleTranslation: "Good morning. You often come.",
              tags: ["greeting", "polite"],
            },
            {
              term: "こんばんは",
              reading: "こんばんは",
              meaning: "good evening",
              partOfSpeech: "Interjection",
              exampleSentence: "こんばんは、にちようは やすみです。",
              exampleReading: "こんばんは、にちようは やすみです。",
              exampleTranslation: "Good evening, Sundays are days off.",
              tags: ["greeting", "daily"],
            },
            {
              term: "ありがとうございます",
              reading: "ありがとうございます",
              meaning: "thank you very much (polite)",
              partOfSpeech: "Interjection",
              exampleSentence: "てつだんを ありがとうございます。",
              exampleReading: "てつだんを ありがとうございます。",
              exampleTranslation: "Thank you very much for the special treatment.",
              tags: ["greeting", "polite"],
            },
          ],
          grammar: [
            {
              pattern: "は",
              reading: "わ",
              meaning: "topic particle: marks what the sentence is about",
              formation: "Noun + は",
              explanation:
                "は is read as わ when it follows a noun. It marks the topic of " +
                "the sentence and is written は even when pronounced わ.",
              register: "Neutral",
              exampleSentence: "わたしは がくせいです。",
              exampleReading: "わたしは がくせいです。",
              exampleTranslation: "I am a student.",
              relatedSlugs: ["を"],
            },
          ],
          kanji: [
            {
              character: "日",
              meaning: "day, sun",
              onyomi: ["ニチ", "ジツ"],
              kunyomi: ["ひ", "-び", "-か"],
              strokeCount: 4,
            },
          ],
          exercises: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "「____、わたしは がくせいです。」 — Which greeting fits?",
              explanation:
                "こんにちは is the general daytime greeting and is the natural " +
                "way to open a conversation.",
              difficulty: 1,
              options: [
                { label: "こんにちは", isCorrect: true },
                { label: "こんばんは", isCorrect: false },
                { label: "ありがとうございます", isCorrect: false },
                { label: "さようなら", isCorrect: false },
              ],
            },
            {
              type: "TRUE_FALSE",
              prompt: "おはようございます is said in the morning.",
              explanation:
                "おはよう comes from the word 朝 (あさ), meaning morning.",
              difficulty: 1,
              options: [
                { label: "True", isCorrect: true },
                { label: "False", isCorrect: false },
              ],
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "What does 「ありがとうございます」 mean?",
              explanation:
                "It is the polite form of 「ありがとう」, used when thanking " +
                "someone for something they did for you.",
              difficulty: 2,
              options: [
                { label: "Thank you very much", isCorrect: true },
                { label: "Goodbye", isCorrect: false },
                { label: "Excuse me", isCorrect: false },
                { label: "Good night", isCorrect: false },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "tabemono",
      title: "Food and Drink",
      description: "Eating, drinking, and the particle that marks the object.",
      order: 2,
      lessons: [
        {
          slug: "tabemono-basic",
          title: "What Did You Eat?",
          description:
            "Two verbs and one particle cover most of what you can order at N5.",
          order: 1,
          estimatedMinutes: 6,
          vocabulary: [
            {
              term: "たべる",
              reading: "たべる",
              meaning: "to eat",
              partOfSpeech: "Verb (ichidan)",
              exampleSentence: "あさごはんを たべます。",
              exampleReading: "あさごはんを たべます。",
              exampleTranslation: "I eat breakfast.",
              tags: ["verb", "food"],
            },
            {
              term: "のむ",
              reading: "のむ",
              meaning: "to drink",
              partOfSpeech: "Verb (godan)",
              exampleSentence: "みずを のみます。",
              exampleReading: "みずを のみます。",
              exampleTranslation: "I drink water.",
              tags: ["verb", "drink"],
            },
            {
              term: "みず",
              reading: "みず",
              meaning: "water",
              partOfSpeech: "Noun",
              exampleSentence: "みずを のみます。",
              exampleReading: "みずを のみます。",
              exampleTranslation: "I drink water.",
              tags: ["noun", "drink"],
            },
            {
              term: "ごはん",
              reading: "ごはん",
              meaning: "rice, meal",
              partOfSpeech: "Noun",
              exampleSentence: "ごはんを たべます。",
              exampleReading: "ごはんを たべます。",
              exampleTranslation: "I eat a meal.",
              tags: ["noun", "food"],
            },
          ],
          grammar: [
            {
              pattern: "を",
              reading: "を",
              meaning: "object particle: marks the direct object of a verb",
              formation: "Noun + を + Verb",
              explanation:
                "を follows the thing being acted on. It is used with verbs " +
                "such as たべる and のむ, and is always written を.",
              register: "Neutral",
              exampleSentence: "ごはんを たべます。",
              exampleReading: "ごはんを たべます。",
              exampleTranslation: "I eat a meal.",
              relatedSlugs: ["は"],
            },
          ],
          kanji: [
            {
              character: "食",
              meaning: "eat, food",
              onyomi: ["ショク", "ジキ"],
              kunyomi: ["くう", "たべる"],
              strokeCount: 9,
            },
            {
              character: "水",
              meaning: "water",
              onyomi: ["スイ"],
              kunyomi: ["みず"],
              strokeCount: 4,
            },
          ],
          exercises: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "「みずを ____。」 — which verb is correct?",
              explanation:
                "水 means water, and you drink water, so the verb is のむ.",
              difficulty: 1,
              options: [
                { label: "のみます", isCorrect: true },
                { label: "たべます", isCorrect: false },
                { label: "よみます", isCorrect: false },
                { label: "かきます", isCorrect: false },
              ],
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "「ごはんを ____。」 — which verb is correct?",
              explanation: "ごはん is a meal, so you eat it with たべる.",
              difficulty: 1,
              options: [
                { label: "たべます", isCorrect: true },
                { label: "のみます", isCorrect: false },
                { label: "たのみます", isCorrect: false },
                { label: "はなします", isCorrect: false },
              ],
            },
            {
              type: "TRUE_FALSE",
              prompt: "「を」 and 「は」 both mark the direct object of a verb.",
              explanation:
                "を marks the direct object. は marks the topic of the sentence, " +
                "which is a different job.",
              difficulty: 2,
              options: [
                { label: "True", isCorrect: false },
                { label: "False", isCorrect: true },
              ],
            },
          ],
        },
      ],
    },
  ],
};