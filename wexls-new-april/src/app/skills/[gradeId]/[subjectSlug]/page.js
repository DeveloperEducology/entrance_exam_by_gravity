import React from 'react';
import { connectToDatabase } from '@/lib/db';
import styles from '../../skills.module.css';
import { Calculator, BookOpen, Globe, Lightbulb, Star, Award, Zap, ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';

/**
 * SKILLS EXPLORATION PAGE
 * 3-Column layout with Subject Sidebar and Unit grouping.
 */
async function getSkillsPageData(gradeId, subjectSlug) {
  try {
    const { db } = await connectToDatabase();
    const { ObjectId } = require('mongodb');
    
    // Find grade (try UUID id first, then Mongo _id)
    let grade = await db.collection('grades').findOne({ id: gradeId });
    if (!grade && ObjectId.isValid(gradeId)) {
      grade = await db.collection('grades').findOne({ _id: new ObjectId(gradeId) });
    }
    
    if (!grade) throw new Error("Grade not found");

    // Find subject (linked to grade's UUID id if present, else fallback)
    const matchId = grade.id || grade._id.toString();
    const subject = await db.collection('subjects').findOne({ 
      grade_id: matchId, 
      slug: subjectSlug 
    });
    
    if (!subject) throw new Error("Subject not found");

    // Units (linked via subject_id: UUID)
    const units = await db.collection('units').find({ subject_id: subject.id }).sort({ order: 1 }).toArray();
    
    const enrichedUnits = await Promise.all(units.map(async (unit) => {
      const skills = await db.collection('micro_skills').find({ unit_id: unit.id }).sort({ sort_order: 1 }).toArray();
      return {
        ...unit,
        skills: skills.map(sk => ({
           ...sk,
           id: sk.id || sk._id.toString()
        }))
      };
    }));

    const otherSubjects = await db.collection('subjects').find({ grade_id: matchId }).toArray();
    return { grade, subject, units: enrichedUnits, otherSubjects };
  } catch (err) {
    console.warn("DB Fetch Error for skills:", err.message);
    // FALLBACK MOCK DATA
    return {
      grade: { name: 'Grade 3', id: 'g3' },
      subject: { name: 'Mathematics', slug: 'math', badge: 'MASTERED 85%' },
      otherSubjects: [
        { name: 'Mathematics', slug: 'math' },
        { name: 'Language Arts', slug: 'english' },
        { name: 'Science', slug: 'science' },
        { name: 'Social Studies', slug: 'social' }
      ],
      units: [
        {
          id: 'u1', name: 'NBT: Whole Numbers', order: 1, 
          skills: [
            { id: 's1', code: 'A.1', name: 'Rounding to the nearest 10' },
            { id: 's2', code: 'A.2', name: 'Identity property of addition' },
            { id: 's3', code: 'A.5', name: 'Estimate sums up to 1,000' }
          ]
        },
        {
          id: 'u2', name: 'FRA: Fraction Foundations', order: 2, 
          skills: [
            { id: 's4', code: 'F.1', name: 'Identify halves, thirds, and fourths' },
            { id: 's5', code: 'F.2', name: 'Understand unit fractions' },
            { id: 's6', code: 'F.3', name: 'Compare fractions with same denominator' }
          ]
        },
        {
          id: 'u3', name: 'GEO: Geometric Measurement', order: 3, 
          skills: [
            { id: 's7', code: 'G.1', name: 'Calculate area of rectangles' },
            { id: 's8', code: 'G.2', name: 'Understand perimeter' },
            { id: 's9', code: 'G.4', name: 'Classify 2D shapes by angles' }
          ]
        }
      ]
    }
  }
}

export default async function SkillsPage({ params }) {
  const { gradeId, subjectSlug } = await params;
  const { grade, subject, units, otherSubjects } = await getSkillsPageData(gradeId, subjectSlug);

  return (
    <div className={styles.skillsContainer}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.sidebarIcon} title="Home"><Home size={28} /></Link>
        <div className={styles.sidebarDivider} />
        {otherSubjects.map(sub => (
          <Link 
            key={sub.slug} 
            href={`/skills/${gradeId}/${sub.slug}`}
            className={`${styles.sidebarIcon} ${sub.slug === subjectSlug ? styles.activeIcon : ''}`}
            title={sub.name}
          >
             <SubjectSidebarIcon name={sub.name} size={28} />
          </Link>
        ))}
      </aside>

      <main className={styles.mainLayout}>
        <header className={styles.header}>
           <div className={styles.pageHeader}>
              <span className={styles.badge}>PROFICIENCY {subject.badge || '74%'}</span>
              <p className={styles.headerSubtitle}>{grade.name} Curriculum</p>
           </div>
           <h1 className={styles.headerTitle}>{subject.name} Mastery</h1>
        </header>

        <section className={styles.unitGrid}>
          {units.map((unit, idx) => (
            <div key={unit.id || idx} className={styles.unitCard}>
               <h3 className={styles.unitTitle}>
                  <span className={styles.unitNumber}>UNIT {unit.order}</span>
                  {unit.name}
               </h3>
               <div className={styles.skillList}>
                  {unit.skills.map(skill => (
                    <Link 
                      key={skill.id} 
                      href={`/practice/${skill.id}`} 
                      className={styles.skillNode}
                    >
                       <span className={styles.skillCode}>{skill.code}</span>
                       <span className={styles.skillName}>{skill.name}</span>
                       <ChevronRight size={14} className={styles.skillArrow} />
                    </Link>
                  ))}
               </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

function SubjectSidebarIcon({ name, size }) {
  if (name.includes('Math')) return <Calculator size={size} />;
  if (name.includes('English') || name.includes('Literacy')) return <BookOpen size={size} />;
  if (name.includes('Science')) return <Globe size={size} />;
  if (name.includes('Social')) return <Lightbulb size={size} />;
  return <Star size={size} />;
}
