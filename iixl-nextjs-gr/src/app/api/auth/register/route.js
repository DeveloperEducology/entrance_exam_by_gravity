import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/db/mongo';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_not_for_prod';

export async function POST(req) {
    try {
        const { email, password, name, birthYear, gradeId, role } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        await connectMongo();
        const db = mongoose.connection.db;

        // Check if user exists
        const existingUser = await db.collection('users').findOne({ email: email.trim().toLowerCase() });
        if (existingUser) {
            return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const now = new Date().toISOString();

        // UUID v4 format generator
        const uuid = crypto.randomUUID();

        const chosenRole = role === 'teacher' ? 'teacher' : 'student';

        const newUser = {
            _id: uuid,  // Using UUID for ID to match existing Supabase id shape
            id: uuid,
            email: email.trim().toLowerCase(),
            password_hash: passwordHash,
            name: name || email.split('@')[0],
            role: chosenRole,
            status: chosenRole === 'teacher' ? 'pending' : 'active',
            birth_year: birthYear || null,
            grade_id: gradeId || null,
            created_at: now,
            updated_at: now
        };

        await db.collection('users').insertOne(newUser);

        const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });

        const response = NextResponse.json({
            user: {
                id: newUser.id,
                email: newUser.email,
                role: chosenRole,
                status: newUser.status,
                user_metadata: {
                    name: newUser.name,
                    birthYear: newUser.birth_year,
                    gradeId: newUser.grade_id
                }
            }
        });

        // Set HttpOnly session cookie
        response.cookies.set('wexls_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 // 7 days
        });

        return response;
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
