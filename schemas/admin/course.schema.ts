import { z } from "zod";

export const courseSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and dashes"),
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  level: z.enum(["N5", "N4", "N3", "N2", "N1"]),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  order: z.coerce.number().int().min(0),
});

export type CourseFormValues = z.infer<typeof courseSchema>;
