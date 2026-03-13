import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/db/mongo';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(req) {
    try {
        const { name, email, password } = await req.json();

        if (!name || !email || !password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await connectMongo();
        const db = mongoose.connection.db;

        const supabase = createServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user || user.role !== 'school_admin' || !user.school_id) {
            return NextResponse.json({ error: 'Unauthorized. Only logged-in School Admins can create Teachers.' }, { status: 403 });
        }

        const schoolId = String(user.school_id);

        // Check if user already exists
        const existing = await db.collection('users').findOne({ email: email.trim().toLowerCase() });
        if (existing) {
            return NextResponse.json({ error: 'Teacher with this email already exists' }, { status: 400 });
        }

        // Hash password securely
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Insert new Teacher into users collection
        const result = await db.collection('users').insertOne({
            id: new mongoose.Types.ObjectId().toString(),
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password_hash,
            role: 'teacher',
            status: 'active', // Pre-approved by School Admin
            school_id: schoolId,
            created_at: new Date()
        });

        return NextResponse.json({
            id: result.insertedId.toString(),
            name,
            email,
            status: 'active',
            classCount: 0
        });

    } catch (e) {
        console.error('Teacher Creation Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
