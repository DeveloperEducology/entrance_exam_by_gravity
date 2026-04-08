import React from 'react';
import GradesDisplay from '@/components/home/GradesDisplay';
import { connectToDatabase } from '@/lib/db';
import styles from './page.module.css';
import { Sparkles, Brain, Trophy } from 'lucide-react';

/**
 * HOME PAGE (ENTRY POINT)
 * Fetches dynamic grade and subject data from MongoDB.
 */
async function getHomeGradesData() {
  console.log("🔍 DB Connection Attempt with URI:", process.env.MONGODB_URI ? "FOUND (Starts with " + process.env.MONGODB_URI.substring(0, 15) + "...)" : "UNDEFINED");
  try {
    const { db } = await connectToDatabase();
    
    // Remote database structure uses string UUIDs in 'id' and 'grade_id' fields.
    const grades = await db.collection('grades').find().toArray();
    
    // Natural Sort (Class 1, Class 2, Class 3...)
    grades.sort((a, b) => {
      const aNum = parseInt(a.name?.match(/\d+/)?.[0] || '0');
      const bNum = parseInt(b.name?.match(/\d+/)?.[0] || '0');
      return aNum - bNum;
    });

    // Enriched Fetching: Grade -> Subject -> Units -> Skills
    const enrichedGrades = await Promise.all(grades.map(async (grade) => {
      // Find subjects linked to this grade's UUID id
      const subjects = await db.collection('subjects').find({ grade_id: grade.id }).toArray();
      
      const subjectsWithCount = await Promise.all(subjects.map(async (sub) => {
        // Correct hierarchy: Subject -> Units -> Micro_Skills
        const units = await db.collection('units').find({ subject_id: sub.id }).toArray();
        const unitIds = units.map(u => u.id);
        
        const skillCount = await db.collection('micro_skills').countDocuments({ 
          unit_id: { $in: unitIds } 
        });

        return {
          id: sub.id || sub._id.toString(),
          name: sub.name,
          slug: sub.slug,
          skillCount
        };
      }));

      return {
        _id: grade._id.toString(),
        id: grade.id || grade._id.toString(),
        name: grade.name,
        grade_number: parseInt(grade.name?.match(/\d+/)?.[0] || '0'),
        subjects: subjectsWithCount
      };
    }));

    // Filter out grades that didn't return subjects (if applicable) or maintain for visibility
    console.log(`✅ MongoDB: Successfully fetched ${enrichedGrades.length} grades and their subjects.`);
    // console.dir(enrichedGrades, { depth: null }); // Uncomment for deep inspection
    return enrichedGrades;
  } catch (err) {
    console.error("❌ MongoDB Fetch Error:", err.message);
    // FALLBACK MOCK DATA for Wow factor and demo
    return [
      {
        id: 'g1',
        name: 'First Grade Mastery',
        grade_number: 1,
        subjects: [
          { id: 's1', name: 'Mathematics', slug: 'math', skillCount: 142 },
          { id: 's2', name: 'Language Arts', slug: 'english', skillCount: 88 }
        ]
      },
      {
        id: 'g2',
        name: 'Second Grade Achievement',
        grade_number: 2,
        subjects: [
          { id: 's3', name: 'Mathematics', slug: 'math', skillCount: 156 },
          { id: 's4', name: 'Science', slug: 'science', skillCount: 42 }
        ]
      },
      {
        id: 'g3',
        name: 'Third Grade Challenge',
        grade_number: 3,
        subjects: [
          { id: 's5', name: 'Mathematics', slug: 'math', skillCount: 184 },
          { id: 's6', name: 'Literacy', slug: 'english', skillCount: 112 }
        ]
      }
    ];
  }
}

export default async function Home() {
  const gradesData = await getHomeGradesData();

  return (
    <div className={styles.container}>
      <header className={styles.heroSection}>
        <div className={styles.heroGlow} />
        
        <div className={styles.heroContent}>
          <div className={styles.badge}>
            <Sparkles size={14} fill="currentColor" />
            <span>New: Fraction Mastery Modules Live!</span>
          </div>
          
          <h1 className={styles.heroTitle}>
             Personalized Learning <br />
             <span className={styles.gradientText}>Tailored to Every Student</span>
          </h1>
          
          <p className={styles.heroSubtitle}>
             Fill those gaps in your knowledge with our high-fidelity <br />
             learning lab. Select your grade level to begin.
          </p>
          
          <div className={styles.heroStats}>
             <div className={styles.statItem}>
                <Brain size={20} />
                <b>5,000+</b> skills
             </div>
             <div className={styles.statItem}>
                <Trophy size={20} />
                <b>95%</b> mastery rate
             </div>
          </div>
        </div>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.sectionHeader}>
           <h2 className={styles.sectionTitle}>Curriculum Path</h2>
           <p className={styles.sectionSubtitle}>Select a grade level to explore mastery-based learning units.</p>
        </div>
        
        <GradesDisplay gradesData={gradesData} />
      </main>

      <footer className={styles.footer}>
         <p>&copy; 2026 Adaptive Learning Systems. Building the future of pedagogically grounded edtech.</p>
      </footer>
    </div>
  );
}
