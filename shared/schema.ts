import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: ["admin", "teacher", "parent"] }).notNull().default("parent"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Classes table
export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  academicYear: varchar("academic_year").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Teachers table
export const teachers = pgTable("teachers", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fullName: varchar("full_name").notNull(),
  assignedClasses: jsonb("assigned_classes").$type<number[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

// Parents table
export const parents = pgTable("parents", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fullName: varchar("full_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Students table
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name").notNull(),
  classId: integer("class_id").references(() => classes.id),
  parentId: integer("parent_id").references(() => parents.id),
  grades: jsonb("grades").$type<Record<string, number[]>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  teacher: one(teachers, {
    fields: [users.id],
    references: [teachers.userId],
  }),
  parent: one(parents, {
    fields: [users.id],
    references: [parents.userId],
  }),
}));

export const teachersRelations = relations(teachers, ({ one }) => ({
  user: one(users, {
    fields: [teachers.userId],
    references: [users.id],
  }),
}));

export const parentsRelations = relations(parents, ({ one, many }) => ({
  user: one(users, {
    fields: [parents.userId],
    references: [users.id],
  }),
  children: many(students),
}));

export const studentsRelations = relations(students, ({ one }) => ({
  class: one(classes, {
    fields: [students.classId],
    references: [classes.id],
  }),
  parent: one(parents, {
    fields: [students.parentId],
    references: [parents.id],
  }),
}));

export const classesRelations = relations(classes, ({ many }) => ({
  students: many(students),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertTeacherSchema = createInsertSchema(teachers).omit({
  id: true,
  createdAt: true,
});

export const insertParentSchema = createInsertSchema(parents).omit({
  id: true,
  createdAt: true,
});

export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClassSchema = createInsertSchema(classes).omit({
  id: true,
  createdAt: true,
});

// Grade input schema
export const gradeInputSchema = z.object({
  studentId: z.number(),
  aspect: z.string().min(1),
  grades: z.array(z.number().min(1).max(6)).min(1).max(7),
});

// Radar chart configuration schema
export const radarChartConfigSchema = z.object({
  studentId: z.number(),
  aspects: z.array(z.string()).min(1),
  title: z.string().optional(),
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTeacher = z.infer<typeof insertTeacherSchema>;
export type Teacher = typeof teachers.$inferSelect;
export type InsertParent = z.infer<typeof insertParentSchema>;
export type Parent = typeof parents.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type Class = typeof classes.$inferSelect;
export type GradeInput = z.infer<typeof gradeInputSchema>;
export type RadarChartConfig = z.infer<typeof radarChartConfigSchema>;

// Assessment aspects (can be configured)
export const ASSESSMENT_ASPECTS = [
  "Language & Literacy - Reading Comprehension",
  "Language & Literacy - Vocabulary Development",
  "Language & Literacy - Writing Skills",
  "Language & Literacy - Listening Skills",
  "Mathematics - Number Recognition",
  "Mathematics - Counting Skills",
  "Mathematics - Basic Operations",
  "Mathematics - Pattern Recognition",
  "Mathematics - Geometry Basics",
  "Social Skills - Cooperation",
  "Social Skills - Communication",
  "Social Skills - Conflict Resolution",
  "Social Skills - Empathy",
  "Motor Skills - Fine Motor Control",
  "Motor Skills - Gross Motor Skills",
  "Motor Skills - Hand-Eye Coordination",
  "Creative Expression - Art & Drawing",
  "Creative Expression - Music & Rhythm",
  "Creative Expression - Dramatic Play",
  "Science & Discovery - Observation",
  "Science & Discovery - Experimentation",
  "Science & Discovery - Nature Awareness",
  "Self-Care - Independence",
  "Self-Care - Following Routines",
  "Self-Care - Personal Hygiene",
  "Emotional Development - Self-Regulation",
  "Emotional Development - Expression",
  "Emotional Development - Coping Skills",
  "Physical Development - Health Awareness",
  "Physical Development - Safety Rules",
  "Cognitive Development - Problem Solving",
  "Cognitive Development - Memory Skills",
  "Cognitive Development - Attention Span",
  "Cultural Awareness - Diversity Appreciation",
] as const;

export type AssessmentAspect = typeof ASSESSMENT_ASPECTS[number];
