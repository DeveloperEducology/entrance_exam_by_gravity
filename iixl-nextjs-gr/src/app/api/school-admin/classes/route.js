import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/db/mongo';
import mongoose from 'mongoose';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(req) {
    try {
        const { name, teacher_id } = await req.json();

        if (!name || !teacher_id) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await connectMongo();
        const db = mongoose.connection.db;

        const supabase = createServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user || user.role !== 'school_admin' || !user.school_id) {
            return NextResponse.json({ error: 'Unauthorized. Only logged-in School Admins can create Classes.' }, { status: 403 });
        }

        const schoolId = String(user.school_id);

        // Verify teacher exists AND belongs to the same school
        const teacher = await db.collection('users').findOne({
            _id: new mongoose.Types.ObjectId(teacher_id),
            role: 'teacher',
            school_id: schoolId
        });

        if (!teacher) {
            return NextResponse.json({ error: 'Valid Teacher ID within your school is required' }, { status: 400 });
        }

        // Insert new class into classes collection
        const result = await db.collection('classes').insertOne({
            name: name.trim(),
            teacher_id: teacher_id,
            school_id: schoolId,
            student_ids: [],
            created_at: new Date()
        });

        return NextResponse.json({
            id: result.insertedId.toString(),
            name: name.trim(),
            teacher_id: teacher_id,
            teacherName: teacher.name,
            studentCount: 0
        });

    } catch (e) {
        console.error('Class Creation Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
