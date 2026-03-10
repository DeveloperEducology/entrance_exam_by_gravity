import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/db/mongo';
import mongoose from 'mongoose';

export async function GET() {
    try {
        await connectMongo();
        const db = mongoose.connection.db;

        const teachers = await db.collection('users')
            .find({ role: 'teacher' })
            .project({ password_hash: 0 })
            .sort({ created_at: -1 })
            .toArray();

        return NextResponse.json({ teachers });
    } catch (error) {
        console.error('Error fetching teachers:', error);
        return NextResponse.json({ error: 'Failed to fetch teachers' }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        const { id, status } = await req.json();

        if (!id || !status) {
            return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
        }

        await connectMongo();
        const db = mongoose.connection.db;

        const result = await db.collection('users').updateOne(
            { id },
            { $set: { status, updated_at: new Date().toISOString() } }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, status });
    } catch (error) {
        console.error('Error updating teacher status:', error);
        return NextResponse.json({ error: 'Failed to update teacher' }, { status: 500 });
    }
}
