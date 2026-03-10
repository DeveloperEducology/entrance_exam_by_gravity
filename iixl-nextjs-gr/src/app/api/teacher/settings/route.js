import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import mongoose from 'mongoose';
import { connectMongo } from '@/lib/db/mongo';

export async function POST(req) {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.role !== 'teacher') {
        return NextResponse.json({ error: 'Unauthorized: Teacher access only' }, { status: 403 });
    }

    try {
        const { specialties } = await req.json();

        // Validate specialties input
        if (!Array.isArray(specialties)) {
            return NextResponse.json({ error: 'Invalid input format for specialties.' }, { status: 400 });
        }

        await connectMongo();
        const db = mongoose.connection.db;

        // Update the teacher user record in the Mongo database
        await db.collection('users').updateOne(
            { $or: [{ id: user.id }, { _id: user.id }] },
            { $set: { specialties } }
        );

        return NextResponse.json({ success: true, message: 'Settings saved successfully' });
    } catch (error) {
        console.error('Teacher Settings API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
