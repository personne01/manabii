import { z } from "zod";

import { JLPTLevel } from "@/app/generated/prisma/client";

export const grammarSchema = z.object({
  pattern: z.string().trim().min(1, "Pattern is required").max(120),
  reading: z.string().trim().max(120).optional().or(z.literal("")),
  meaning: z.string().trim().min(1, "Meaning is required").max(255),
  formation: z.string().trim().min(1, "Formation is required").max(255),
  explanation: z.string().trim().max(5000).optional().or(z.literal("")),
  register: z.string().trim().min(1, "Register is required").max(60),
  exampleSentence: z.string().trim().min(1, "Example sentence is required").max(5000),
  exampleReading: z.string().trim().max(400).optional().or(z.literal("")),
  exampleTranslation: z.string().trim().min(1, "Example translation is required").max(5000),
  relatedSlugs: z
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
    .pipe(z.array(z.string().max(80)).max(20)),
  jlpt: z.nativeEnum(JLPTLevel),
});

export type GrammarFormValues = z.infer<typeof grammarSchema>;
