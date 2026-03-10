import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import mongoose from 'mongoose';
import { connectMongo } from '@/lib/db/mongo';

export async function GET(req) {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.role !== 'teacher') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        await connectMongo();
        const db = mongoose.connection.db;

        // 1. Fetch Students assigned to this teacher
        const students = await db.collection('users').find({ role: 'student', teacher_id: user.id }).toArray();
        if (students.length === 0) {
            return NextResponse.json({ liveData: [] });
        }
        const studentIds = students.map(s => String(s.id || s._id));

        // 2. Look at last 60 minutes of events
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

        // 3. Aggregate recent attempts grouping by student ID
        const recentEvents = await db.collection('attempt_events').aggregate([
            { $match: { student_id: { $in: studentIds }, created_at: { $gte: oneHourAgo } } },
            { $sort: { created_at: -1 } },
            {
                $group: {
                    _id: "$student_id",
                    lastAttemptTime: { $first: "$created_at" },
                    recentAttempts: { $push: { is_correct: "$is_correct", micro_skill_id: { $ifNull: ["$micro_skill_id", "$microskill_id"] } } }
                }
            }
        ]).toArray();

        // 4. Also fetch Microskills for friendly names
        const microSkills = await db.collection('micro_skills').find({}).toArray();
        const microSkillsMap = new Map();
        microSkills.forEach(ms => {
            microSkillsMap.set(String(ms.id || ms._id), ms.name);
        });

        const liveData = students.map(s => {
            const sid = String(s.id || s._id);
            const events = recentEvents.find(e => String(e._id) === sid);

            let status = 'offline';
            let alert = null;
            let currentSkill = 'None';
            let last3Raw = [];

            if (events && events.lastAttemptTime) {
                if (events.lastAttemptTime >= fiveMinsAgo) status = 'active';
                else if (events.lastAttemptTime >= fifteenMinsAgo) status = 'idle';

                // Evaluate recent attempts
                const recentList = events.recentAttempts || [];
                // take last 3 chronological (which are at the start due to sort -1)
                last3Raw = recentList.slice(0, 3).map(a => a.is_correct);

                if (recentList.length > 0) {
                    const skillId = String(recentList[0].micro_skill_id);
                    currentSkill = microSkillsMap.get(skillId) || skillId;
                }

                if (last3Raw.length >= 3 && last3Raw.every(c => c === false)) {
                    alert = 'needs-help';
                }
            }

            return {
                id: sid,
                name: s.name,
                avatar: s.name[0],
                status,
                alert,
                currentSkill,
                recentHistory: last3Raw,
                attemptsCount: events?.recentAttempts?.length || 0,
                score: events?.recentAttempts?.length ? Math.round((events.recentAttempts.filter(r => r.is_correct).length / events.recentAttempts.length) * 100) : 0,
                classGroup: s.class_group || 'Unassigned'
            };
        });

        // Filter out completely offline ones if you want, or just return all to populate the grid
        return NextResponse.json({ liveData });

    } catch (error) {
        console.error('Teacher Live Classroom API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
