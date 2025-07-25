import fs from 'fs';
import csv from 'csv-parser';
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function populateTeachers() {
  const teachers = [];
  const teacherAssignments = [];
  
  // Read CSV file
  return new Promise((resolve, reject) => {
    fs.createReadStream('./attached_assets/teachers_1753440457573.csv')
      .pipe(csv())
      .on('data', (row) => {
        // Skip rows with empty school_code or user_id
        if (!row.school_code || !row.user_id) {
          console.log(`Skipping row with missing data: ${row.user_id || 'no user_id'} - ${row.school_code || 'no school_code'}`);
          return;
        }

        // Check if teacher already exists in our array
        let teacher = teachers.find(t => t.user_id === row.user_id);
        
        if (!teacher) {
          // Create new teacher record
          teacher = {
            user_id: row.user_id,
            full_name: row.full_name,
            email: row.email,
            phone: null,
            qualifications: null,
            is_active: true
          };
          teachers.push(teacher);
        }

        // Create teacher assignment for this academic year and school
        teacherAssignments.push({
          teacher_user_id: row.user_id, // We'll resolve this to teacher_id later
          school_code: row.school_code,
          academic_year: row.academic_year,
          subjects: [],
          assigned_classes: [],
          is_active: true
        });
      })
      .on('end', async () => {
        try {
          console.log(`Found ${teachers.length} unique teachers with ${teacherAssignments.length} assignments`);
          
          // Insert teachers first
          for (const teacher of teachers) {
            try {
              await pool.query(`
                INSERT INTO teachers (user_id, full_name, email, phone, qualifications, is_active)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (user_id) DO UPDATE SET
                  full_name = EXCLUDED.full_name,
                  email = EXCLUDED.email,
                  updated_at = NOW()
              `, [
                teacher.user_id,
                teacher.full_name,
                teacher.email,
                teacher.phone,
                teacher.qualifications,
                teacher.is_active
              ]);
            } catch (err) {
              console.error(`Error inserting teacher ${teacher.user_id}:`, err.message);
            }
          }
          
          console.log('Teachers inserted successfully');

          // Insert teacher assignments
          for (const assignment of teacherAssignments) {
            try {
              // Get teacher ID and school ID
              const teacherResult = await pool.query('SELECT id FROM teachers WHERE user_id = $1', [assignment.teacher_user_id]);
              const schoolResult = await pool.query('SELECT id FROM schools WHERE school_code = $1', [assignment.school_code]);
              
              if (teacherResult.rows.length === 0) {
                console.log(`Teacher not found: ${assignment.teacher_user_id}`);
                continue;
              }
              
              if (schoolResult.rows.length === 0) {
                console.log(`School not found: ${assignment.school_code}`);
                continue;
              }

              const teacherId = teacherResult.rows[0].id;
              const schoolId = schoolResult.rows[0].id;

              await pool.query(`
                INSERT INTO teacher_assignments (teacher_id, school_id, academic_year, subjects, assigned_classes, is_active)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (teacher_id, school_id, academic_year) DO UPDATE SET
                  subjects = EXCLUDED.subjects,
                  assigned_classes = EXCLUDED.assigned_classes,
                  is_active = EXCLUDED.is_active,
                  updated_at = NOW()
              `, [
                teacherId,
                schoolId,
                assignment.academic_year,
                JSON.stringify(assignment.subjects),
                JSON.stringify(assignment.assigned_classes),
                assignment.is_active
              ]);
            } catch (err) {
              console.error(`Error inserting assignment for ${assignment.teacher_user_id} at ${assignment.school_code}:`, err.message);
            }
          }
          
          console.log('Teacher assignments inserted successfully');
          
          // Show summary
          const teacherCount = await pool.query('SELECT COUNT(*) FROM teachers');
          const assignmentCount = await pool.query('SELECT COUNT(*) FROM teacher_assignments');
          
          console.log(`\nSummary:`);
          console.log(`- Total teachers: ${teacherCount.rows[0].count}`);
          console.log(`- Total assignments: ${assignmentCount.rows[0].count}`);
          
          resolve();
        } catch (error) {
          reject(error);
        }
      })
      .on('error', reject);
  });
}

// Run the script
populateTeachers()
  .then(() => {
    console.log('Teacher population completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error populating teachers:', error);
    process.exit(1);
  });