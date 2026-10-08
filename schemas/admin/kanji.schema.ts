import { z } from "zod";

import { JLPTLevel } from "@/app/generated/prisma/client";

export const kanjiSchema = z.object({
  character: z.string().trim().min(1, "Character is required").max(4),
  onyomi: z
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
    .pipe(z.array(z.string().max(60)).max(20)),
  kunyomi: z
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
    .pipe(z.array(z.string().max(60)).max(20)),
  meanings: z
    .string()
    .trim()
    .min(1, "Meaning is required")
    .transform((v) =>
      v
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
    )
    .pipe(z.array(z.string().max(80)).min(1)),
  strokeCount: z.coerce.number().int().min(1).max(50).optional().or(z.literal("")).nullable(),
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

export type KanjiFormValues = z.infer<typeof kanjiSchema>;
