import fs from 'fs';
import csv from 'csv-parser';

// Generate SQL statements from CSV
async function generateTeacherSQL() {
  const teachers = new Map();
  const assignments = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream('./attached_assets/teachers_1753440457573.csv')
      .pipe(csv())
      .on('data', (row) => {
        // Skip rows with empty school_code or user_id
        if (!row.school_code || !row.user_id) {
          return;
        }

        // Store unique teachers
        if (!teachers.has(row.user_id)) {
          teachers.set(row.user_id, {
            user_id: row.user_id,
            full_name: row.full_name.replace(/'/g, "''"), // Escape single quotes
            email: row.email,
          });
        }

        // Store assignments
        assignments.push({
          user_id: row.user_id,
          school_code: row.school_code,
          academic_year: row.academic_year,
        });
      })
      .on('end', () => {
        console.log('-- INSERT TEACHERS');
        console.log('-- ================');
        
        for (const teacher of teachers.values()) {
          console.log(`INSERT INTO teachers (user_id, full_name, email, is_active) VALUES ('${teacher.user_id}', '${teacher.full_name}', '${teacher.email}', true) ON CONFLICT (user_id) DO NOTHING;`);
        }

        console.log('\n-- INSERT TEACHER ASSIGNMENTS');
        console.log('-- ============================');
        
        for (const assignment of assignments) {
          console.log(`INSERT INTO teacher_assignments (teacher_id, school_id, academic_year, is_active) 
SELECT t.id, s.id, '${assignment.academic_year}', true 
FROM teachers t, schools s 
WHERE t.user_id = '${assignment.user_id}' AND s.school_code = '${assignment.school_code}'
ON CONFLICT (teacher_id, school_id, academic_year) DO NOTHING;`);
        }

        console.log(`\n-- Summary: ${teachers.size} teachers, ${assignments.length} assignments`);
        resolve();
      })
      .on('error', reject);
  });
}

generateTeacherSQL().catch(console.error);