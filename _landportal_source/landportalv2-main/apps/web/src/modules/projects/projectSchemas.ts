import { z } from "zod";

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  location: z.string(),
  status: z.enum(["Active", "Draft", "Review", "Archived"]),
  updatedAt: z.string(),
  pointCount: z.number(),
  owner: z.string(),
  color: z.string(),
});

export const createProjectSchema = z.object({
  name: z.string().min(2, "Project name is required"),
  description: z.string().min(6, "Add a short description"),
  location: z.string().min(3, "Location is required"),
});

export type Project = z.infer<typeof projectSchema>;
export type CreateProjectValues = z.infer<typeof createProjectSchema>;
