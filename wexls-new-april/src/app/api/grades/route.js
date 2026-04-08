import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';

/**
 * CLIENT-ACCESS API: Fetch Grades
 * Allows retrieval of the grade hierarchy from the browser or external tools.
 */
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    
    const grades = await db.collection('grades').find().toArray();
    
    // Natural Sort (Class 1, Class 2, Class 3...)
    grades.sort((a, b) => {
      const aNum = parseInt(a.name?.match(/\d+/)?.[0] || '0');
      const bNum = parseInt(b.name?.match(/\d+/)?.[0] || '0');
      return aNum - bNum;
    });

    const enrichedGrades = await Promise.all(grades.map(async (grade) => {
      const subjects = await db.collection('subjects').find({ grade_id: grade.id }).toArray();
      
      const subjectsWithCount = await Promise.all(subjects.map(async (sub) => {
        const units = await db.collection('units').find({ subject_id: sub.id }).toArray();
        const unitIds = units.map(u => u.id);
        const skillCount = await db.collection('micro_skills').countDocuments({ unit_id: { $in: unitIds } });

        return { id: sub.id, name: sub.name, slug: sub.slug, skillCount };
      }));

      return { id: grade.id, name: grade.name, subjects: subjectsWithCount };
    }));

    return NextResponse.json(enrichedGrades);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
