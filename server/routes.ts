import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  gradeInputSchema, 
  radarChartConfigSchema, 
  insertStudentSchema,
  insertClassSchema,
  insertStudentGroupSchema,
  insertTeacherSchema,
  insertParentSchema,
  insertReportTemplateSchema,
  insertSchoolSchema,
  users,
  ASSESSMENT_ASPECTS 
} from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { eq } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get additional role-specific data
      let roleData = null;
      if (user.roles.includes('teacher')) {
        roleData = await storage.getTeacher(userId);
      } else if (user.roles.includes('parent')) {
        roleData = await storage.getParent(userId);
      }
      
      res.json({ ...user, roleData });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Grade management routes
  app.post('/api/grades', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.roles.includes('teacher')) {
        return res.status(403).json({ message: "Only teachers can input grades" });
      }

      const gradeData = gradeInputSchema.parse(req.body);
      const updatedStudent = await storage.updateStudentGrades(
        gradeData.studentId,
        gradeData.aspect,
        gradeData.grades
      );

      res.json(updatedStudent);
    } catch (error) {
      console.error("Error updating grades:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid grade data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update grades" });
    }
  });

  // Student routes
  app.get('/api/students', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let students: any[] = [];
      
      if (user.roles.includes('admin')) {
        students = await storage.getStudents();
      } else if (user.roles.includes('teacher')) {
        const teacher = await storage.getTeacher(userId);
        if (teacher) {
          students = await storage.getStudentsByTeacher(teacher.id);
        }
      } else if (user.roles.includes('parent')) {
        const parent = await storage.getParent(userId);
        if (parent) {
          students = await storage.getStudentsByParent(parent.id);
        }
      }

      res.json(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.get('/api/students/:id', isAuthenticated, async (req: any, res) => {
    try {
      const studentId = parseInt(req.params.id);
      const student = await storage.getStudent(studentId);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      res.json(student);
    } catch (error) {
      console.error("Error fetching student:", error);
      res.status(500).json({ message: "Failed to fetch student" });
    }
  });

  app.post('/api/students', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.roles.includes('admin')) {
        return res.status(403).json({ message: "Only admins can create students" });
      }

      const studentData = insertStudentSchema.parse(req.body);
      const student = await storage.createStudent(studentData);
      
      res.json(student);
    } catch (error) {
      console.error("Error creating student:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid student data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create student" });
    }
  });

  // Class routes
  app.get('/api/classes', isAuthenticated, async (req: any, res) => {
    try {
      const classes = await storage.getClasses();
      res.json(classes);
    } catch (error) {
      console.error("Error fetching classes:", error);
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

  app.post('/api/classes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.roles.includes('admin')) {
        return res.status(403).json({ message: "Only admins can create classes" });
      }

      const classData = insertClassSchema.parse(req.body);
      const newClass = await storage.createClass(classData);
      
      res.json(newClass);
    } catch (error) {
      console.error("Error creating class:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid class data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create class" });
    }
  });

  app.put('/api/classes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.roles.includes('admin')) {
        return res.status(403).json({ message: "Only admins can update classes" });
      }

      const classId = parseInt(req.params.id);
      const updateData = req.body;
      const updatedClass = await storage.updateClass(classId, updateData);
      
      res.json(updatedClass);
    } catch (error) {
      console.error("Error updating class:", error);
      res.status(500).json({ message: "Failed to update class" });
    }
  });

  app.delete('/api/classes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.roles.includes('admin')) {
        return res.status(403).json({ message: "Only admins can delete classes" });
      }

      const classId = parseInt(req.params.id);
      await storage.deleteClass(classId);
      
      res.json({ message: "Class deleted successfully" });
    } catch (error) {
      console.error("Error deleting class:", error);
      res.status(500).json({ message: "Failed to delete class" });
    }
  });

  // Schools routes
  app.get('/api/schools', isAuthenticated, async (req: any, res) => {
    try {
      const schools = await storage.getSchools();
      res.json(schools);
    } catch (error) {
      console.error("Error fetching schools:", error);
      res.status(500).json({ message: "Failed to fetch schools" });
    }
  });

  // Student Group routes
  app.get('/api/student-groups', isAuthenticated, async (req: any, res) => {
    try {
      const classId = req.query.classId;
      let groups;
      
      if (classId) {
        groups = await storage.getStudentGroupsByClass(parseInt(classId));
      } else {
        groups = await storage.getStudentGroups();
      }
      
      res.json(groups);
    } catch (error) {
      console.error("Error fetching student groups:", error);
      res.status(500).json({ message: "Failed to fetch student groups" });
    }
  });

  app.post('/api/student-groups', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.roles.includes('admin')) {
        return res.status(403).json({ message: "Only admins can create student groups" });
      }

      const groupData = insertStudentGroupSchema.parse(req.body);
      const newGroup = await storage.createStudentGroup(groupData);
      
      res.json(newGroup);
    } catch (error) {
      console.error("Error creating student group:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid group data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create student group" });
    }
  });

  app.put('/api/student-groups/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.roles.includes('admin')) {
        return res.status(403).json({ message: "Only admins can update student groups" });
      }

      const groupId = parseInt(req.params.id);
      const updateData = req.body;
      const updatedGroup = await storage.updateStudentGroup(groupId, updateData);
      
      res.json(updatedGroup);
    } catch (error) {
      console.error("Error updating student group:", error);
      res.status(500).json({ message: "Failed to update student group" });
    }
  });

  app.delete('/api/student-groups/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.roles.includes('admin')) {
        return res.status(403).json({ message: "Only admins can delete student groups" });
      }

      const groupId = parseInt(req.params.id);
      await storage.deleteStudentGroup(groupId);
      
      res.json({ message: "Student group deleted successfully" });
    } catch (error) {
      console.error("Error deleting student group:", error);
      res.status(500).json({ message: "Failed to delete student group" });
    }
  });

  app.put('/api/students/:id/assign-group', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.roles.includes('admin')) {
        return res.status(403).json({ message: "Only admins can assign students to groups" });
      }

      const studentId = parseInt(req.params.id);
      const { groupId } = req.body;
      const updatedStudent = await storage.assignStudentToGroup(studentId, groupId);
      
      res.json(updatedStudent);
    } catch (error) {
      console.error("Error assigning student to group:", error);
      res.status(500).json({ message: "Failed to assign student to group" });
    }
  });

  // Teacher routes
  app.post('/api/teachers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.roles.includes('admin')) {
        return res.status(403).json({ message: "Only admins can create teachers" });
      }

      const teacherData = insertTeacherSchema.parse(req.body);
      const teacher = await storage.createTeacher(teacherData);
      
      res.json(teacher);
    } catch (error) {
      console.error("Error creating teacher:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid teacher data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create teacher" });
    }
  });

  // Parent routes
  app.post('/api/parents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.roles.includes('admin')) {
        return res.status(403).json({ message: "Only admins can create parents" });
      }

      const parentData = insertParentSchema.parse(req.body);
      const parent = await storage.createParent(parentData);
      
      res.json(parent);
    } catch (error) {
      console.error("Error creating parent:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid parent data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create parent" });
    }
  });

  // Assessment aspects route
  app.get('/api/assessment-aspects', isAuthenticated, async (req: any, res) => {
    res.json(ASSESSMENT_ASPECTS);
  });

  // Radar chart data route
  app.post('/api/radar-chart', isAuthenticated, async (req: any, res) => {
    try {
      const config = radarChartConfigSchema.parse(req.body);
      const student = await storage.getStudent(config.studentId);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Calculate final grades for selected aspects
      const chartData = config.aspects.map(aspect => {
        const grades = student.grades[aspect] || [];
        const finalGrade = grades.length > 0 ? grades[grades.length - 1] : 0;
        return {
          aspect,
          grade: finalGrade,
          gradeHistory: grades,
        };
      });

      res.json({
        student: {
          id: student.id,
          name: student.fullName,
        },
        data: chartData,
        config,
      });
    } catch (error) {
      console.error("Error generating chart data:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid chart configuration", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to generate chart data" });
    }
  });

  // Admin routes - admin-only access
  const requireAdmin = async (req: any, res: any, next: any) => {
    const userId = req.user?.claims?.sub;
    const user = await storage.getUser(userId);
    if (!user || !user.roles.includes('admin')) {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  };

  // Admin dashboard stats
  app.get('/api/admin/stats', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const students = await storage.getStudents();
      const teachers = await storage.getTeachers();
      const classes = await storage.getClasses();
      const templates = await storage.getAllReportTemplates();
      
      res.json({
        totalStudents: students.length,
        totalTeachers: teachers.length,
        totalClasses: classes.length,
        totalReportTemplates: templates.length,
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  // Student management (admin)
  app.get('/api/admin/students', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const students = await storage.getStudentsWithDetails();
      res.json(students);
    } catch (error) {
      console.error("Error fetching students for admin:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.post('/api/admin/students', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const studentData = req.body;
      const student = await storage.createStudentAdmin(studentData);
      res.json(student);
    } catch (error) {
      console.error("Error creating student:", error);
      res.status(500).json({ message: "Failed to create student" });
    }
  });

  app.post('/api/admin/students/bulk', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { studentsData } = req.body;
      if (!Array.isArray(studentsData) || studentsData.length === 0) {
        return res.status(400).json({ message: "studentsData must be a non-empty array" });
      }
      
      const students = await storage.createStudentsBulk(studentsData);
      res.json(students);
    } catch (error) {
      console.error("Error creating students in bulk:", error);
      res.status(500).json({ message: "Failed to create students in bulk" });
    }
  });

  app.patch('/api/admin/students/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      const student = await storage.updateStudentAdmin(id, updateData);
      res.json(student);
    } catch (error) {
      console.error("Error updating student:", error);
      res.status(500).json({ message: "Failed to update student" });
    }
  });

  app.patch('/api/admin/students/:id/status', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { isActive } = req.body;
      const student = await storage.updateStudentStatus(id, isActive);
      res.json(student);
    } catch (error) {
      console.error("Error updating student status:", error);
      res.status(500).json({ message: "Failed to update student status" });
    }
  });

  app.delete('/api/admin/students/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteStudent(id);
      res.json({ message: "Student deleted successfully" });
    } catch (error) {
      console.error("Error deleting student:", error);
      res.status(500).json({ message: "Failed to delete student" });
    }
  });

  // Teacher management (admin)
  app.get('/api/admin/teachers', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const teachers = await storage.getTeachersWithDetails();
      res.json(teachers);
    } catch (error) {
      console.error("Error fetching teachers for admin:", error);
      res.status(500).json({ message: "Failed to fetch teachers" });
    }
  });

  app.post('/api/admin/teachers', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const teacherData = req.body;
      const teacher = await storage.createTeacherAdmin(teacherData);
      res.json(teacher);
    } catch (error) {
      console.error("Error creating teacher:", error);
      res.status(500).json({ message: "Failed to create teacher" });
    }
  });

  app.patch('/api/admin/teachers/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      const teacher = await storage.updateTeacherAdmin(id, updateData);
      res.json(teacher);
    } catch (error) {
      console.error("Error updating teacher:", error);
      res.status(500).json({ message: "Failed to update teacher" });
    }
  });

  app.delete('/api/admin/teachers/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTeacherAdmin(id);
      res.json({ message: "Teacher deleted successfully" });
    } catch (error) {
      console.error("Error deleting teacher:", error);
      res.status(500).json({ message: "Failed to delete teacher" });
    }
  });

  // Report template management (admin)
  app.get('/api/admin/report-templates', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const templates = await storage.getAllReportTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching report templates:", error);
      res.status(500).json({ message: "Failed to fetch report templates" });
    }
  });

  app.post('/api/admin/report-templates', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const templateData = req.body;
      const template = await storage.createReportTemplate(templateData);
      res.json(template);
    } catch (error) {
      console.error("Error creating report template:", error);
      res.status(500).json({ message: "Failed to create report template" });
    }
  });

  app.patch('/api/admin/report-templates/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      const template = await storage.updateReportTemplate(id, updateData);
      res.json(template);
    } catch (error) {
      console.error("Error updating report template:", error);
      res.status(500).json({ message: "Failed to update report template" });
    }
  });

  app.delete('/api/admin/report-templates/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteReportTemplate(id);
      res.json({ message: "Report template deleted successfully" });
    } catch (error) {
      console.error("Error deleting report template:", error);
      res.status(500).json({ message: "Failed to delete report template" });
    }
  });

  // SuperAdmin routes
  const isSuperAdmin = async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.roles.includes("superadmin")) {
        return res.status(403).json({ message: "Access denied. SuperAdmin role required." });
      }

      next();
    } catch (error) {
      console.error("Error checking superadmin role:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };

  // SuperAdmin Schools Management
  app.get("/api/superadmin/schools", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const schools = await storage.getAllSchools();
      res.json(schools);
    } catch (error) {
      console.error("Error fetching schools:", error);
      res.status(500).json({ message: "Failed to fetch schools" });
    }
  });

  app.post("/api/superadmin/schools", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const school = await storage.createSchool(req.body);
      res.status(201).json(school);
    } catch (error) {
      console.error("Error creating school:", error);
      res.status(500).json({ message: "Failed to create school" });
    }
  });

  app.put("/api/superadmin/schools/:id", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const school = await storage.updateSchool(id, req.body);
      res.json(school);
    } catch (error) {
      console.error("Error updating school:", error);
      res.status(500).json({ message: "Failed to update school" });
    }
  });

  app.delete("/api/superadmin/schools/:id", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSchool(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting school:", error);
      res.status(500).json({ message: "Failed to delete school" });
    }
  });

  // SuperAdmin Users Management
  app.get("/api/superadmin/users", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsersWithSchools();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put("/api/superadmin/users/:id", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const id = req.params.id;
      const { roles, schoolId, isActive } = req.body;
      
      if (roles && schoolId !== undefined) {
        await storage.updateUserRoles(id, roles, schoolId);
      }
      
      if (isActive !== undefined) {
        const [updatedUser] = await db
          .update(users)
          .set({ isActive, updatedAt: new Date() })
          .where(eq(users.id, id))
          .returning();
      }
      
      const user = await storage.getUser(id);
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Add/Remove role endpoints
  app.post("/api/superadmin/users/:id/roles", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const id = req.params.id;
      const { role } = req.body;
      const user = await storage.addUserRole(id, role);
      res.json(user);
    } catch (error) {
      console.error("Error adding user role:", error);
      res.status(500).json({ message: "Failed to add user role" });
    }
  });

  app.delete("/api/superadmin/users/:id/roles/:role", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const { id, role } = req.params;
      const user = await storage.removeUserRole(id, role);
      res.json(user);
    } catch (error) {
      console.error("Error removing user role:", error);
      res.status(500).json({ message: "Failed to remove user role" });
    }
  });

  // SuperAdmin System Stats
  app.get("/api/superadmin/stats", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const stats = await storage.getSystemStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching system stats:", error);
      res.status(500).json({ message: "Failed to fetch system statistics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
