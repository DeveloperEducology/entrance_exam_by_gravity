import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(req) {
    const supabase = createServerClient();
    if (!supabase) {
        return NextResponse.json({ error: 'Supabase is not configured on server.' }, { status: 500 });
    }

    let payload;
    try {
        payload = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();

    // Secure the request: If a user is logged in, use their ID. Guest ID only as fallback for unauthenticated.
    const studentId = user?.id
        ? String(user.id)
        : (payload?.studentId ? String(payload.studentId).trim() : '');

    if (!studentId) {
        return NextResponse.json({ error: 'studentId is required or you must be logged in.' }, { status: 400 });
    }

    try {
        const { connectMongo } = require('@/lib/db/mongo');
        const mongoose = require('mongoose');
        await connectMongo();
        const db = mongoose.connection.db;

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

        const [attempts, logs, skillStates] = await Promise.all([
            db.collection('attempt_events').find({ student_id: studentId }).toArray(),
            db.collection('student_question_log').find({ student_id: studentId }).toArray(),
            db.collection('student_skill_state').find({ student_id: studentId }).toArray(),
        ]);

        let totalMs = 0;
        let todayMs = 0;
        let totalQuestions = 0;
        let todayQuestions = 0;
        const startedSkills = new Set();

        attempts.forEach(row => {
            const ms = Number(row.response_ms || 0);
            totalMs += ms;
            totalQuestions += 1;
            startedSkills.add(String(row.micro_skill_id));
            if (row.created_at >= startOfToday) {
                todayMs += ms;
                todayQuestions += 1;
            }
        });

        logs.forEach(row => {
            const ms = Number(row.response_ms || 0);
            totalMs += ms;
            totalQuestions += 1;
            startedSkills.add(String(row.microskill_id || row.micro_skill_id));
            if (row.created_at >= startOfToday) {
                todayMs += ms;
                todayQuestions += 1;
            }
        });

        const masteredCount = (skillStates || []).filter(s => s.status === 'proficient' || s.status === 'mastered').length;

        // Trouble Spots calculation
        const troubleMap = new Map();
        attempts.forEach(a => {
            if (!a.is_correct) {
                const sid = String(a.micro_skill_id);
                troubleMap.set(sid, (troubleMap.get(sid) || 0) + 1);
            }
        });
        const troubleSpotsCount = Array.from(troubleMap.values()).filter(count => count >= 3).length;

        // Simple streak calculation: count consecutive days with at least 1 attempt
        const daysWithActivity = new Set(attempts.map(a => a.created_at ? a.created_at.split('T')[0] : null).filter(Boolean));
        let streak = 0;
        let d = new Date();
        while (daysWithActivity.has(d.toISOString().split('T')[0])) {
            streak++;
            d.setDate(d.getDate() - 1);
            if (streak > 365) break;
        }

        // Average score
        const masteryScores = (skillStates || []).map(s => Number(s.mastery_score || 0));
        const avgScore = masteryScores.length > 0
            ? Math.round((masteryScores.reduce((a, b) => a + b, 0) / masteryScores.length) * 100)
            : 0;

        return NextResponse.json({
            totalHours: Number((totalMs / 3600000).toFixed(2)),
            totalMinutes: Math.round(totalMs / 60000),
            todayMinutes: Math.round(todayMs / 60000),
            totalQuestions,
            todayQuestions,
            skillsStarted: startedSkills.size,
            skillsMastered: masteredCount,
            troubleSpotsCount,
            streak,
            avgScore,
            userName: user?.user_metadata?.name || user?.email?.split('@')[0] || 'Learner'
        });
    } catch (err) {
        console.error('Summary API error:', err);
        return NextResponse.json({ error: err.message || 'Failed to fetch summary.' }, { status: 500 });
    }
}
