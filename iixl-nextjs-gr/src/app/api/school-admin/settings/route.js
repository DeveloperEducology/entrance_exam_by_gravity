import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/db/mongo';
import mongoose from 'mongoose';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(req) {
    try {
        const { announcement } = await req.json();

        const supabase = createServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user || user.role !== 'school_admin' || !user.school_id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const schoolId = String(user.school_id);

        await connectMongo();
        const db = mongoose.connection.db;

        await db.collection('schools').updateOne(
            { _id: new mongoose.Types.ObjectId(schoolId) },
            { $set: { announcement: announcement } }
        );

        return NextResponse.json({ success: true, announcement });
    } catch (e) {
        console.error('Update Settings Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
