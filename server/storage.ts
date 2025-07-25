import {
  users,
  teachers,
  parents,
  students,
  classes,
  reportTemplates,
  schools,
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
  type School,
  type InsertSchool,
  type GradeInput,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, sql } from "drizzle-orm";

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
  
  // SuperAdmin operations
  getAllSchools(): Promise<School[]>;
  createSchool(data: InsertSchool): Promise<School>;
  updateSchool(id: number, data: Partial<School>): Promise<School>;
  deleteSchool(id: number): Promise<void>;
  getAllUsersWithSchools(): Promise<(User & { school?: School })[]>;
  updateUserRoles(id: string, roles: string[], schoolId: number | null): Promise<User>;
  addUserRole(id: string, role: string): Promise<User>;
  removeUserRole(id: string, role: string): Promise<User>;
  getSystemStats(): Promise<{
    totalSchools: number;
    totalUsers: number;
    totalStudents: number;
    totalTeachers: number;
  }>;
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
    const [newTeacher] = await db.insert(teachers).values([teacher]).returning();
    return newTeacher;
  }

  async getTeachersByClass(classId: number): Promise<Teacher[]> {
    return await db
      .select()
      .from(teachers)
      .where(sql`${teachers.assignedClasses} @> ${JSON.stringify([classId])}`);
  }

  // Parent operations
  async getParent(userId: string): Promise<Parent | undefined> {
    const [parent] = await db.select().from(parents).where(eq(parents.userId, userId));
    return parent;
  }

  async createParent(parent: InsertParent): Promise<Parent> {
    const [newParent] = await db.insert(parents).values([parent]).returning();
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
    const [newStudent] = await db.insert(students).values([student]).returning();
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
    const [newTeacher] = await db.insert(teachers).values([data]).returning();
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
    const [newTemplate] = await db.insert(reportTemplates).values([data]).returning();
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

  // SuperAdmin operations
  async getAllSchools(): Promise<School[]> {
    return await db.select().from(schools);
  }

  async createSchool(data: InsertSchool): Promise<School> {
    const [newSchool] = await db.insert(schools).values([data]).returning();
    return newSchool;
  }

  async updateSchool(id: number, data: Partial<School>): Promise<School> {
    const [updatedSchool] = await db
      .update(schools)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schools.id, id))
      .returning();
    return updatedSchool;
  }

  async deleteSchool(id: number): Promise<void> {
    await db.delete(schools).where(eq(schools.id, id));
  }

  async getAllUsersWithSchools(): Promise<(User & { school?: School })[]> {
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        roles: users.roles,
        schoolId: users.schoolId,
        permissions: users.permissions,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        schoolName: schools.name,
      })
      .from(users)
      .leftJoin(schools, eq(users.schoolId, schools.id));

    return result.map(row => ({
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      profileImageUrl: row.profileImageUrl,
      roles: row.roles,
      schoolId: row.schoolId,
      permissions: row.permissions,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      school: row.schoolName ? { name: row.schoolName } as School : undefined,
    }));
  }

  async updateUserRoles(id: string, roles: string[], schoolId: number | null): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        roles, 
        schoolId,
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async addUserRole(id: string, role: string): Promise<User> {
    const user = await this.getUser(id);
    if (!user) throw new Error("User not found");
    
    const newRoles = user.roles.includes(role) ? user.roles : [...user.roles, role];
    return this.updateUserRoles(id, newRoles, user.schoolId);
  }

  async removeUserRole(id: string, role: string): Promise<User> {
    const user = await this.getUser(id);
    if (!user) throw new Error("User not found");
    
    const newRoles = user.roles.filter(r => r !== role);
    // Ensure user always has at least one role
    if (newRoles.length === 0) {
      newRoles.push("parent");
    }
    
    return this.updateUserRoles(id, newRoles, user.schoolId);
  }

  async getSystemStats(): Promise<{
    totalSchools: number;
    totalUsers: number;
    totalStudents: number;
    totalTeachers: number;
  }> {
    const [schoolsCount] = await db.select({ count: sql`count(*)` }).from(schools);
    const [usersCount] = await db.select({ count: sql`count(*)` }).from(users);
    const [studentsCount] = await db.select({ count: sql`count(*)` }).from(students);
    const [teachersCount] = await db.select({ count: sql`count(*)` }).from(teachers);

    return {
      totalSchools: Number(schoolsCount.count),
      totalUsers: Number(usersCount.count),
      totalStudents: Number(studentsCount.count),
      totalTeachers: Number(teachersCount.count),
    };
  }
}

export const storage = new DatabaseStorage();
