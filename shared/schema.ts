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
  numeric,
  date,
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

// Schools table - multi-school support with real master data
export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),
  schoolCode: varchar("school_code").notNull().unique(), // Real school codes like K01, K02, etc.
  name: varchar("name").notNull(), // School names from master data
  program: varchar("program").notNull(), // Nasional, Bilingual, Entrepreneurship
  address: text("address"),
  phone: varchar("phone"),
  email: varchar("email"),
  principalName: varchar("principal_name"),
  establishedYear: integer("established_year"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User storage table (required for Replit Auth) - updated for multi-school
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  fullName: varchar("full_name"), // Custom editable full name
  profileImageUrl: varchar("profile_image_url"),
  roles: varchar("roles").array().default(["parent"]).notNull(), // Array of roles like ["admin", "teacher"]
  schoolId: integer("school_id").references(() => schools.id), // Primary school for backward compatibility
  permissions: jsonb("permissions").$type<string[]>().default([]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User-School assignments table - for multi-school support with academic year tracking
export const userSchoolAssignments = pgTable("user_school_assignments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  academicYear: varchar("academic_year").notNull().default("2025/2026"), // Format: 2025/2026
  rolesAtSchool: jsonb("roles_at_school").$type<string[]>().notNull().default([]), // ["admin", "teacher", "parent"]
  subjects: jsonb("subjects").$type<string[]>().default([]), // For teachers: subjects they teach
  assignedClasses: jsonb("assigned_classes").$type<number[]>().default([]), // For teachers: class IDs they're assigned to
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Ensure unique user-school-year combination (multiple roles per assignment)
  index("unique_user_school_year").on(table.userId, table.schoolId, table.academicYear),
]);

// Classes table - with school reference
export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  academicYear: varchar("academic_year").notNull(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  capacity: integer("capacity").default(25),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Student Groups table - groups within classes
export const studentGroups = pgTable("student_groups", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  classId: integer("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  teacherUserId: varchar("teacher_user_id").references(() => users.id, { onDelete: "set null" }), // Direct reference to users table
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  description: text("description"),
  maxStudents: integer("max_students").default(10),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Removed teachers and teacherAssignments tables - data migrated to users and userSchoolAssignments

// Parents table - with school reference
export const parents = pgTable("parents", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  fullName: varchar("full_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Students table - with school and group reference
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  nsp: varchar("nsp"), // NSP - varchar
  nis: varchar("nis"), // NIS - varchar
  noAbsence: integer("no_absence").default(0), // No Absence - int
  fullName: varchar("full_name").notNull(), // Fullname - varchar
  nickname: varchar("nickname"), // Nickname - varchar
  gender: varchar("gender"), // Gender - varchar
  schoolCode: varchar("school_code"), // School Code - varchar
  academicYear: varchar("academic_year").default("2024-2025"), // Academic Year - varchar
  classId: integer("class_id").references(() => classes.id), // Class - will be derived from classId
  groupId: integer("group_id").references(() => studentGroups.id, { onDelete: "set null" }), // Group - will be derived from groupId
  status: varchar("status").default("active"), // Status - varchar (active/inactive/graduated/transferred)
  
  // Attendance data
  sakit: integer("sakit").default(0),
  izin: integer("izin").default(0),
  alpa: integer("alpa").default(0),
  
  // Health data
  tinggiBadan: numeric("tinggi_badan").default("0"),
  beratBadan: numeric("berat_badan").default("0"),
  
  // Existing fields
  parentId: integer("parent_id").references(() => parents.id),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  grades: jsonb("grades").$type<Record<string, number[]>>().default({}),
  dateOfBirth: varchar("date_of_birth"),
  parentContact: varchar("parent_contact"),
  address: text("address"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Student narrations table - for storing teacher narrations per student
export const studentNarrations = pgTable("student_narrations", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  teacherId: varchar("teacher_id").notNull().references(() => users.id),
  academicYear: varchar("academic_year").notNull(),
  term: varchar("term").notNull(),
  label: varchar("label").notNull(), // Kemampuan Akademik, Sosial, etc.
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_student_narrations_student_year_term").on(table.studentId, table.academicYear, table.term),
]);

// Report templates table - with school reference
export const reportTemplates = pgTable("report_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description").notNull(),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  layout: varchar("layout", { enum: ["standard", "detailed", "compact", "portfolio"] }).notNull().default("standard"),
  includePhoto: boolean("include_photo").default(true),
  includeRadarChart: boolean("include_radar_chart").default(true),
  includeNarration: boolean("include_narration").default(true),
  includeDiscipline: boolean("include_discipline").default(true),
  includeGrowthReport: boolean("include_growth_report").default(true),
  includeTeacherSignature: boolean("include_teacher_signature").default(true),
  gradingPeriods: jsonb("grading_periods").$type<string[]>().default(["Term 1"]),
  headerContent: text("header_content"),
  footerContent: text("footer_content"),
  customFields: jsonb("custom_fields").$type<Array<{
    label: string;
    type: "text" | "number" | "date" | "textarea";
    required: boolean;
  }>>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const schoolsRelations = relations(schools, ({ many }) => ({
  users: many(users),
  parents: many(parents),
  students: many(students),
  classes: many(classes),
  studentGroups: many(studentGroups),
  reportTemplates: many(reportTemplates),
  userAssignments: many(userSchoolAssignments),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  school: one(schools, {
    fields: [users.schoolId],
    references: [schools.id],
  }),
  schoolAssignments: many(userSchoolAssignments),
  parent: one(parents, {
    fields: [users.id],
    references: [parents.userId],
  }),
  teachingGroups: many(studentGroups),
}));

export const userSchoolAssignmentsRelations = relations(userSchoolAssignments, ({ one }) => ({
  user: one(users, {
    fields: [userSchoolAssignments.userId],
    references: [users.id],
  }),
  school: one(schools, {
    fields: [userSchoolAssignments.schoolId],
    references: [schools.id],
  }),
}));

// teachersRelations is defined later with assignments

export const parentsRelations = relations(parents, ({ one, many }) => ({
  user: one(users, {
    fields: [parents.userId],
    references: [users.id],
  }),
  school: one(schools, {
    fields: [parents.schoolId],
    references: [schools.id],
  }),
  children: many(students),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  class: one(classes, {
    fields: [students.classId],
    references: [classes.id],
  }),
  group: one(studentGroups, {
    fields: [students.groupId],
    references: [studentGroups.id],
  }),
  parent: one(parents, {
    fields: [students.parentId],
    references: [parents.id],
  }),
  school: one(schools, {
    fields: [students.schoolId],
    references: [schools.id],
  }),
  narrations: many(studentNarrations),
}));

export const studentNarrationsRelations = relations(studentNarrations, ({ one }) => ({
  student: one(students, {
    fields: [studentNarrations.studentId],
    references: [students.id],
  }),
  teacher: one(users, {
    fields: [studentNarrations.teacherId],
    references: [users.id],
  }),
}));

export const classesRelations = relations(classes, ({ many, one }) => ({
  students: many(students),
  groups: many(studentGroups),
  school: one(schools, {
    fields: [classes.schoolId],
    references: [schools.id],
  }),
}));

export const studentGroupsRelations = relations(studentGroups, ({ one, many }) => ({
  class: one(classes, {
    fields: [studentGroups.classId],
    references: [classes.id],
  }),
  teacher: one(users, {
    fields: [studentGroups.teacherUserId],
    references: [users.id],
  }),
  school: one(schools, {
    fields: [studentGroups.schoolId],
    references: [schools.id],
  }),
  students: many(students),
}));

// Removed teachersRelations and teacherAssignmentsRelations - tables no longer exist

export const reportTemplatesRelations = relations(reportTemplates, ({ one }) => ({
  school: one(schools, {
    fields: [reportTemplates.schoolId],
    references: [schools.id],
  }),
}));

// Zod schemas
export const insertSchoolSchema = createInsertSchema(schools).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
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
  updatedAt: true,
});

export const insertStudentGroupSchema = createInsertSchema(studentGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReportTemplateSchema = createInsertSchema(reportTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchoolAssignmentSchema = createInsertSchema(userSchoolAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type School = typeof schools.$inferSelect;
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
// Teacher type now uses User since teachers are users with teacher role
export type Teacher = typeof users.$inferSelect;
export type InsertParent = z.infer<typeof insertParentSchema>;
export type Parent = typeof parents.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type Class = typeof classes.$inferSelect;
export type InsertStudentGroup = z.infer<typeof insertStudentGroupSchema>;
export type StudentGroup = typeof studentGroups.$inferSelect;
export type InsertReportTemplate = z.infer<typeof insertReportTemplateSchema>;
export type ReportTemplate = typeof reportTemplates.$inferSelect;
// Removed TeacherAssignment types - table no longer exists
export type InsertUserSchoolAssignment = z.infer<typeof insertUserSchoolAssignmentSchema>;
export type UserSchoolAssignment = typeof userSchoolAssignments.$inferSelect;
export type GradeInput = z.infer<typeof gradeInputSchema>;
export type RadarChartConfig = z.infer<typeof radarChartConfigSchema>;
export type StudentNarration = typeof studentNarrations.$inferSelect;
export type InsertStudentNarration = typeof studentNarrations.$inferInsert;

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

// Helper functions for multi-role management
export function hasRole(user: User, role: string): boolean {
  return user.roles.includes(role);
}

export function hasAnyRole(user: User, roles: string[]): boolean {
  return roles.some(role => user.roles.includes(role));
}

export function addRole(user: User, role: string): string[] {
  if (!user.roles.includes(role)) {
    return [...user.roles, role];
  }
  return user.roles;
}

export function removeRole(user: User, role: string): string[] {
  return user.roles.filter(r => r !== role);
}
