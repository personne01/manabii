import { z } from "zod";

import { JLPTLevel } from "@/app/generated/prisma/client";

export const vocabularySchema = z.object({
  term: z.string().trim().min(1, "Term is required").max(120),
  reading: z.string().trim().min(1, "Reading is required").max(120),
  meaning: z.string().trim().min(1, "Meaning is required").max(255),
  partOfSpeech: z.string().trim().min(1, "Part of speech is required").max(60),
  jlpt: z.nativeEnum(JLPTLevel),
  exampleSentence: z.string().trim().max(5000).optional().or(z.literal("")),
  exampleReading: z.string().trim().max(400).optional().or(z.literal("")),
  exampleTranslation: z.string().trim().max(5000).optional().or(z.literal("")),
  tags: z
    .string()
    .trim()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t.length > 0)
        : [],
    )
    .pipe(z.array(z.string().max(40)).max(20)),
});

export type VocabularyFormValues = z.infer<typeof vocabularySchema>;
