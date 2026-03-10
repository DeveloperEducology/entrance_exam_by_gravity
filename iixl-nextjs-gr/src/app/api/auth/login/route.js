import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/db/mongo';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_not_for_prod';

export async function POST(req) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        await connectMongo();
        const db = mongoose.connection.db;

        const user = await db.collection('users').findOne({ email: email.trim().toLowerCase() });

        if (!user || !user.password_hash) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        if (user.role === 'teacher' && user.status === 'pending') {
            return NextResponse.json({ error: 'Your teacher account is pending admin approval.' }, { status: 403 });
        }

        const userId = String(user.id || user._id);
        const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

        const response = NextResponse.json({
            user: {
                id: userId,
                email: user.email,
                role: user.role || 'student',
                status: user.status || 'active',
                user_metadata: {
                    name: user.name,
                    birthYear: user.birth_year,
                    gradeId: user.grade_id
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
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
