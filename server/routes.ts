import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupGoogleAuth } from "./googleAuth";
import { 
  gradeInputSchema, 
  radarChartConfigSchema, 
  insertStudentSchema,
  insertClassSchema,
  insertStudentGroupSchema,
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
  await setupGoogleAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get effective school (from multi-school assignments or primary school)
      const effectiveSchool = await storage.getUserEffectiveSchool(userId);
      
      // Get additional role-specific data
      let roleData = null;
      if (user.roles.includes('parent')) {
        roleData = await storage.getParent(userId);
      }
      // Note: Teacher data is now embedded in userSchoolAssignments, no separate teacher table
      
      res.json({ ...user, roleData, effectiveSchool });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get user's effective school
  app.get('/api/auth/user/school', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const effectiveSchool = await storage.getUserEffectiveSchool(userId);
      res.json({ school: effectiveSchool });
    } catch (error) {
      console.error("Error fetching user's effective school:", error);
      res.status(500).json({ message: "Failed to fetch user's school" });
    }
  });

  // Profile management routes
  app.get('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.patch('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { fullName } = req.body;

      if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
        return res.status(400).json({ message: "Full name is required" });
      }

      const updatedUser = await storage.updateUser(userId, {
        fullName: fullName.trim()
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Teacher input system routes
  // Batch attendance and health data update
  app.post('/api/attendance/batch', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.roles.includes('teacher')) {
        return res.status(403).json({ message: "Only teachers can update attendance data" });
      }

      const { attendanceData, academicYear, term } = req.body;
      
      if (!attendanceData || !academicYear || !term) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const results = await storage.updateStudentAttendanceBatch(attendanceData);
      res.json({ message: "Attendance data updated successfully", results });
    } catch (error) {
      console.error("Error updating attendance data:", error);
      res.status(500).json({ message: "Failed to update attendance data" });
    }
  });

  // Save student narration
  app.post('/api/narration', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.roles.includes('teacher')) {
        return res.status(403).json({ message: "Only teachers can save narrations" });
      }

      const { studentId, label, content, academicYear, term } = req.body;
      
      if (!studentId || !label || !content || !academicYear || !term) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const narration = await storage.saveStudentNarration({
        studentId,
        teacherId: userId,
        label,
        content,
        academicYear,
        term,
      });

      res.json(narration);
    } catch (error) {
      console.error("Error saving narration:", error);
      res.status(500).json({ message: "Failed to save narration" });
    }
  });

  // Batch grade update
  app.post('/api/grades/batch', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.roles.includes('teacher')) {
        return res.status(403).json({ message: "Only teachers can update grades" });
      }

      const { aspect, gradeData, academicYear, term } = req.body;
      
      if (!aspect || !gradeData || !academicYear || !term) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const results = await storage.updateStudentGradesBatch(aspect, gradeData);
      res.json({ message: "Grades updated successfully", results });
    } catch (error) {
      console.error("Error updating grades:", error);
      res.status(500).json({ message: "Failed to update grades" });
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

      // Check if this is a Grade Input system request with specific filters
      const { '0': academicYear, '1': classId, '2': schoolId } = req.query;
      
      if (academicYear && classId && schoolId) {
        // This is a Grade Input system request - get students by class with class and group names
        console.log('Grade Input request - filtering by:', { academicYear, classId, schoolId });
        
        // Verify teacher has access to this class/school
        if (user.roles.includes('teacher')) {
          const effectiveSchool = await storage.getUserEffectiveSchool(userId);
          if (effectiveSchool && effectiveSchool.id.toString() !== schoolId) {
            return res.status(403).json({ message: "Access denied to this school" });
          }
        }
        
        const students = await storage.getStudentsByClassWithDetails(
          parseInt(classId), 
          academicYear, 
          parseInt(schoolId)
        );
        
        console.log(`Found ${students.length} students for class ${classId} in ${academicYear}`);
        return res.json(students);
      }

      // Default behavior for other requests
      let students: any[] = [];
      
      if (user.roles.includes('admin')) {
        students = await storage.getStudents();
      } else if (user.roles.includes('teacher')) {
        // Teacher data is now embedded in userSchoolAssignments - use user ID directly
        students = await storage.getStudentsByTeacher(userId);
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let classes: any[] = [];
      const withStudentCount = req.query.withStudentCount === 'true';
      
      if (user.roles.includes('superadmin')) {
        // SuperAdmin can see all classes across all schools
        classes = withStudentCount ? await storage.getClassesWithStudentCount() : await storage.getClasses();
      } else if (user.roles.includes('admin')) {
        // Regular admin can only see classes from their effective school
        const effectiveSchool = await storage.getUserEffectiveSchool(userId);
        if (effectiveSchool) {
          classes = withStudentCount ? 
            await storage.getClassesWithStudentCountBySchool(effectiveSchool.id) : 
            await storage.getClassesBySchool(effectiveSchool.id);
        } else {
          classes = []; // No effective school found
        }
      } else {
        // Other roles get limited access based on their assignments
        const effectiveSchool = await storage.getUserEffectiveSchool(userId);
        if (effectiveSchool) {
          classes = withStudentCount ? 
            await storage.getClassesWithStudentCountBySchool(effectiveSchool.id) : 
            await storage.getClassesBySchool(effectiveSchool.id);
        } else {
          classes = [];
        }
      }

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

      // Get user's effective school ID for security
      let effectiveSchoolId = req.body.schoolId;
      
      if (!user.roles.includes('superadmin')) {
        // Regular admins can only create classes in their effective school
        const effectiveSchool = await storage.getUserEffectiveSchool(userId);
        if (!effectiveSchool) {
          return res.status(403).json({ message: "No school assignment found" });
        }
        effectiveSchoolId = effectiveSchool.id;
      }

      const classData = insertClassSchema.parse({
        ...req.body,
        schoolId: effectiveSchoolId
      });
      
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
      let updateData = req.body;
      
      if (!user.roles.includes('superadmin')) {
        // Regular admins can only update classes in their effective school
        const effectiveSchool = await storage.getUserEffectiveSchool(userId);
        if (!effectiveSchool) {
          return res.status(403).json({ message: "No school assignment found" });
        }
        
        // Verify the class belongs to user's effective school
        const existingClass = await storage.getClass(classId);
        if (!existingClass || existingClass.schoolId !== effectiveSchool.id) {
          return res.status(403).json({ message: "Cannot update class from different school" });
        }
        
        // Ensure schoolId cannot be changed
        updateData = {
          ...updateData,
          schoolId: effectiveSchool.id
        };
      }

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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const classId = req.query.classId;
      const withTeachers = req.query.withTeachers === 'true';
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let groups;
      
      if (withTeachers) {
        // Get groups with teacher assignments, filtered by user's effective school
        let schoolId, academicYear = '2025/2026';
        
        if (!user.roles.includes('superadmin')) {
          const effectiveSchool = await storage.getUserEffectiveSchool(userId);
          if (effectiveSchool) {
            schoolId = effectiveSchool.id;
          }
        }
        
        groups = await storage.getStudentGroupsWithTeachers(schoolId, academicYear);
        
        // Filter by classId if provided
        if (classId) {
          groups = groups.filter(g => g.classId === parseInt(classId));
        }
      } else {
        // Original behavior for backward compatibility
        if (classId) {
          groups = await storage.getStudentGroupsByClass(parseInt(classId));
        } else {
          groups = await storage.getStudentGroups();
        }
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

      // Get user's effective school ID for security
      let effectiveSchoolId = req.body.schoolId;
      
      if (!user.roles.includes('superadmin')) {
        // Regular admins can only create groups in their effective school
        const effectiveSchool = await storage.getUserEffectiveSchool(userId);
        if (!effectiveSchool) {
          return res.status(403).json({ message: "No school assignment found" });
        }
        effectiveSchoolId = effectiveSchool.id;
      }

      const groupData = insertStudentGroupSchema.parse({
        ...req.body,
        schoolId: effectiveSchoolId,
        academicYear: req.body.academicYear || '2025/2026'
      });
      
      const newGroup = await storage.createStudentGroup(groupData);
      
      // Handle teacher assignments if provided (separate from group data)
      if (req.body.teacherId && req.body.teacherId !== 'no-teacher') {
        console.log('Processing teacher assignment for new group:', newGroup.id, 'teacher:', req.body.teacherId);
        
        const teacherUserId = req.body.teacherId.toString();
        const academicYear = groupData.academicYear || '2025/2026';
        
        await storage.assignTeacherToGroups(teacherUserId, [newGroup.id], effectiveSchoolId, academicYear);
        console.log('Assigned teacher', teacherUserId, 'to new group', newGroup.id);
      }
      
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
      let updateData = req.body;
      
      if (!user.roles.includes('superadmin')) {
        // Regular admins can only update groups in their effective school
        const effectiveSchool = await storage.getUserEffectiveSchool(userId);
        if (!effectiveSchool) {
          return res.status(403).json({ message: "No school assignment found" });
        }
        
        // Verify the group belongs to user's effective school
        const existingGroup = await storage.getStudentGroup(groupId);
        if (!existingGroup || existingGroup.schoolId !== effectiveSchool.id) {
          return res.status(403).json({ message: "Cannot update group from different school" });
        }
        
        // Ensure schoolId cannot be changed
        updateData = {
          ...updateData,
          schoolId: effectiveSchool.id
        };
      }

      const updatedGroup = await storage.updateStudentGroup(groupId, updateData);
      
      // Handle teacher assignments if provided
      if (updateData.teacherId !== undefined) {
        console.log('Processing teacher assignment for group:', groupId, 'teacher:', updateData.teacherId);
        
        // Get user's effective school ID for security
        let effectiveSchoolId;
        if (!user.roles.includes('superadmin')) {
          const effectiveSchool = await storage.getUserEffectiveSchool(userId);
          effectiveSchoolId = effectiveSchool?.id;
        } else {
          // For superadmin, get school from the group
          const groupInfo = await storage.getStudentGroup(groupId);
          effectiveSchoolId = groupInfo?.schoolId;
        }
        
        if (effectiveSchoolId) {
          // Remove existing assignments for this group in this academic year
          await storage.removeTeacherFromGroup(groupId, '2025/2026');
          
          // Add new assignment if teacher is selected
          if (updateData.teacherId && updateData.teacherId !== 'no-teacher') {
            const teacherUserId = updateData.teacherId.toString();
            await storage.assignTeacherToGroups(teacherUserId, [groupId], effectiveSchoolId, '2025/2026');
            console.log('Assigned teacher', teacherUserId, 'to group', groupId);
          }
        }
      }
      
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

  // Group Teacher Assignment routes
  app.post('/api/group-teacher-assignments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.roles.includes('admin')) {
        return res.status(403).json({ message: "Only admins can assign teachers to groups" });
      }

      const { teacherUserId, groupIds, academicYear = '2025/2026' } = req.body;
      
      // Get user's effective school ID for security
      let effectiveSchoolId;
      
      if (!user.roles.includes('superadmin')) {
        const effectiveSchool = await storage.getUserEffectiveSchool(userId);
        if (!effectiveSchool) {
          return res.status(403).json({ message: "No school assignment found" });
        }
        effectiveSchoolId = effectiveSchool.id;
      } else {
        // For superadmin, get school from the first group
        if (groupIds.length > 0) {
          const group = await storage.getStudentGroup(groupIds[0]);
          effectiveSchoolId = group?.schoolId;
        }
      }

      if (!effectiveSchoolId) {
        return res.status(400).json({ message: "School ID could not be determined" });
      }

      await storage.assignTeacherToGroups(teacherUserId, groupIds, effectiveSchoolId, academicYear);
      
      res.json({ message: "Teacher assigned to groups successfully" });
    } catch (error) {
      console.error("Error assigning teacher to groups:", error);
      res.status(500).json({ message: "Failed to assign teacher to groups" });
    }
  });

  app.delete('/api/group-teacher-assignments/:teacherUserId/:groupId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.roles.includes('admin')) {
        return res.status(403).json({ message: "Only admins can remove teacher assignments" });
      }

      const { teacherUserId, groupId } = req.params;
      await storage.removeTeacherFromGroup(teacherUserId, parseInt(groupId));
      
      res.json({ message: "Teacher removed from group successfully" });
    } catch (error) {
      console.error("Error removing teacher from group:", error);
      res.status(500).json({ message: "Failed to remove teacher from group" });
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
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      
      // SuperAdmin gets system-wide stats
      if (user?.roles.includes('superadmin')) {
        const students = await storage.getStudents();
        const teachers = await storage.getTeachersWithDetails();
        const classes = await storage.getClasses();
        const templates = await storage.getAllReportTemplates();
        
        res.json({
          totalStudents: students.length,
          totalTeachers: teachers.length,
          totalClasses: classes.length,
          totalReportTemplates: templates.length,
        });
        return;
      }
      
      // Regular admin gets stats for their effective school only
      const effectiveSchool = await storage.getUserEffectiveSchool(userId);
      
      if (effectiveSchool) {
        const students = await storage.getStudentsBySchool(effectiveSchool.id);
        const teachers = await storage.getTeachersBySchool(effectiveSchool.id);
        const classes = await storage.getClassesBySchool(effectiveSchool.id);
        const templates = await storage.getAllReportTemplates(); // Templates are global for now
        
        res.json({
          totalStudents: students.length,
          totalTeachers: teachers.length,
          totalClasses: classes.length,
          totalReportTemplates: templates.length,
        });
      } else {
        // No effective school found
        res.json({
          totalStudents: 0,
          totalTeachers: 0,
          totalClasses: 0,
          totalReportTemplates: 0,
        });
      }
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  // Student management (admin)
  app.get('/api/admin/students', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      
      console.log('Fetching students for admin user:', userId);
      
      // SuperAdmin gets all students across all schools
      if (user?.roles.includes('superadmin')) {
        console.log('SuperAdmin access: getting all students');
        const allStudents = await storage.getStudentsWithDetails();
        return res.json(allStudents);
      }
      
      // Regular admin gets students from their effective school only
      const effectiveSchool = await storage.getUserEffectiveSchool(userId);
      console.log('Effective school for user:', effectiveSchool);
      
      if (effectiveSchool) {
        const students = await storage.getStudentsBySchool(effectiveSchool.id);
        console.log('Found students for school:', students.length);
        return res.json(students);
      }

      // No effective school found
      console.log('No effective school found, returning empty array');
      res.json([]);
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
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      
      console.log('Fetching teachers for admin user:', userId);
      
      // SuperAdmin gets all teachers across all schools
      if (user?.roles.includes('superadmin')) {
        console.log('SuperAdmin access: getting all teachers with details');
        const allTeachers = await storage.getTeachersWithDetails();
        const activeTeachers = allTeachers.filter(t => t.isActive);
        console.log('Found active teachers:', activeTeachers.length);
        return res.json(activeTeachers);
      }
      
      // Regular admin gets teachers from their effective school only
      const effectiveSchool = await storage.getUserEffectiveSchool(userId);
      console.log('Effective school for user:', effectiveSchool);
      
      if (effectiveSchool) {
        const teachers = await storage.getTeachersBySchool(effectiveSchool.id);
        console.log('Found teachers for school:', teachers.length);
        return res.json(teachers);
      }

      // No effective school found
      console.log('No effective school found, returning empty array');
      res.json([]);
    } catch (error) {
      console.error("Error fetching teachers for admin:", error);
      res.status(500).json({ message: "Failed to fetch teachers" });
    }
  });

  // Teacher management is now handled through user management
  // Teachers are users with 'teacher' role assigned via userSchoolAssignments
  app.post('/api/admin/teachers', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      res.status(200).json({ message: "Teacher management is now handled through user management. Use /api/superadmin/users endpoints." });
    } catch (error) {
      console.error("Error with teacher endpoint:", error);
      res.status(500).json({ message: "Teacher management moved to user system" });
    }
  });

  app.patch('/api/admin/teachers/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      res.status(200).json({ message: "Teacher management is now handled through user management. Use /api/superadmin/users endpoints." });
    } catch (error) {
      console.error("Error with teacher endpoint:", error);
      res.status(500).json({ message: "Teacher management moved to user system" });
    }
  });

  app.delete('/api/admin/teachers/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      res.status(200).json({ message: "Teacher management is now handled through user management. Use /api/superadmin/users endpoints." });
    } catch (error) {
      console.error("Error with teacher endpoint:", error);
      res.status(500).json({ message: "Teacher management moved to user system" });
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

  // Multi-school assignment endpoints
  app.post("/api/superadmin/users/:id/school-assignments", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const { schoolAssignments } = req.body;
      await storage.assignUserToSchools(userId, schoolAssignments);
      res.json({ message: "School assignments updated successfully" });
    } catch (error) {
      console.error("Error updating school assignments:", error);
      res.status(500).json({ message: "Failed to update school assignments" });
    }
  });

  // Update specific user school roles
  app.patch("/api/superadmin/users/:userId/schools/:schoolId/roles", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const { userId, schoolId } = req.params;
      const { roles } = req.body;
      
      if (!roles || !Array.isArray(roles)) {
        return res.status(400).json({ message: "Roles array is required" });
      }

      const assignment = await storage.updateUserSchoolRoles(userId, parseInt(schoolId), roles);
      res.json(assignment);
    } catch (error) {
      console.error("Error updating user school roles:", error);
      res.status(500).json({ message: "Failed to update user school roles" });
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
