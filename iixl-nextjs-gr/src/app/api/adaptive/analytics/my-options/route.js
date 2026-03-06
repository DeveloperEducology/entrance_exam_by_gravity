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

    // Secure the request: prioritize authenticated user ID. Guest ID is only for unauthenticated users.
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

        // Fetch all microskills
        const microskills = await db.collection('microskills').find({}).sort({ sort_order: 1 }).limit(500).toArray();

        const [attempts, logs, skillStates] = await Promise.all([
            db.collection('attempt_events')
                .find({ student_id: studentId })
                .sort({ created_at: -1 })
                .limit(1000)
                .toArray(),
            db.collection('student_question_log')
                .find({ student_id: studentId })
                .sort({ created_at: -1 })
                .limit(1000)
                .toArray(),
            db.collection('student_skill_state').find({ student_id: studentId }).toArray(),
        ]);

        const skillUseMap = new Map();
        attempts.forEach(row => {
            const id = String(row.micro_skill_id);
            skillUseMap.set(id, (skillUseMap.get(id) || 0) + 1);
        });
        logs.forEach(row => {
            const id = String(row.microskill_id || row.micro_skill_id);
            skillUseMap.set(id, (skillUseMap.get(id) || 0) + 1);
        });

        const statesMap = new Map((skillStates || []).map(s => [String(s.micro_skill_id), s]));
        const microskillsMap = new Map(microskills.map(m => [String(m.id), m]));

        const recentSkills = Array.from(skillUseMap.keys())
            .map(id => {
                const skill = microskillsMap.get(id);
                const state = statesMap.get(id);
                if (!skill) return null;
                return {
                    id,
                    name: skill.name,
                    code: skill.code,
                    score: Math.round((state?.mastery_score || 0) * 100),
                    progress: Math.round((state?.mastery_score || 0) * 100),
                    usageCount: skillUseMap.get(id)
                };
            })
            .filter(Boolean)
            .sort((a, b) => b.usageCount - a.usageCount)
            .slice(0, 5);

        // Recommendations
        const levels = ['Level D', 'Level E', 'Level F', 'Level G'];
        const rewards = ['⚡', '⭐', '🔥', '🎯'];
        const recommendedSkills = microskills
            .map((skill, idx) => {
                const state = statesMap.get(String(skill.id));
                if (state?.status === 'proficient' || state?.status === 'mastered') return null;
                return {
                    id: String(skill.id),
                    name: skill.name,
                    code: skill.code,
                    level: levels[idx % levels.length],
                    reward: rewards[idx % rewards.length],
                    icon: rewards[idx % rewards.length],
                    isStarted: !!state
                };
            })
            .filter(Boolean)
            .sort((a, b) => (a.isStarted === b.isStarted ? 0 : a.isStarted ? -1 : 1))
            .slice(0, 3);

        const troubleSkills = Array.from(skillUseMap.keys())
            .map(id => {
                const skill = microskillsMap.get(id);
                const state = statesMap.get(id);
                const errorCount = attempts.filter(a => String(a.micro_skill_id) === id && !a.is_correct).length;
                if (errorCount < 2 || !skill) return null;
                return {
                    id,
                    name: skill.name,
                    errorCount,
                    score: Math.round((state?.mastery_score || 0) * 100)
                };
            })
            .filter(Boolean);

        return NextResponse.json({
            microSkillOptions: recentSkills,
            recentSkills,
            recommendedSkills,
            troubleSkills
        });
    } catch (err) {
        console.error('Options API error:', err);
        return NextResponse.json({ error: err.message || 'Failed to fetch options.' }, { status: 500 });
    }
}
