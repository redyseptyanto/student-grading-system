import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  gradeInputSchema, 
  radarChartConfigSchema, 
  insertStudentSchema,
  insertClassSchema,
  insertTeacherSchema,
  insertParentSchema,
  ASSESSMENT_ASPECTS 
} from "@shared/schema";
import { z } from "zod";

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
      if (user.role === 'teacher') {
        roleData = await storage.getTeacher(userId);
      } else if (user.role === 'parent') {
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
      
      if (!user || user.role !== 'teacher') {
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

      let students = [];
      
      if (user.role === 'admin') {
        students = await storage.getStudents();
      } else if (user.role === 'teacher') {
        const teacher = await storage.getTeacher(userId);
        if (teacher) {
          students = await storage.getStudentsByTeacher(teacher.id);
        }
      } else if (user.role === 'parent') {
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
      
      if (!user || user.role !== 'admin') {
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
      
      if (!user || user.role !== 'admin') {
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

  // Teacher routes
  app.post('/api/teachers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
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
      
      if (!user || user.role !== 'admin') {
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

  const httpServer = createServer(app);
  return httpServer;
}
