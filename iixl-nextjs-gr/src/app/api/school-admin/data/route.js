import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/db/mongo';
import mongoose from 'mongoose';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    try {
        const supabase = createServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only let super admins (global) or specific school admins see this
        const schoolId = user.role === 'school_admin' ? String(user.school_id) : null;
        if (user.role === 'school_admin' && !schoolId) {
            return NextResponse.json({ error: 'No school assigned to this admin' }, { status: 403 });
        }

        await connectMongo();
        const db = mongoose.connection.db;

        // Apply tenant restrictions to all queries if it's a school_admin
        const tenantFilter = schoolId ? { school_id: String(schoolId) } : {};

        // Fetch the School object for license & announcement logic
        const schoolObj = schoolId ? await db.collection('schools').findOne({ _id: new mongoose.Types.ObjectId(schoolId) }) : {};
        const licenseLimit = schoolObj?.licenseLimit || 500; // default 500
        const announcement = schoolObj?.announcement || '';

        // Fetch School Wide Stats
        const teachersCount = await db.collection('users').countDocuments({ role: 'teacher', ...tenantFilter });
        const studentsCount = await db.collection('users').countDocuments({ role: 'student', ...tenantFilter });
        const classesCount = await db.collection('classes').countDocuments(tenantFilter);

        // Count total questions answered across the whole school
        const pipeline = [
            { $match: { role: 'student', ...tenantFilter } },
            { $group: { _id: null, total: { $sum: { $size: { $ifNull: ["$recentHistory", []] } } } } }
        ];
        const result = await db.collection('users').aggregate(pipeline).toArray();
        const questionsAnswered = result.length > 0 ? result[0].total : 0;

        // Fetch lists for Admin dashboard
        const rawTeachers = await db.collection('users')
            .find({ role: 'teacher', ...tenantFilter })
            .project({ password_hash: 0 })
            .toArray();

        // Calculate class count per teacher (still respecting tenant isolation)
        const classAgg = await db.collection('classes').aggregate([
            { $match: tenantFilter },
            { $group: { _id: "$teacher_id", count: { $sum: 1 } } }
        ]).toArray();

        const countMap = {};
        classAgg.forEach(doc => countMap[doc._id] = doc.count);

        const teachers = rawTeachers.map(t => ({
            id: String(t._id),
            name: t.name,
            email: t.email,
            status: t.status || 'active',
            classCount: countMap[String(t._id)] || 0
        }));

        // Fetch all students to compute class performance and subject mastery (using mock for mastery for now unless we have real subject progress)
        const studentsRaw = await db.collection('users').find({ role: 'student', ...tenantFilter }).toArray();
        const studentQuestionsMap = {};
        studentsRaw.forEach(s => {
            studentQuestionsMap[String(s._id)] = Array.isArray(s.recentHistory) ? s.recentHistory.length : 0;
        });

        // Fetch classes
        const classesRaw = await db.collection('classes').find(tenantFilter).toArray();
        const classes = classesRaw.map(c => {
            const rawTeacherName = teachers.find(t => t.id === String(c.teacher_id))?.name || 'Unassigned';

            let classQuestions = 0;
            if (Array.isArray(c.student_ids)) {
                c.student_ids.forEach(sid => {
                    classQuestions += (studentQuestionsMap[String(sid)] || 0);
                });
            }

            return {
                id: String(c._id),
                name: c.name,
                teacher_id: c.teacher_id,
                teacherName: rawTeacherName,
                studentCount: Array.isArray(c.student_ids) ? c.student_ids.length : 0,
                questionsAnswered: classQuestions
            };
        });

        // Compute performance analytics
        const topClasses = [...classes].sort((a, b) => b.questionsAnswered - a.questionsAnswered).slice(0, 5);

        // Mock Subject Mastery (Eventually derived from student progression models)
        const subjectMastery = [
            { subject: "Mathematics", mastery: 74 },
            { subject: "Language Arts", mastery: 82 },
            { subject: "Science", mastery: 65 },
            { subject: "Social Studies", mastery: 58 }
        ];

        return NextResponse.json({
            stats: { teachersCount, studentsCount, classesCount, questionsAnswered },
            teachers,
            classes,
            performance: {
                topClasses,
                subjectMastery
            },
            schoolSettings: {
                licenseLimit,
                announcement
            }
        });

    } catch (e) {
        console.error('School Admin Data Error:', e);
        return NextResponse.json({ error: 'Failed to load school data' }, { status: 500 });
    }
}
