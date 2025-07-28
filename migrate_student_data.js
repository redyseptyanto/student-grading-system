const { Pool, neonConfig } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const ws = require("ws");

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function migrateStudentData() {
  console.log('Starting student data migration...');
  
  try {
    // First, check if the new tables exist, if not the push hasn't happened yet
    console.log('Checking existing student data...');
    
    // Get all existing students with their current data
    const existingStudents = await db.execute(`
      SELECT 
        id, nsp, nis, full_name, nickname, gender, school_code, 
        academic_year, class_id, group_id, status, no_absence,
        sakit, izin, alpa, tinggi_badan, berat_badan,
        parent_id, school_id, grades, date_of_birth, 
        parent_contact, address, is_active, created_at, updated_at
      FROM students 
      WHERE academic_year IS NOT NULL
    `);
    
    console.log(`Found ${existingStudents.rows.length} students with academic year data`);
    
    // Create the new tables first (manually to avoid conflicts)
    console.log('Creating new tables...');
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS student_enrollments (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        academic_year VARCHAR NOT NULL,
        class_id INTEGER REFERENCES classes(id),
        group_id INTEGER REFERENCES student_groups(id) ON DELETE SET NULL,
        school_code VARCHAR,
        status VARCHAR DEFAULT 'active',
        sakit INTEGER DEFAULT 0,
        izin INTEGER DEFAULT 0,
        alpa INTEGER DEFAULT 0,
        no_absence INTEGER DEFAULT 0,
        tinggi_badan NUMERIC DEFAULT '0',
        berat_badan NUMERIC DEFAULT '0',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await db.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS unique_student_academic_year 
      ON student_enrollments(student_id, academic_year)
    `);
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS student_grades (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        enrollment_id INTEGER NOT NULL REFERENCES student_enrollments(id) ON DELETE CASCADE,
        academic_year VARCHAR NOT NULL,
        term VARCHAR NOT NULL,
        aspect VARCHAR NOT NULL,
        grades JSONB NOT NULL,
        final_grade INTEGER,
        teacher_id VARCHAR NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await db.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS unique_student_year_term_aspect 
      ON student_grades(student_id, academic_year, term, aspect)
    `);
    
    console.log('New tables created successfully');
    
    // Migration logic
    for (const student of existingStudents.rows) {
      console.log(`Migrating student: ${student.full_name} (ID: ${student.id})`);
      
      // 1. Create enrollment record
      const enrollmentResult = await db.execute(`
        INSERT INTO student_enrollments (
          student_id, school_id, academic_year, class_id, group_id, 
          school_code, status, sakit, izin, alpa, no_absence,
          tinggi_badan, berat_badan, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (student_id, academic_year) DO NOTHING
        RETURNING id
      `, [
        student.id, student.school_id, student.academic_year, 
        student.class_id, student.group_id, student.school_code, 
        student.status || 'active', student.sakit || 0, student.izin || 0, 
        student.alpa || 0, student.no_absence || 0, student.tinggi_badan || '0', 
        student.berat_badan || '0', student.is_active, student.created_at, student.updated_at
      ]);
      
      // 2. Get enrollment ID
      let enrollmentId;
      if (enrollmentResult.rows.length > 0) {
        enrollmentId = enrollmentResult.rows[0].id;
      } else {
        // Get existing enrollment ID
        const existingEnrollment = await db.execute(`
          SELECT id FROM student_enrollments 
          WHERE student_id = $1 AND academic_year = $2
        `, [student.id, student.academic_year]);
        enrollmentId = existingEnrollment.rows[0]?.id;
      }
      
      // 3. Migrate grades if they exist
      if (student.grades && enrollmentId) {
        const grades = JSON.parse(student.grades);
        
        for (const [aspect, gradeArray] of Object.entries(grades)) {
          if (Array.isArray(gradeArray) && gradeArray.length > 0) {
            console.log(`  Migrating grades for aspect: ${aspect}`);
            
            await db.execute(`
              INSERT INTO student_grades (
                student_id, enrollment_id, academic_year, term, aspect, 
                grades, final_grade, teacher_id, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              ON CONFLICT (student_id, academic_year, term, aspect) DO NOTHING
            `, [
              student.id, enrollmentId, student.academic_year, 'Term 1',
              aspect, JSON.stringify(gradeArray), 
              Math.max(...gradeArray), // Use max as final grade for now
              'migration_placeholder', // Will need to be updated with actual teacher
              student.created_at, student.updated_at
            ]);
          }
        }
      }
    }
    
    console.log('Migration completed successfully!');
    console.log('You can now run "npm run db:push" to apply the schema changes.');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrateStudentData().catch(console.error);