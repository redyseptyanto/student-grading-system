import {
  users,
  parents,
  students,
  studentEnrollments,
  studentGrades,
  classes,
  studentGroups,
  reportTemplates,
  schools,
  userSchoolAssignments,
  studentNarrations,
  groupTeacherAssignments,
  type User,
  type UpsertUser,
  type Parent,
  type InsertParent,
  type Student,
  type InsertStudent,
  type StudentEnrollment,
  type InsertStudentEnrollment,
  type StudentGrade,
  type InsertStudentGrade,
  type Class,
  type InsertClass,
  type StudentGroup,
  type InsertStudentGroup,
  type ReportTemplate,
  type InsertReportTemplate,
  type School,
  type InsertSchool,
  type UserSchoolAssignment,
  type InsertUserSchoolAssignment,
  type GradeInput,
  type StudentNarration,
  type InsertStudentNarration,
  type GroupTeacherAssignment,
  type InsertGroupTeacherAssignment,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserSchoolAssignments(userId: string): Promise<UserSchoolAssignment[]>;
  getUserEffectiveSchool(userId: string): Promise<School | undefined>;

  // Teacher operations (now user-based)
  getTeachersBySchool(schoolId: number): Promise<User[]>;
  getTeachersInSchoolByYear(schoolId: number, academicYear: string): Promise<User[]>;
  getTeachersByClass(classId: number): Promise<User[]>;
  getTeachersWithDetails(): Promise<any[]>;
  assignTeacherToGroups(teacherUserId: string, groupIds: number[], schoolId: number, academicYear: string): Promise<void>;
  getGroupTeacherAssignments(groupId: number): Promise<GroupTeacherAssignment[]>;
  getTeacherGroupAssignments(teacherUserId: string, academicYear: string): Promise<GroupTeacherAssignment[]>;
  removeTeacherFromGroup(teacherUserId: string, groupId: number): Promise<void>;

  // Parent operations
  getParent(userId: string): Promise<Parent | undefined>;
  createParent(parent: InsertParent): Promise<Parent>;

  // Student operations
  getStudent(id: number): Promise<Student | undefined>;
  getStudents(): Promise<Student[]>;
  getStudentsBySchool(schoolId: number): Promise<Student[]>;
  getStudentsByClass(classId: number): Promise<Student[]>;
  getStudentsByParent(parentId: number): Promise<Student[]>;
  getStudentsByTeacher(teacherUserId: string): Promise<Student[]>;
  createStudent(student: InsertStudent): Promise<Student>;
  createStudentsBulk(studentsData: InsertStudent[]): Promise<Student[]>;
  updateStudentGrades(studentId: number, aspect: string, grades: number[]): Promise<Student>;

  // Class operations
  getClass(id: number): Promise<Class | undefined>;
  getClasses(): Promise<Class[]>;
  getClassesBySchool(schoolId: number): Promise<Class[]>;
  createClass(classData: InsertClass): Promise<Class>;
  updateClass(id: number, data: Partial<Class>): Promise<Class>;
  deleteClass(id: number): Promise<void>;

  // Student Group operations
  getStudentGroup(id: number): Promise<StudentGroup | undefined>;
  getStudentGroups(): Promise<StudentGroup[]>;
  getStudentGroupsByClass(classId: number): Promise<StudentGroup[]>;
  createStudentGroup(groupData: InsertStudentGroup): Promise<StudentGroup>;
  updateStudentGroup(id: number, data: Partial<StudentGroup>): Promise<StudentGroup>;
  deleteStudentGroup(id: number): Promise<void>;
  assignStudentToGroup(studentId: number, groupId: number | null): Promise<Student>;

  // Admin operations
  getStudentsWithDetails(): Promise<Student[]>;
  updateStudentAdmin(id: number, data: Partial<Student>): Promise<Student>;
  updateStudentStatus(id: number, isActive: boolean): Promise<Student>;
  deleteStudent(id: number): Promise<void>;
  // Teacher admin operations are now handled through user management
  // createUser, updateUser, assignUserToSchools methods handle teacher operations
  getAllReportTemplates(): Promise<ReportTemplate[]>;
  createReportTemplate(data: InsertReportTemplate): Promise<ReportTemplate>;
  updateReportTemplate(id: number, data: Partial<ReportTemplate>): Promise<ReportTemplate>;
  deleteReportTemplate(id: number): Promise<void>;

  // School operations
  getSchools(): Promise<School[]>;

  // SuperAdmin operations
  getAllSchools(): Promise<School[]>;
  createSchool(data: InsertSchool): Promise<School>;
  updateSchool(id: number, data: Partial<School>): Promise<School>;
  deleteSchool(id: number): Promise<void>;
  getAllUsersWithSchools(): Promise<(User & { school?: School; assignedSchools?: Array<{ schoolId: number; schoolName: string; role: string }> })[]>;
  updateUserRoles(id: string, roles: string[], schoolId: number | null): Promise<User>;
  addUserRole(id: string, role: string): Promise<User>;
  removeUserRole(id: string, role: string): Promise<User>;
  assignUserToSchools(userId: string, schoolAssignments: Array<{ schoolId: number; roles: string[] }>): Promise<void>;
  updateUserSchoolRoles(userId: string, schoolId: number, roles: string[]): Promise<UserSchoolAssignment>;
  getSystemStats(): Promise<{
    totalSchools: number;
    totalUsers: number;
    totalStudents: number;
    totalTeachers: number;
  }>;

  // Teacher input system methods
  updateStudentAttendanceBatch(attendanceData: Record<number, any>): Promise<any[]>;
  saveStudentNarration(narrationData: any): Promise<any>;
  updateStudentGradesBatch(aspect: string, gradeData: Record<number, string>): Promise<any[]>;
  userHasGlobalAccess(userId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Get user's effective school (from multi-school assignments or primary school)
  async getUserEffectiveSchool(userId: string): Promise<School | undefined> {
    // Check if user is SuperAdmin first
    const user = await this.getUser(userId);
    if (user?.roles.includes('superadmin')) {
      // SuperAdmins don't have a single effective school - they access all schools
      return undefined;
    }

    // First check if user has multi-school assignments
    const [schoolAssignment] = await db
      .select({
        schoolId: userSchoolAssignments.schoolId,
        schoolName: schools.name,
        schoolCode: schools.schoolCode,
        address: schools.address,
        phone: schools.phone,
        email: schools.email,
        principalName: schools.principalName,
        establishedYear: schools.establishedYear,
        isActive: schools.isActive,
        createdAt: schools.createdAt,
        updatedAt: schools.updatedAt,
      })
      .from(userSchoolAssignments)
      .leftJoin(schools, eq(userSchoolAssignments.schoolId, schools.id))
      .where(and(
        eq(userSchoolAssignments.userId, userId),
        eq(userSchoolAssignments.isActive, true)
      ))
      .limit(1);

    if (schoolAssignment) {
      return {
        id: schoolAssignment.schoolId,
        name: schoolAssignment.schoolName || '',
        schoolCode: schoolAssignment.schoolCode || '',
        address: schoolAssignment.address || '',
        phone: schoolAssignment.phone || '',
        email: schoolAssignment.email || '',
        principalName: schoolAssignment.principalName || '',
        establishedYear: schoolAssignment.establishedYear || null,
        isActive: schoolAssignment.isActive || true,
        createdAt: schoolAssignment.createdAt || new Date(),
        updatedAt: schoolAssignment.updatedAt || new Date(),
      };
    }

    // Fallback to user's primary school
    const fallbackUser = await this.getUser(userId);
    if (fallbackUser?.schoolId) {
      const [school] = await db.select().from(schools).where(eq(schools.id, fallbackUser.schoolId));
      return school;
    }

    return undefined;
  }

  // Helper method to check if user should have global access
  async userHasGlobalAccess(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    return user?.roles.includes('superadmin') || false;
  }

  // Teacher operations
  // Teacher operations now based on users with teacher role via userSchoolAssignments
  async getTeachersBySchool(schoolId: number): Promise<any[]> {
    const teacherUsers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        fullName: users.fullName,
        profileImageUrl: users.profileImageUrl,
        roles: users.roles,
        isActive: users.isActive,
        schoolId: users.schoolId,
        permissions: users.permissions,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        // Include school assignment data
        schoolName: schools.name,
        academicYear: userSchoolAssignments.academicYear,
        subjects: userSchoolAssignments.subjects,
        assignedClasses: userSchoolAssignments.assignedClasses,
        rolesAtSchool: userSchoolAssignments.rolesAtSchool,
      })
      .from(users)
      .innerJoin(userSchoolAssignments, eq(users.id, userSchoolAssignments.userId))
      .innerJoin(schools, eq(userSchoolAssignments.schoolId, schools.id))
      .where(
        and(
          eq(userSchoolAssignments.schoolId, schoolId),
          sql`${userSchoolAssignments.rolesAtSchool} ? 'teacher'`,
          eq(userSchoolAssignments.isActive, true),
          eq(users.isActive, true)
        )
      );

    console.log('getTeachersBySchool result for school', schoolId, ':', teacherUsers);
    return teacherUsers;
  }

  async getTeachersInSchoolByYear(schoolId: number, academicYear: string): Promise<User[]> {
    const teacherUsers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        fullName: users.fullName,
        profileImageUrl: users.profileImageUrl,
        roles: users.roles,
        isActive: users.isActive,
        schoolId: users.schoolId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .innerJoin(userSchoolAssignments, eq(users.id, userSchoolAssignments.userId))
      .where(
        and(
          eq(userSchoolAssignments.schoolId, schoolId),
          eq(userSchoolAssignments.academicYear, academicYear),  
          sql`${userSchoolAssignments.rolesAtSchool} ? 'teacher'`,
          eq(userSchoolAssignments.isActive, true),
          eq(users.isActive, true)
        )
      );

    return teacherUsers;
  }

  async getTeachersByClass(classId: number): Promise<User[]> {
    // Get teachers through userSchoolAssignments that include this class
    return await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        fullName: users.fullName,
        profileImageUrl: users.profileImageUrl,
        roles: users.roles,
        isActive: users.isActive,
        schoolId: users.schoolId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .innerJoin(userSchoolAssignments, eq(users.id, userSchoolAssignments.userId))
      .where(
        and(
          sql`${userSchoolAssignments.rolesAtSchool} ? 'teacher'`,
          sql`${userSchoolAssignments.assignedClasses} @> ${JSON.stringify([classId])}`,
          eq(userSchoolAssignments.isActive, true),
          eq(users.isActive, true)
        )
      );
  }

  async getTeacherAssignedSchools(userId: string): Promise<School[]> {
    // Get schools where the teacher is assigned
    console.log('getTeacherAssignedSchools called for userId:', userId);
    const schoolsData = await db
      .select({
        id: schools.id,
        name: schools.name,
        address: schools.address,
        email: schools.email,
        schoolCode: schools.schoolCode,
        program: schools.program,
        phone: schools.phone,
        principalName: schools.principalName,
        establishedYear: schools.establishedYear,
        isActive: schools.isActive,
        createdAt: schools.createdAt,
        updatedAt: schools.updatedAt,
      })
      .from(schools)
      .innerJoin(userSchoolAssignments, eq(schools.id, userSchoolAssignments.schoolId))
      .where(
        and(
          eq(userSchoolAssignments.userId, userId),
          sql`${userSchoolAssignments.rolesAtSchool} ? 'teacher'`,
          eq(userSchoolAssignments.isActive, true),
          eq(schools.isActive, true)
        )
      )
      .orderBy(schools.name);

    console.log('getTeacherAssignedSchools result for userId', userId, ':', schoolsData);
    return schoolsData;
  }

  async getTeacherAssignedClasses(userId: string, academicYear: string): Promise<Class[]> {
    // Get classes that the teacher is assigned to
    const assignments = await db
      .select({ 
        assignedClasses: userSchoolAssignments.assignedClasses,
        schoolId: userSchoolAssignments.schoolId 
      })
      .from(userSchoolAssignments)
      .where(
        and(
          eq(userSchoolAssignments.userId, userId),
          eq(userSchoolAssignments.academicYear, academicYear),
          sql`${userSchoolAssignments.rolesAtSchool} ? 'teacher'`,
          eq(userSchoolAssignments.isActive, true)
        )
      );

    if (assignments.length === 0) {
      return [];
    }

    // Collect all assigned class IDs from all assignments
    const allClassIds: number[] = [];
    for (const assignment of assignments) {
      if (assignment.assignedClasses && Array.isArray(assignment.assignedClasses)) {
        allClassIds.push(...assignment.assignedClasses);
      }
    }

    if (allClassIds.length === 0) {
      return [];
    }

    // Get the actual class data
    const classesData = await db
      .select()
      .from(classes)
      .where(
        and(
          inArray(classes.id, allClassIds),
          eq(classes.academicYear, academicYear),
          eq(classes.isActive, true)
        )
      )
      .orderBy(classes.name);

    return classesData;
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

  async getStudentsBySchool(schoolId: number): Promise<Student[]> {
    return await db.select().from(students).where(eq(students.schoolId, schoolId));
  }

  async getStudentsByClass(classId: number): Promise<Student[]> {
    // Get students through enrollments
    const result = await db
      .select({
        id: students.id,
        nsp: students.nsp,
        nis: students.nis,
        fullName: students.fullName,
        nickname: students.nickname,
        gender: students.gender,
        dateOfBirth: students.dateOfBirth,
        parentContact: students.parentContact,
        address: students.address,
        schoolId: students.schoolId,
        parentId: students.parentId,
        isActive: students.isActive,
        createdAt: students.createdAt,
        updatedAt: students.updatedAt,
      })
      .from(students)
      .innerJoin(studentEnrollments, eq(students.id, studentEnrollments.studentId))
      .where(and(
        eq(studentEnrollments.classId, classId),
        eq(students.isActive, true),
        eq(studentEnrollments.isActive, true)
      ));
    
    return result;
  }

  async getStudentsByParent(parentId: number): Promise<Student[]> {
    return await db.select().from(students).where(eq(students.parentId, parentId));
  }

  async getStudentsByTeacher(teacherUserId: string): Promise<Student[]> {
    // Get students through classes assigned to teacher in userSchoolAssignments
    const assignments = await db
      .select({ assignedClasses: userSchoolAssignments.assignedClasses })
      .from(userSchoolAssignments)
      .where(
        and(
          eq(userSchoolAssignments.userId, teacherUserId),
          sql`${userSchoolAssignments.rolesAtSchool} ? 'teacher'`,
          eq(userSchoolAssignments.isActive, true)
        )
      );

    if (!assignments[0] || !assignments[0].assignedClasses || assignments[0].assignedClasses.length === 0) {
      return [];
    }

    const result = await db
      .select({
        id: students.id,
        nsp: students.nsp,
        nis: students.nis,
        fullName: students.fullName,
        nickname: students.nickname,
        gender: students.gender,
        dateOfBirth: students.dateOfBirth,
        parentContact: students.parentContact,
        address: students.address,
        schoolId: students.schoolId,
        parentId: students.parentId,
        isActive: students.isActive,
        createdAt: students.createdAt,
        updatedAt: students.updatedAt,
      })
      .from(students)
      .innerJoin(studentEnrollments, eq(students.id, studentEnrollments.studentId))
      .where(
        and(
          inArray(studentEnrollments.classId, assignments[0].assignedClasses),
          eq(students.isActive, true),
          eq(studentEnrollments.isActive, true)
        )
      );
    
    return result;
  }

  async getStudentsByClassWithDetails(classId: number, academicYear: string, schoolId: number): Promise<any[]> {
    const result = await db
      .select({
        // Student profile data
        id: students.id,
        nsp: students.nsp,
        nis: students.nis,
        fullName: students.fullName,
        nickname: students.nickname,
        gender: students.gender,
        dateOfBirth: students.dateOfBirth,
        parentContact: students.parentContact,
        address: students.address,
        parentId: students.parentId,
        schoolId: students.schoolId,
        isActive: students.isActive,
        createdAt: students.createdAt,
        updatedAt: students.updatedAt,
        
        // Enrollment data for this academic year
        enrollmentId: studentEnrollments.id,
        academicYear: studentEnrollments.academicYear,
        classId: studentEnrollments.classId,
        groupId: studentEnrollments.groupId,
        schoolCode: studentEnrollments.schoolCode,
        status: studentEnrollments.status,
        noAbsence: studentEnrollments.noAbsence,
        sakit: studentEnrollments.sakit,
        izin: studentEnrollments.izin,
        alpa: studentEnrollments.alpa,
        tinggiBadan: studentEnrollments.tinggiBadan,
        beratBadan: studentEnrollments.beratBadan,
        
        // Class and group names
        className: classes.name,
        groupName: studentGroups.name,
      })
      .from(students)
      .innerJoin(studentEnrollments, eq(students.id, studentEnrollments.studentId))
      .leftJoin(classes, eq(studentEnrollments.classId, classes.id))
      .leftJoin(studentGroups, eq(studentEnrollments.groupId, studentGroups.id))
      .where(and(
        eq(studentEnrollments.classId, classId),
        eq(studentEnrollments.academicYear, academicYear),
        eq(studentEnrollments.schoolId, schoolId),
        eq(students.isActive, true),
        eq(studentEnrollments.isActive, true)
      ))
      .orderBy(students.fullName);
    
    return result;
  }

  async getStudentsByTeacherGroups(teacherUserId: string, classId: number, academicYear: string, schoolId: number): Promise<any[]> {
    // Get students based on group assignments for the specific teacher
    console.log('getStudentsByTeacherGroups called with:', { teacherUserId, classId, academicYear, schoolId });
    
    const result = await db
      .select({
        // Student profile data
        id: students.id,
        nsp: students.nsp,
        nis: students.nis,
        fullName: students.fullName,
        nickname: students.nickname,
        gender: students.gender,
        dateOfBirth: students.dateOfBirth,
        parentContact: students.parentContact,
        address: students.address,
        parentId: students.parentId,
        schoolId: students.schoolId,
        isActive: students.isActive,
        createdAt: students.createdAt,
        updatedAt: students.updatedAt,
        
        // Enrollment data for this academic year
        enrollmentId: studentEnrollments.id,
        academicYear: studentEnrollments.academicYear,
        classId: studentEnrollments.classId,
        groupId: studentEnrollments.groupId,
        schoolCode: studentEnrollments.schoolCode,
        status: studentEnrollments.status,
        noAbsence: studentEnrollments.noAbsence,
        sakit: studentEnrollments.sakit,
        izin: studentEnrollments.izin,
        alpa: studentEnrollments.alpa,
        tinggiBadan: studentEnrollments.tinggiBadan,
        beratBadan: studentEnrollments.beratBadan,
        
        // Class and group names
        className: classes.name,
        groupName: studentGroups.name,
      })
      .from(students)
      .innerJoin(studentEnrollments, eq(students.id, studentEnrollments.studentId))
      .leftJoin(classes, eq(studentEnrollments.classId, classes.id))
      .leftJoin(studentGroups, eq(studentEnrollments.groupId, studentGroups.id))
      .innerJoin(groupTeacherAssignments, eq(studentEnrollments.groupId, groupTeacherAssignments.groupId))
      .where(and(
        eq(groupTeacherAssignments.teacherUserId, teacherUserId),
        eq(studentEnrollments.classId, classId),
        eq(studentEnrollments.academicYear, academicYear),
        eq(studentEnrollments.schoolId, schoolId),
        eq(students.isActive, true),
        eq(studentEnrollments.isActive, true),
        eq(groupTeacherAssignments.academicYear, academicYear)
      ))
      .orderBy(students.fullName);
    
    return result;
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const [newStudent] = await db.insert(students).values(student).returning();
    return newStudent;
  }

  async createStudentsBulk(studentsData: InsertStudent[]): Promise<Student[]> {
    const newStudents = await db.insert(students).values(studentsData).returning();
    return newStudents;
  }

  async updateStudentGrades(studentId: number, aspect: string, grades: number[], academicYear: string, term: string, teacherId: string): Promise<StudentGrade> {
    // First, find the student's enrollment for this academic year
    const [enrollment] = await db
      .select()
      .from(studentEnrollments)
      .where(and(
        eq(studentEnrollments.studentId, studentId),
        eq(studentEnrollments.academicYear, academicYear)
      ));

    if (!enrollment) {
      throw new Error(`Student enrollment not found for academic year ${academicYear}`);
    }

    // Calculate final grade (mode with max fallback)
    const finalGrade = this.calculateFinalGrade(grades);

    // Upsert the grade record
    const [gradeRecord] = await db
      .insert(studentGrades)
      .values({
        studentId,
        enrollmentId: enrollment.id,
        academicYear,
        term,
        aspect,
        grades,
        finalGrade,
        teacherId,
      })
      .onConflictDoUpdate({
        target: [studentGrades.studentId, studentGrades.academicYear, studentGrades.term, studentGrades.aspect],
        set: {
          grades,
          finalGrade,
          teacherId,
          updatedAt: new Date(),
        },
      })
      .returning();

    return gradeRecord;
  }

  private calculateFinalGrade(grades: number[]): number {
    if (grades.length === 0) return 0;
    
    // Calculate mode (most frequent grade)
    const frequency: { [key: number]: number } = {};
    for (const grade of grades) {
      frequency[grade] = (frequency[grade] || 0) + 1;
    }
    
    let maxCount = 0;
    let mode = 0;
    for (const [grade, count] of Object.entries(frequency)) {
      if (count > maxCount) {
        maxCount = count;
        mode = parseInt(grade);
      }
    }
    
    // If no clear mode (all grades appear once), use max
    if (maxCount === 1) {
      return Math.max(...grades);
    }
    
    return mode;
  }

  // Class operations
  async getClass(id: number): Promise<Class | undefined> {
    const [classData] = await db.select().from(classes).where(eq(classes.id, id));
    return classData;
  }

  async getClasses(): Promise<Class[]> {
    return await db.select().from(classes);
  }

  async getClassesWithStudentCount(): Promise<(Class & { studentCount: number })[]> {
    const classesWithCounts = await db
      .select({
        id: classes.id,
        name: classes.name,
        schoolId: classes.schoolId,
        academicYear: classes.academicYear,
        capacity: classes.capacity,
        description: classes.description,
        isActive: classes.isActive,
        createdAt: classes.createdAt,
        updatedAt: classes.updatedAt,
        studentCount: sql<number>`CAST(COUNT(${studentEnrollments.studentId}) AS INTEGER)`,
      })
      .from(classes)
      .leftJoin(studentEnrollments, and(
        eq(studentEnrollments.classId, classes.id), 
        eq(studentEnrollments.isActive, true),
        eq(studentEnrollments.academicYear, classes.academicYear)
      ))
      .groupBy(classes.id)
      .orderBy(classes.name);

    return classesWithCounts;
  }

  async getClassesBySchool(schoolId: number): Promise<Class[]> {
    return await db.select().from(classes).where(eq(classes.schoolId, schoolId));
  }

  async getClassesWithStudentCountBySchool(schoolId: number): Promise<(Class & { studentCount: number })[]> {
    const classesWithCounts = await db
      .select({
        id: classes.id,
        name: classes.name,
        schoolId: classes.schoolId,
        academicYear: classes.academicYear,
        capacity: classes.capacity,
        description: classes.description,
        isActive: classes.isActive,
        createdAt: classes.createdAt,
        updatedAt: classes.updatedAt,
        studentCount: sql<number>`CAST(COUNT(${studentEnrollments.studentId}) AS INTEGER)`,
      })
      .from(classes)
      .leftJoin(studentEnrollments, and(
        eq(studentEnrollments.classId, classes.id), 
        eq(studentEnrollments.isActive, true),
        eq(studentEnrollments.academicYear, classes.academicYear)
      ))
      .where(eq(classes.schoolId, schoolId))
      .groupBy(classes.id)
      .orderBy(classes.name);

    return classesWithCounts;
  }

  async createClass(classData: InsertClass): Promise<Class> {
    const [newClass] = await db.insert(classes).values(classData).returning();
    return newClass;
  }

  async updateClass(id: number, data: Partial<Class>): Promise<Class> {
    const [updatedClass] = await db
      .update(classes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(classes.id, id))
      .returning();
    return updatedClass;
  }

  async deleteClass(id: number): Promise<void> {
    await db.delete(classes).where(eq(classes.id, id));
  }

  // Student Group operations
  async getStudentGroup(id: number): Promise<StudentGroup | undefined> {
    const [group] = await db.select().from(studentGroups).where(eq(studentGroups.id, id));
    return group;
  }

  async getStudentGroups(): Promise<StudentGroup[]> {
    return await db.select().from(studentGroups);
  }

  async getStudentGroupsByClass(classId: number): Promise<StudentGroup[]> {
    return await db.select().from(studentGroups).where(eq(studentGroups.classId, classId));
  }

  async getStudentGroupsWithTeachers(schoolId?: number, academicYear?: string): Promise<(StudentGroup & { teachers: User[] })[]> {
    const groups = schoolId 
      ? await db.select().from(studentGroups).where(eq(studentGroups.schoolId, schoolId))
      : await db.select().from(studentGroups);

    // Get teacher assignments for these groups
    const groupIds = groups.map(g => g.id);
    if (groupIds.length === 0) return [];

    const teacherAssignments = await db
      .select({
        groupId: groupTeacherAssignments.groupId,
        teacherUserId: groupTeacherAssignments.teacherUserId,
        academicYear: groupTeacherAssignments.academicYear,
        schoolId: groupTeacherAssignments.schoolId,
        fullName: users.fullName,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        profileImageUrl: users.profileImageUrl,
        roles: users.roles,
        isActive: users.isActive,
      })
      .from(groupTeacherAssignments)
      .leftJoin(users, eq(groupTeacherAssignments.teacherUserId, users.id))
      .where(and(
        inArray(groupTeacherAssignments.groupId, groupIds),
        eq(groupTeacherAssignments.isActive, true),
        academicYear ? eq(groupTeacherAssignments.academicYear, academicYear) : sql`1=1`,
        schoolId ? eq(groupTeacherAssignments.schoolId, schoolId) : sql`1=1`
      ));

    // Map groups with their teachers
    return groups.map(group => ({
      ...group,
      teachers: teacherAssignments
        .filter(ta => ta.groupId === group.id)
        .map(ta => ({
          id: ta.teacherUserId,
          fullName: ta.fullName,
          firstName: ta.firstName,
          lastName: ta.lastName,
          email: ta.email,
          profileImageUrl: ta.profileImageUrl,
          roles: ta.roles,
          isActive: ta.isActive,
        } as User))
    }));
  }

  async createStudentGroup(groupData: InsertStudentGroup): Promise<StudentGroup> {
    const [newGroup] = await db.insert(studentGroups).values(groupData).returning();
    return newGroup;
  }

  async updateStudentGroup(id: number, data: Partial<StudentGroup>): Promise<StudentGroup> {
    const [updatedGroup] = await db
      .update(studentGroups)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(studentGroups.id, id))
      .returning();
    return updatedGroup;
  }

  async deleteStudentGroup(id: number): Promise<void> {
    await db.delete(studentGroups).where(eq(studentGroups.id, id));
  }

  async assignStudentToGroup(studentId: number, groupId: number | null): Promise<Student> {
    const [updatedStudent] = await db
      .update(students)
      .set({ groupId, updatedAt: new Date() })
      .where(eq(students.id, studentId))
      .returning();
    return updatedStudent;
  }

  // Admin operations
  async getStudentsWithDetails(): Promise<Student[]> {
    return await db.select().from(students);
  }

  async createStudentAdmin(data: InsertStudent): Promise<Student> {
    const [newStudent] = await db.insert(students).values(data).returning();
    return newStudent;
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

  // Removed duplicate getTeachersBySchool - already implemented above

  async getTeachersWithDetails(): Promise<any[]> {
    // Get users with teacher role and their school assignments
    const teachersWithAssignments = await db
      .select({
        id: users.id,
        userId: users.id,
        fullName: users.fullName,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        roles: users.roles,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        // Assignment data from userSchoolAssignments
        assignmentId: userSchoolAssignments.id,
        schoolId: userSchoolAssignments.schoolId,
        academicYear: userSchoolAssignments.academicYear,
        subjects: userSchoolAssignments.subjects,
        assignedClasses: userSchoolAssignments.assignedClasses,
        rolesAtSchool: userSchoolAssignments.rolesAtSchool,
        assignmentActive: userSchoolAssignments.isActive,
        schoolName: schools.name,
        schoolCode: schools.schoolCode,
      })
      .from(users)
      .leftJoin(userSchoolAssignments, eq(users.id, userSchoolAssignments.userId))
      .leftJoin(schools, eq(userSchoolAssignments.schoolId, schools.id))
      .where(
        sql`'teacher' = ANY(${users.roles}) OR ${userSchoolAssignments.rolesAtSchool} ? 'teacher'`
      );

    // Get groups assigned to each teacher through group_teacher_assignments
    const teacherGroups = await db
      .select({
        teacherUserId: groupTeacherAssignments.teacherUserId,
        groupId: groupTeacherAssignments.groupId,
        groupName: studentGroups.name,
      })
      .from(groupTeacherAssignments)
      .leftJoin(studentGroups, eq(groupTeacherAssignments.groupId, studentGroups.id))
      .where(eq(groupTeacherAssignments.isActive, true));

    // Group by teacher and merge assignments with groups
    const teacherMap = new Map();

    for (const row of teachersWithAssignments) {
      if (!teacherMap.has(row.id)) {
        // Find the current (2025/2026) assignment for backward compatibility
        const currentAssignments = teachersWithAssignments.filter(r => 
          r.id === row.id && r.academicYear === '2025/2026'
        );
        const currentAssignment = currentAssignments[0];

        // Get assigned groups for current teacher
        const assignedGroups = teacherGroups
          .filter(g => g.teacherUserId === row.id)
          .map(g => g.groupId);

        teacherMap.set(row.id, {
          id: row.id,
          userId: row.userId,
          fullName: row.fullName,
          email: row.email,
          // phone and qualifications are not part of User schema - remove or add to userSchoolAssignments if needed
          isActive: row.isActive,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          // For backward compatibility, include current assignment data directly on teacher
          subjects: currentAssignment?.subjects || [],
          assignedClasses: currentAssignment?.assignedClasses || [],
          assignedGroups: assignedGroups, // New field for assigned groups
          schoolId: currentAssignment?.schoolId,
          schoolName: currentAssignment?.schoolName,
          schoolCode: currentAssignment?.schoolCode,
          academicYear: currentAssignment?.academicYear || '2025/2026',
          assignments: []
        });
      }

      // Add assignment if it exists
      if (row.assignmentId) {
        const teacher = teacherMap.get(row.id);
        const existingAssignment = teacher.assignments.find(a => a.id === row.assignmentId);
        if (!existingAssignment) {
          // Get assigned groups for this teacher
          const assignmentGroups = teacherGroups
            .filter(g => g.teacherUserId === row.id)
            .map(g => g.groupId);

          teacher.assignments.push({
            id: row.assignmentId,
            schoolId: row.schoolId,
            academicYear: row.academicYear,
            subjects: row.subjects,
            assignedClasses: row.assignedClasses,
            assignedGroups: assignmentGroups, // Add groups to assignments too
            isActive: row.assignmentActive,
            schoolName: row.schoolName,
            schoolCode: row.schoolCode,
          });
        }
      }
    }

    return Array.from(teacherMap.values());
  }

  // Group Teacher Assignment operations using many-to-many relationship
  async assignTeacherToGroups(teacherUserId: string, groupIds: number[], schoolId: number, academicYear: string): Promise<void> {
    // Remove teacher from all current group assignments for this academic year
    await db
      .delete(groupTeacherAssignments)
      .where(and(
        eq(groupTeacherAssignments.teacherUserId, teacherUserId),
        eq(groupTeacherAssignments.academicYear, academicYear)
      ));

    // Assign teacher to new groups if groups provided
    if (groupIds.length > 0) {
      const assignments = groupIds.map(groupId => ({
        groupId,
        teacherUserId,
        schoolId,
        academicYear,
        isActive: true
      }));
      
      await db.insert(groupTeacherAssignments).values(assignments);
    }
  }

  async getGroupTeacherAssignments(groupId: number): Promise<GroupTeacherAssignment[]> {
    return await db
      .select()
      .from(groupTeacherAssignments)
      .where(and(
        eq(groupTeacherAssignments.groupId, groupId),
        eq(groupTeacherAssignments.isActive, true)
      ));
  }

  async getTeacherGroupAssignments(teacherUserId: string, academicYear: string): Promise<GroupTeacherAssignment[]> {
    return await db
      .select()
      .from(groupTeacherAssignments)
      .where(and(
        eq(groupTeacherAssignments.teacherUserId, teacherUserId),
        eq(groupTeacherAssignments.academicYear, academicYear),
        eq(groupTeacherAssignments.isActive, true)
      ));
  }

  async removeTeacherFromGroup(groupId: number, academicYear: string): Promise<void> {
    await db
      .delete(groupTeacherAssignments)
      .where(and(
        eq(groupTeacherAssignments.groupId, groupId),
        eq(groupTeacherAssignments.academicYear, academicYear)
      ));
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

  // School operations
  async getSchools(): Promise<School[]> {
    return await db.select().from(schools);
  }

  // SuperAdmin operations
  async getAllSchools(): Promise<School[]> {
    return await db.select().from(schools);
  }

  async createSchool(data: InsertSchool): Promise<School> {
    const [newSchool] = await db.insert(schools).values(data).returning();
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

  async getAllUsersWithSchools(): Promise<(User & { school?: School; assignedSchools?: Array<{ schoolId: number; schoolName: string; roles: string[] }> })[]> {
    // Get all users first
    const usersResult = await db.select().from(users);

    // Get all school assignments
    const schoolAssignments = await db
      .select({
        userId: userSchoolAssignments.userId,
        schoolId: userSchoolAssignments.schoolId,
        rolesAtSchool: userSchoolAssignments.rolesAtSchool,
        schoolName: schools.name,
      })
      .from(userSchoolAssignments)
      .leftJoin(schools, eq(userSchoolAssignments.schoolId, schools.id))
      .where(eq(userSchoolAssignments.isActive, true));

    // Get primary schools
    const primarySchools = await db.select().from(schools);

    return usersResult.map(user => {
      const primarySchool = primarySchools.find(school => school.id === user.schoolId);
      const userAssignments = schoolAssignments.filter(assignment => assignment.userId === user.id);

      return {
        ...user,
        school: primarySchool,
        assignedSchools: userAssignments.map(assignment => ({
          schoolId: assignment.schoolId,
          schoolName: assignment.schoolName || 'Unknown School',
          roles: assignment.rolesAtSchool || [],
        })),
      };
    });
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

  async assignUserToSchools(userId: string, schoolAssignments: Array<{ schoolId: number; roles: string[] }>): Promise<void> {
    // Remove existing assignments for this user
    await db.delete(userSchoolAssignments).where(eq(userSchoolAssignments.userId, userId));

    // Add new assignments with multiple roles per school
    if (schoolAssignments.length > 0) {
      const assignmentData = schoolAssignments.map(assignment => ({
        userId,
        schoolId: assignment.schoolId,
        rolesAtSchool: assignment.roles,
        isActive: true,
      }));

      await db.insert(userSchoolAssignments).values(assignmentData);
    }
  }

  async updateUserSchoolRoles(userId: string, schoolId: number, roles: string[]): Promise<UserSchoolAssignment> {
    const [assignment] = await db
      .update(userSchoolAssignments)
      .set({
        rolesAtSchool: roles,
        updatedAt: new Date(),
      })
      .where(and(eq(userSchoolAssignments.userId, userId), eq(userSchoolAssignments.schoolId, schoolId)))
      .returning();

    if (!assignment) {
      // Create new assignment if it doesn't exist
      const [newAssignment] = await db
        .insert(userSchoolAssignments)
        .values({
          userId,
          schoolId,
          rolesAtSchool: roles,
          isActive: true,
        })
        .returning();
      return newAssignment;
    }

    return assignment;
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
    const [teachersCount] = await db.select({ count: sql`count(*)` }).from(users).where(sql`'teacher' = ANY(${users.roles})`);

    return {
      totalSchools: Number(schoolsCount.count),
      totalUsers: Number(usersCount.count),
      totalStudents: Number(studentsCount.count),
      totalTeachers: Number(teachersCount.count),
    };
  }

  // Teacher input system methods
  async updateStudentAttendanceBatch(attendanceData: Record<number, any>): Promise<any[]> {
    const results = [];

    for (const [studentId, data] of Object.entries(attendanceData)) {
      const [student] = await db
        .update(students)
        .set({
          sakit: data.sakit || 0,
          izin: data.izin || 0,
          alpa: data.alpa || 0,
          tinggiBadan: data.tinggiBadan?.toString() || "0",
          beratBadan: data.beratBadan?.toString() || "0",
          updatedAt: new Date(),
        })
        .where(eq(students.id, parseInt(studentId)))
        .returning();

      results.push(student);
    }

    return results;
  }

  async saveStudentNarration(narrationData: InsertStudentNarration): Promise<StudentNarration> {
    const [narration] = await db
      .insert(studentNarrations)
      .values(narrationData)
      .returning();

    return narration;
  }

  async updateStudentGradesBatch(aspect: string, gradeData: Record<number, string>): Promise<any[]> {
    const results = [];

    for (const [studentId, gradeArrayString] of Object.entries(gradeData)) {
      // Parse grade array from string like "2,2,3,4,5,6,5"
      const gradeArray = gradeArrayString.split(',').map(g => parseInt(g.trim())).filter(g => !isNaN(g));

      if (gradeArray.length === 0) continue;

      // Get current student grades
      const [currentStudent] = await db
        .select()
        .from(students)
        .where(eq(students.id, parseInt(studentId)));

      if (currentStudent) {
        const currentGrades = currentStudent.grades || {};
        currentGrades[aspect] = gradeArray;

        const [student] = await db
          .update(students)
          .set({
            grades: currentGrades,
            updatedAt: new Date(),
          })
          .where(eq(students.id, parseInt(studentId)))
          .returning();

        results.push(student);
      }
    }

    return results;
  }
}

export const storage = new DatabaseStorage();