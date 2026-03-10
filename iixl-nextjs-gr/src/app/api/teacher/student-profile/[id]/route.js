import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import mongoose from 'mongoose';

import { connectMongo } from '@/lib/db/mongo';

export async function GET(req, { params }) {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.role !== 'teacher') {
        return NextResponse.json({ error: 'Unauthorized: Teacher access only' }, { status: 403 });
    }

    try {
        const url = new URL(req.url);
        const startDate = url.searchParams.get('startDate');
        const endDate = url.searchParams.get('endDate');

        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter.created_at = {};
            if (startDate) dateFilter.created_at.$gte = new Date(startDate).toISOString();
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter.created_at.$lte = end.toISOString();
            }
        }

        const p = await params;
        const studentId = String(p.id).trim();
        if (!studentId || studentId === 'undefined') {
            return NextResponse.json({ error: 'Invalid Student ID provided.' }, { status: 400 });
        }
        await connectMongo();
        const db = mongoose.connection.db;

        // Verify Student belongs to this Teacher
        const students = await db.collection('users').find({ role: 'student', teacher_id: user.id }).toArray();
        const student = students.find(s => String(s.id || s._id) === String(studentId));

        if (!student) {
            console.error('Debug 404: studentId=', studentId, 'teacherId=', user.id, 'allStudentIds=', students.map(s => String(s.id || s._id)));
            return NextResponse.json({ error: 'Student not found or not assigned to you.' }, { status: 404 });
        }

        const teacherProfile = await db.collection('users').findOne({ $or: [{ id: user.id }, { _id: user.id }] });
        const teacherSpecialties = teacherProfile?.specialties || [];

        let validMicroSkillIds = null;
        if (teacherSpecialties.length > 0) {
            const allowedUnits = await db.collection('units').find({
                $or: [
                    { subject_id: { $in: teacherSpecialties } },
                    { subjectId: { $in: teacherSpecialties } }
                ]
            }).toArray();
            const allowedUnitIds = [...new Set(allowedUnits.map(u => String(u.id || u._id)))];

            const allowedSkillsRaw = await db.collection('micro_skills').find({
                $or: [
                    { unit_id: { $in: allowedUnitIds } },
                    { base_topic_id: { $in: allowedUnitIds } }
                ]
            }).toArray();
            const altAllowedSkillsRaw = await db.collection('microskills').find({
                $or: [
                    { unit_id: { $in: allowedUnitIds } },
                    { base_topic_id: { $in: allowedUnitIds } }
                ]
            }).toArray();
            validMicroSkillIds = [...new Set([...allowedSkillsRaw, ...altAllowedSkillsRaw].map(m => String(m.id || m._id)))];
        }

        const skillFilterOr = validMicroSkillIds ? [
            { micro_skill_id: { $in: validMicroSkillIds } },
            { microskill_id: { $in: validMicroSkillIds } }
        ] : null;

        // 1. Fetch Skill States & Joined Curriculums
        const skillStateQuery = { student_id: studentId };
        if (validMicroSkillIds) skillStateQuery.micro_skill_id = { $in: validMicroSkillIds };
        const skillStates = await db.collection('student_skill_state').find(skillStateQuery).toArray();
        const activeSkillIds = skillStates.map(s => String(s.micro_skill_id));

        // 1b. Get Skill IDs from the attempts themselves to catch anything they practiced in the period
        // Fetch Recent Questions (Attempt Events) first so we know what they did
        const attemptsQuery = { student_id: studentId, ...dateFilter };
        if (skillFilterOr) attemptsQuery.$or = skillFilterOr;

        const recentAttemptsRaw = await db.collection('attempt_events')
            .find(attemptsQuery)
            .sort({ created_at: -1 })
            .limit(200)
            .toArray();

        const attemptSkillIds = recentAttemptsRaw.map(a => String(a.micro_skill_id || a.microskill_id)).filter(Boolean);

        // Combine Skill IDs
        const combinedSkillIds = [...new Set([...activeSkillIds, ...attemptSkillIds])];

        // Let's get actual Microskills Docs
        const microSkills = await db.collection('micro_skills').find({
            $or: [
                { id: { $in: combinedSkillIds } },
                { _id: { $in: combinedSkillIds } }
            ]
        }).toArray();
        if (microSkills.length === 0 && combinedSkillIds.length > 0) {
            const fallback = await db.collection('microskills').find({
                $or: [{ id: { $in: combinedSkillIds } }, { _id: { $in: combinedSkillIds } }]
            }).toArray();
            microSkills.push(...fallback);
        }

        // 2. We need Units and Subjects to group them visually. 
        // A microskill generally has a `unit_id` or similar. We must fetch those curriculums.
        // We will just do a sweeping map.
        const unitIds = [...new Set(microSkills.map(m => String(m.unit_id || m.base_topic_id)).filter(Boolean))];
        const units = await db.collection('units').find({
            $or: [{ id: { $in: unitIds } }, { _id: { $in: unitIds } }]
        }).toArray();

        const subjectIds = [...new Set(units.map(u => String(u.subject_id)).filter(Boolean))];
        let subjectQuery = { $or: [{ id: { $in: subjectIds } }, { _id: { $in: subjectIds } }] };
        if (teacherSpecialties.length > 0) {
            subjectQuery = { $and: [subjectQuery, { $or: [{ id: { $in: teacherSpecialties } }, { _id: { $in: teacherSpecialties } }] }] };
        }
        const subjects = await db.collection('subjects').find(subjectQuery).toArray();

        // 3. Fetch Questions used in those attempts
        const questionIds = recentAttemptsRaw.map(a => a.question_id);
        const questionsDocs = await db.collection('questions').find({
            $or: [
                { id: { $in: questionIds } },
                { _id: { $in: questionIds } }
            ]
        }).toArray();

        const qMap = new Map();
        questionsDocs.forEach(qd => {
            if (qd.id) qMap.set(String(qd.id), qd);
            if (qd._id) qMap.set(String(qd._id), qd);
        });

        const formatDynamicAnswer = (ans) => {
            if (!ans || ans === 'N/A') return 'N/A';
            let data = ans;
            if (typeof ans === 'string' && (ans.startsWith('{') || ans.startsWith('['))) {
                try { data = JSON.parse(ans); } catch (e) { }
            }
            if (typeof data === 'object' && data !== null) {
                const values = Object.values(data).filter(v => v !== undefined && v !== '');
                return values.length > 0 ? values.join(' • ') : 'N/A';
            }
            return String(data);
        };

        const attemptDetails = recentAttemptsRaw.map(a => {
            const q = qMap.get(String(a.question_id));
            let qText = q?.question_text || q?.text || '';
            if (!qText && q?.parts) {
                try {
                    const parts = typeof q.parts === 'string' ? JSON.parse(q.parts) : q.parts;
                    qText = parts.filter(p => p.type === 'text').map(p => p.content || '').join(' ');
                } catch (e) { }
            }
            qText = qText.replace(/<\/?[^>]+(>|$)/g, "").trim() || 'Review skill basics';

            const rawUserAns = a.answer_payload?.ans || a.answer_payload || a.correct_payload?.idempotency?.requestBody?.answer || 'N/A';
            const rawCorrAns = q?.correct_answer_text || q?.correct_answer || 'N/A';

            return {
                id: a._id,
                micro_skill_id: String(a.micro_skill_id || a.microskill_id),
                questionText: qText,
                userAnswer: formatDynamicAnswer(rawUserAns),
                correctAnswer: formatDynamicAnswer(rawCorrAns),
                isCorrect: a.is_correct,
                misconception: a.misconception_code || a.factors?.misconceptionCode || null,
                timeSpentSeconds: Math.round((Number(a.response_ms) || 0) / 1000),
                timestamp: a.created_at
            };
        });

        // Build a hierarchical nested response: 
        // Subject -> Unit -> Microskill -> Skill State Status
        const curriculumTree = subjects.map(sub => {
            const subUnits = units.filter(u => String(u.subject_id) === String(sub.id || sub._id)).map(unit => {
                const uSkills = microSkills.filter(m => String(m.unit_id || m.base_topic_id) === String(unit.id || unit._id)).map(ms => {
                    const msId = String(ms.id || ms._id);
                    const state = skillStates.find(st => String(st.micro_skill_id) === msId);
                    const recentAttempts = attemptDetails.filter(a => a.micro_skill_id === msId);

                    // Only include this microskill if we are not filtering by date, or if it has attempts in the date range
                    const isActiveInPeriod = (startDate || endDate) ? recentAttempts.length > 0 : true;
                    if (!isActiveInPeriod) return null;

                    return {
                        id: msId,
                        name: ms.name,
                        status: state ? state.status : 'not_started',
                        score: state ? Math.round((state.mastery_score || 0) * 100) : 0,
                        lastPracticed: state ? state.updated_at : null,
                        recentAttempts
                    };
                }).filter(Boolean);

                return {
                    id: unit.id || unit._id,
                    name: unit.name || unit.title || 'Unknown Unit',
                    microskills: uSkills
                };
            }).filter(u => u.microskills.length > 0); // Only return units this student has actually interacted with

            return {
                id: sub.id || sub._id,
                name: sub.name || sub.title || 'Unknown Subject',
                units: subUnits
            };
        }).filter(sub => sub.units.length > 0);

        // Calculate Student Totals
        const runtimeAggMatch = { student_id: studentId, ...dateFilter };
        if (skillFilterOr) runtimeAggMatch.$or = skillFilterOr;
        const runtimeAgg = await db.collection('attempt_events').aggregate([
            { $match: runtimeAggMatch },
            {
                $group: {
                    _id: null,
                    totalMs: { $sum: { $toDouble: { $ifNull: ["$response_ms", 0] } } },
                    totalQuestions: { $sum: 1 }
                }
            }
        ]).toArray();
        const totals = runtimeAgg[0] || { totalMs: 0, totalQuestions: 0 };

        const mastered = skillStates.filter(st => st.status === 'mastered' || st.status === 'proficient').length;
        const avgProficiency = skillStates.length > 0
            ? Math.round((skillStates.reduce((acc, st) => acc + (st.mastery_score || 0), 0) / skillStates.length) * 100)
            : 0;

        // Last 7 days chart data
        const tzOffsetStr = req.headers.get('x-timezone-offset');
        const tzOffsetMins = tzOffsetStr ? parseInt(tzOffsetStr, 10) : 0;
        const utcNow = new Date();
        const now = new Date(utcNow.getTime() - tzOffsetMins * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const activityAggMatch = { student_id: studentId, created_at: { $gte: sevenDaysAgo } };
        if (skillFilterOr) activityAggMatch.$or = skillFilterOr;

        const activityAggRes = await db.collection('attempt_events').aggregate([
            { $match: activityAggMatch },
            { $project: { dateOnly: { $substr: ["$created_at", 0, 10] } } },
            { $group: { _id: "$dateOnly", count: { $sum: 1 } } }
        ]).toArray();

        // Build 7-day dense array
        const recentActivity = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dateStr = d.toISOString().split('T')[0];
            const shortDay = d.toLocaleDateString('en-US', { weekday: 'short' });
            const match = activityAggRes.find(a => a._id === dateStr);
            recentActivity.push({
                day: shortDay,
                date: dateStr,
                count: match ? match.count : 0
            });
        }


        return NextResponse.json({
            student: {
                id: student._id || student.id,
                name: student.name,
                email: student.email,
                totalTimeMins: Math.round(totals.totalMs / 60000),
                totalQuestions: totals.totalQuestions,
                masteredSkills: mastered,
                avgProficiency,
                recentActivity
            },
            curriculumProfile: curriculumTree
        });

    } catch (error) {
        console.error('Teacher Student Profile API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
