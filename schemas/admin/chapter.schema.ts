import { z } from "zod";

export const chapterSchema = z.object({
  courseId: z.string().uuid("Course is required"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and dashes"),
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  order: z.coerce.number().int().min(0),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
});

export type ChapterFormValues = z.infer<typeof chapterSchema>;
