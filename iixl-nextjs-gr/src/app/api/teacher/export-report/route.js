import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/db/mongo';
import { createServerClient } from '@/lib/supabase/server';
import mongoose from 'mongoose';

export async function GET(req) {
    try {
        const supabase = createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user || user.role !== 'teacher') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await connectMongo();
        const db = mongoose.connection.db;

        // Fetch students belonging to this teacher
        const students = await db.collection('users').find({ role: 'student', teacher_id: user.id }).toArray();
        const studentIds = students.map(s => String(s.id || s._id));

        if (studentIds.length === 0) {
            return new NextResponse('No students found.', { status: 200, headers: { 'Content-Type': 'text/plain' } });
        }

        // Fetch their attempts and states
        const allAttempts = await db.collection('attempt_events').find({ student_id: { $in: studentIds } }).toArray();
        const skillStates = await db.collection('student_skill_state').find({ student_id: { $in: studentIds } }).toArray();

        // Generate CSV rows
        let csvContent = 'Student Name,Student Email,Total Practices,Skills Mastered,Average Proficiency,Total Time Spent (Minutes)\n';

        students.forEach(s => {
            const sid = String(s.id || s._id);
            const sAttempts = allAttempts.filter(a => String(a.student_id) === sid);
            const sStates = skillStates.filter(st => String(st.student_id) === sid);

            const totalPractices = sAttempts.length;
            const mastered = sStates.filter(st => st.status === 'mastered' || st.status === 'proficient').length;
            const avgProficiency = sStates.length > 0
                ? Math.round((sStates.reduce((acc, st) => acc + (st.mastery_score || 0), 0) / sStates.length) * 100)
                : 0;
            const totalMs = sAttempts.reduce((acc, a) => acc + Number(a.response_ms || 0), 0);
            const timeMins = Math.round(totalMs / 60000);

            // Escape commas in names
            const safeName = `"${(s.name || '').replace(/"/g, '""')}"`;

            csvContent += `${safeName},${s.email},${totalPractices},${mastered},${avgProficiency}%,${timeMins}\n`;
        });

        // Return CSV file
        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="Class_Report_${new Date().toISOString().split('T')[0]}.csv"`
            }
        });
    } catch (error) {
        console.error('Export report error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
