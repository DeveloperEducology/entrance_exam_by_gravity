import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/db/mongo';
import { createServerClient } from '@/lib/supabase/server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export async function POST(req) {
    try {
        const supabase = createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user || user.role !== 'teacher') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { email, password, name, birthYear, gradeId, classGroup } = await req.json();

        if (!email || !password || !name) {
            return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        await connectMongo();
        const db = mongoose.connection.db;

        const existingUser = await db.collection('users').findOne({ email: email.trim().toLowerCase() });
        if (existingUser) {
            return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const now = new Date().toISOString();
        const uuid = crypto.randomUUID();

        const newUser = {
            _id: uuid,
            id: uuid,
            email: email.trim().toLowerCase(),
            password_hash: passwordHash,
            name: name.trim(),
            role: 'student',
            teacher_id: user.id,
            birth_year: birthYear || null,
            grade_id: gradeId || null,
            class_group: classGroup?.trim() || 'Unassigned',
            created_at: now,
            updated_at: now
        };

        await db.collection('users').insertOne(newUser);

        return NextResponse.json({ success: true, student: { id: newUser.id, name: newUser.name, email: newUser.email, classGroup: newUser.class_group } });
    } catch (error) {
        console.error('Add student error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        const supabase = createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user || user.role !== 'teacher') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { studentId, newPassword } = await req.json();

        if (!studentId || !newPassword || newPassword.length < 6) {
            return NextResponse.json({ error: 'Valid student ID and a password of at least 6 characters are required.' }, { status: 400 });
        }

        await connectMongo();
        const db = mongoose.connection.db;

        // Verify the student belongs to the teacher
        const student = await db.collection('users').findOne({ role: 'student', teacher_id: user.id, $or: [{ id: studentId }, { _id: studentId }] });

        if (!student) {
            return NextResponse.json({ error: 'Student not found or unauthorized.' }, { status: 404 });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        await db.collection('users').updateOne(
            { _id: student._id },
            { $set: { password_hash: passwordHash, updated_at: new Date().toISOString() } }
        );

        return NextResponse.json({ success: true, message: 'Password reset successfully!' });
    } catch (error) {
        console.error('Reset student password error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
