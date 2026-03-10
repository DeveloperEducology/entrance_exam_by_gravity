import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import mongoose from 'mongoose';
import { connectMongo } from '@/lib/db/mongo';
import styles from '@/app/page.module.css';

export default async function StudentAssignments() {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.role !== 'student') {
        return null;
    }

    await connectMongo();
    const db = mongoose.connection.db;

    // Find assignments where student_ids includes this user's ID
    const activeAssignments = await db.collection('assignments').find({
        student_ids: { $in: [user.id] }
    }).toArray();

    if (activeAssignments.length === 0) {
        return null;
    }

    // Resolve Skill Names
    const skillIds = activeAssignments.map(a => a.micro_skill_id);

    // Fetch Skill States for the user to determine if assignments are complete
    const skillStates = await db.collection('student_skill_state').find({
        student_id: user.id,
        $or: [
            { micro_skill_id: { $in: skillIds } },
            { microskill_id: { $in: skillIds } }
        ]
    }).toArray();

    // Map mastered statuses
    const masteryMap = new Set();
    for (const st of skillStates) {
        if (st.status === 'mastered' || st.status === 'proficient' || st.mastery_score >= 80) {
            masteryMap.add(st.micro_skill_id || st.microskill_id);
        }
    }
    const ms1 = await db.collection('micro_skills').find({
        $or: [{ id: { $in: skillIds } }, { _id: { $in: skillIds } }]
    }).toArray();
    const ms2 = await db.collection('microskills').find({
        $or: [{ id: { $in: skillIds } }, { _id: { $in: skillIds } }]
    }).toArray();

    const allMs = [...ms1, ...ms2];
    const msMap = new Map();
    for (const m of allMs) {
        msMap.set(String(m.id || m._id), m.name || m.title || 'Unnamed Skill');
    }

    return (
        <section style={{ background: '#EEF2FF', padding: '3rem 0', borderBottom: '1px solid #E0E7FF' }}>
            <div className={styles.container}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: '#6366F1', color: 'white', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>⭐</div>
                    <h2 style={{ margin: 0, color: '#1E293B', fontSize: '1.5rem' }}>From Your Teacher</h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                    {activeAssignments.map(assignment => {
                        const skillName = msMap.get(assignment.micro_skill_id) || 'Unknown Skill';
                        const isCompleted = masteryMap.has(assignment.micro_skill_id);
                        return (
                            <Link
                                href={`/practice/${assignment.micro_skill_id}`}
                                key={assignment._id.toString()}
                                style={{
                                    display: 'block',
                                    background: isCompleted ? '#F8FAFC' : '#fff',
                                    padding: '1.5rem',
                                    borderRadius: '12px',
                                    textDecoration: 'none',
                                    border: isCompleted ? '1px solid #E2E8F0' : '1px solid #C7D2FE',
                                    boxShadow: isCompleted ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    opacity: isCompleted ? 0.7 : 1
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                    <h3 style={{ margin: 0, color: isCompleted ? '#64748B' : '#1E293B', fontSize: '1.1rem' }}>{skillName}</h3>
                                    {isCompleted && (
                                        <span style={{ background: '#DCFCE7', color: '#16A34A', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>✓ DONE</span>
                                    )}
                                </div>

                                {assignment.due_date && !isCompleted && (
                                    <div style={{ fontSize: '0.875rem', color: '#B45309', fontWeight: 600 }}>Due: {new Date(assignment.due_date).toLocaleDateString()}</div>
                                )}
                                {!assignment.due_date && !isCompleted && (
                                    <div style={{ fontSize: '0.875rem', color: '#6366F1', fontWeight: 600 }}>Suggested Practice</div>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
