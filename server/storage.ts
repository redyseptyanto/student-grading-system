import {
  users,
  teachers,
  parents,
  students,
  classes,
  reportTemplates,
  type User,
  type UpsertUser,
  type Teacher,
  type InsertTeacher,
  type Parent,
  type InsertParent,
  type Student,
  type InsertStudent,
  type Class,
  type InsertClass,
  type ReportTemplate,
  type InsertReportTemplate,
  type GradeInput,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Teacher operations
  getTeacher(userId: string): Promise<Teacher | undefined>;
  createTeacher(teacher: InsertTeacher): Promise<Teacher>;
  getTeachersByClass(classId: number): Promise<Teacher[]>;
  
  // Parent operations
  getParent(userId: string): Promise<Parent | undefined>;
  createParent(parent: InsertParent): Promise<Parent>;
  
  // Student operations
  getStudent(id: number): Promise<Student | undefined>;
  getStudents(): Promise<Student[]>;
  getStudentsByClass(classId: number): Promise<Student[]>;
  getStudentsByParent(parentId: number): Promise<Student[]>;
  getStudentsByTeacher(teacherId: number): Promise<Student[]>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudentGrades(studentId: number, aspect: string, grades: number[]): Promise<Student>;
  
  // Class operations
  getClass(id: number): Promise<Class | undefined>;
  getClasses(): Promise<Class[]>;
  createClass(classData: InsertClass): Promise<Class>;
  
  // Admin operations
  getStudentsWithDetails(): Promise<Student[]>;
  updateStudentAdmin(id: number, data: Partial<Student>): Promise<Student>;
  updateStudentStatus(id: number, isActive: boolean): Promise<Student>;
  deleteStudent(id: number): Promise<void>;
  getTeachers(): Promise<Teacher[]>;
  getTeachersWithDetails(): Promise<Teacher[]>;
  createTeacherAdmin(data: any): Promise<Teacher>;
  updateTeacherAdmin(id: number, data: Partial<Teacher>): Promise<Teacher>;
  deleteTeacherAdmin(id: number): Promise<void>;
  getAllReportTemplates(): Promise<ReportTemplate[]>;
  createReportTemplate(data: InsertReportTemplate): Promise<ReportTemplate>;
  updateReportTemplate(id: number, data: Partial<ReportTemplate>): Promise<ReportTemplate>;
  deleteReportTemplate(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Teacher operations
  async getTeacher(userId: string): Promise<Teacher | undefined> {
    const [teacher] = await db.select().from(teachers).where(eq(teachers.userId, userId));
    return teacher;
  }

  async createTeacher(teacher: InsertTeacher): Promise<Teacher> {
    const [newTeacher] = await db.insert(teachers).values(teacher).returning();
    return newTeacher;
  }

  async getTeachersByClass(classId: number): Promise<Teacher[]> {
    return await db
      .select()
      .from(teachers)
      .where(eq(teachers.assignedClasses, [classId]));
  }

  // Parent operations
  async getParent(userId: string): Promise<Parent | undefined> {
    const [parent] = await db.select().from(parents).where(eq(parents.userId, userId));
    return parent;
  }

  async createParent(parent: InsertParent): Promise<Parent> {
    const [newParent] = await db.insert(parents).values(parent).returning();
    return newParent;
  }

  // Student operations
  async getStudent(id: number): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student;
  }

  async getStudents(): Promise<Student[]> {
    return await db.select().from(students);
  }

  async getStudentsByClass(classId: number): Promise<Student[]> {
    return await db.select().from(students).where(eq(students.classId, classId));
  }

  async getStudentsByParent(parentId: number): Promise<Student[]> {
    return await db.select().from(students).where(eq(students.parentId, parentId));
  }

  async getStudentsByTeacher(teacherId: number): Promise<Student[]> {
    const teacher = await db.select().from(teachers).where(eq(teachers.id, teacherId));
    if (!teacher[0] || !teacher[0].assignedClasses.length) {
      return [];
    }
    
    return await db
      .select()
      .from(students)
      .where(inArray(students.classId, teacher[0].assignedClasses));
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const [newStudent] = await db.insert(students).values(student).returning();
    return newStudent;
  }

  async updateStudentGrades(studentId: number, aspect: string, grades: number[]): Promise<Student> {
    const student = await this.getStudent(studentId);
    if (!student) {
      throw new Error("Student not found");
    }

    const updatedGrades = {
      ...student.grades,
      [aspect]: grades,
    };

    const [updatedStudent] = await db
      .update(students)
      .set({
        grades: updatedGrades,
        updatedAt: new Date(),
      })
      .where(eq(students.id, studentId))
      .returning();

    return updatedStudent;
  }

  // Class operations
  async getClass(id: number): Promise<Class | undefined> {
    const [classData] = await db.select().from(classes).where(eq(classes.id, id));
    return classData;
  }

  async getClasses(): Promise<Class[]> {
    return await db.select().from(classes);
  }

  async createClass(classData: InsertClass): Promise<Class> {
    const [newClass] = await db.insert(classes).values(classData).returning();
    return newClass;
  }

  // Admin operations
  async getStudentsWithDetails(): Promise<Student[]> {
    return await db.select().from(students);
  }

  async updateStudentAdmin(id: number, data: Partial<Student>): Promise<Student> {
    const [updatedStudent] = await db
      .update(students)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(students.id, id))
      .returning();
    return updatedStudent;
  }

  async updateStudentStatus(id: number, isActive: boolean): Promise<Student> {
    const [updatedStudent] = await db
      .update(students)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(students.id, id))
      .returning();
    return updatedStudent;
  }

  async deleteStudent(id: number): Promise<void> {
    await db.delete(students).where(eq(students.id, id));
  }

  async getTeachers(): Promise<Teacher[]> {
    return await db.select().from(teachers);
  }

  async getTeachersWithDetails(): Promise<Teacher[]> {
    return await db.select().from(teachers);
  }

  async createTeacherAdmin(data: any): Promise<Teacher> {
    const [newTeacher] = await db.insert(teachers).values(data).returning();
    return newTeacher;
  }

  async updateTeacherAdmin(id: number, data: Partial<Teacher>): Promise<Teacher> {
    const [updatedTeacher] = await db
      .update(teachers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(teachers.id, id))
      .returning();
    return updatedTeacher;
  }

  async deleteTeacherAdmin(id: number): Promise<void> {
    await db.delete(teachers).where(eq(teachers.id, id));
  }

  async getAllReportTemplates(): Promise<ReportTemplate[]> {
    return await db.select().from(reportTemplates);
  }

  async createReportTemplate(data: InsertReportTemplate): Promise<ReportTemplate> {
    const [newTemplate] = await db.insert(reportTemplates).values(data).returning();
    return newTemplate;
  }

  async updateReportTemplate(id: number, data: Partial<ReportTemplate>): Promise<ReportTemplate> {
    const [updatedTemplate] = await db
      .update(reportTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(reportTemplates.id, id))
      .returning();
    return updatedTemplate;
  }

  async deleteReportTemplate(id: number): Promise<void> {
    await db.delete(reportTemplates).where(eq(reportTemplates.id, id));
  }
}

export const storage = new DatabaseStorage();
