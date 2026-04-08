"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Calculator, Globe, Star, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import styles from './GradesDisplay.module.css';

/**
 * PREMIUM GRADE SELECTION DISPLAY
 * Renders interactive cards for each grade with subject quick-links.
 */
export default function GradesDisplay({ gradesData }) {
  console.log("💎 Grades Display Received Data:", gradesData);
  if (!gradesData || gradesData.length === 0) return <div>No grades available</div>;

  return (
    <div className={styles.grid}>
      {gradesData.map((grade, idx) => (
        <motion.div
          key={grade._id || grade.id || idx}
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: idx * 0.1, duration: 0.5, ease: "easeOut" }}
          className={styles.gradeCard}
        >
          <div className={styles.gradeHeader}>
             <div className={styles.gradeBadge}>Grade {grade.grade_number}</div>
             <h3 className={styles.gradeTitle}>{grade.name}</h3>
          </div>
          
          <div className={styles.subjectList}>
            {grade.subjects.map(subject => (
              <Link 
                key={subject.slug} 
                href={`/skills/${grade.id}/${subject.slug}`} 
                className={styles.subjectItem}
              >
                <div className={styles.subjectInfo}>
                  <SubjectIcon name={subject.name} size={18} />
                  <span>{subject.name}</span>
                </div>
                <div className={styles.skillCount}>
                  <b>{subject.skillCount}</b> skills
                   <ChevronRight size={14} />
                </div>
              </Link>
            ))}
          </div>

          <motion.div 
             className={styles.cardGlow}
             whileHover={{ opacity: 0.1 }}
             initial={{ opacity: 0 }}
          />
        </motion.div>
      ))}
    </div>
  );
}

function SubjectIcon({ name, size }) {
  if (name.includes('Math')) return <Calculator size={size} />;
  if (name.includes('English') || name.includes('Literacy')) return <BookOpen size={size} />;
  if (name.includes('Science')) return <Globe size={size} />;
  return <Star size={size} />;
}
