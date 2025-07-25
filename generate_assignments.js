import fs from 'fs';
import csv from 'csv-parser';

// Generate teacher assignment SQL from CSV
async function generateAssignmentSQL() {
  const assignments = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream('./attached_assets/teachers_1753440457573.csv')
      .pipe(csv())
      .on('data', (row) => {
        // Skip rows with empty school_code or user_id
        if (!row.school_code || !row.user_id) {
          return;
        }

        assignments.push({
          user_id: row.user_id,
          school_code: row.school_code,
          academic_year: row.academic_year,
        });
      })
      .on('end', () => {
        console.log('-- Teacher Assignments from CSV');
        console.log('-- Generated from teachers_1753440457573.csv');
        console.log('-- Total assignments:', assignments.length);
        console.log('');
        
        // Split into batches of 100 for manageable SQL statements
        for (let i = 0; i < assignments.length; i += 100) {
          const batch = assignments.slice(i, i + 100);
          
          console.log(`-- Batch ${Math.floor(i/100) + 1} (${batch.length} assignments)`);
          console.log('INSERT INTO teacher_assignments (teacher_id, school_id, academic_year, subjects, assigned_classes, is_active)');
          console.log('SELECT t.id, s.id, assignment_data.academic_year, \'[]\'::jsonb, \'[]\'::jsonb, true');
          console.log('FROM (VALUES');
          
          batch.forEach((assignment, index) => {
            const comma = index === batch.length - 1 ? '' : ',';
            console.log(`  ('${assignment.user_id}', '${assignment.school_code}', '${assignment.academic_year}')${comma}`);
          });
          
          console.log(') AS assignment_data(user_id, school_code, academic_year)');
          console.log('JOIN teachers t ON t.user_id = assignment_data.user_id');
          console.log('JOIN schools s ON s.school_code = assignment_data.school_code');
          console.log('ON CONFLICT (teacher_id, school_id, academic_year) DO NOTHING;');
          console.log('');
        }
        
        resolve();
      })
      .on('error', reject);
  });
}

generateAssignmentSQL().catch(console.error);