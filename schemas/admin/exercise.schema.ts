import { z } from "zod";
import { ExerciseType, JLPTLevel } from "@/app/generated/prisma/client";

export const exerciseSchema = z.object({
  lessonId: z.string().uuid("Lesson is required"),
  type: z.nativeEnum(ExerciseType),
  prompt: z.string().trim().min(1, "Question is required"),
  explanation: z
    .string()
    .trim()
    .max(10000)
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v))
    .nullable(),
  difficulty: z.coerce.number().int().min(1).max(5).default(1),
  order: z.coerce.number().int().min(0),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
});

export type ExerciseFormValues = z.infer<typeof exerciseSchema>;
