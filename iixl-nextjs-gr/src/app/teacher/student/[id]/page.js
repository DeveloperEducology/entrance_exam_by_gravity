'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function StudentFullProfile() {
    const params = useParams();
    const studentId = params.id;
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('All'); // 'All', 'Mastered', 'Needs Help'
    const [expandedSkill, setExpandedSkill] = useState(null);
    const [dateInputStart, setDateInputStart] = useState('');
    const [dateInputEnd, setDateInputEnd] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        const fetchStudentProfile = async () => {
            setLoading(true);
            try {
                let url = `/api/teacher/student-profile/${studentId}?_t=${Date.now()}`;
                if (startDate) url += `&startDate=${startDate}`;
                if (endDate) url += `&endDate=${endDate}`;
                const res = await fetch(url);
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Failed to load student profile');
                }
                const payload = await res.json();
                setData(payload);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        if (studentId) {
            fetchStudentProfile();
        }
    }, [studentId, startDate, endDate]);

    const filteredCurriculum = useMemo(() => {
        if (!data || !data.curriculumProfile) return [];
        return data.curriculumProfile.map(sub => {
            const units = sub.units.map(unit => {
                const skills = unit.microskills.filter(skill => {
                    if (filter === 'All') return true;
                    if (filter === 'Mastered') return skill.status === 'mastered' || skill.score >= 80;
                    if (filter === 'Needs Help') return skill.score < 80;
                    return true;
                });
                return { ...unit, microskills: skills };
            }).filter(u => u.microskills.length > 0);
            return { ...sub, units };
        }).filter(sub => sub.units.length > 0);
    }, [data, filter]);

    if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading student profile...</div>;
    if (error) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>Error: {error}</div>;

    const { student } = data;

    return (
        <div style={{ background: '#F8FAFC', minHeight: '100vh', fontFamily: 'var(--font-body), sans-serif', color: '#1E293B' }}>
            <style>{`
                @media print {
                    @page { margin: 1cm; }
                    body { background: white !important; }
                    .no-print { display: none !important; }
                    .print-only { display: block !important; margin-bottom: 2rem; font-size: 2rem; border-bottom: 2px solid #E2E8F0; padding-bottom: 1rem; }
                    * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; }
                    .print-avoid-break { break-inside: avoid; page-break-inside: avoid; }
                }
                @media screen {
                    .print-only { display: none !important; }
                }
            `}</style>

            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
                <h1 className="print-only">Progress Report: {student?.name || 'Student'}</h1>
                {(startDate || endDate) && (
                    <div className="print-only" style={{ fontSize: '1rem', color: '#64748B', marginTop: '-1.5rem', marginBottom: '1.5rem' }}>
                        Reporting Period: {startDate || 'Start'} to {endDate || 'Present'}
                    </div>
                )}

                <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <Link href="/teacher/dashboard" style={{ textDecoration: 'none', color: '#6366F1', fontWeight: 600 }}>← Back to Dashboard</Link>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Student Full Profile</h1>
                    <button onClick={() => window.print()} style={{ marginLeft: 'auto', padding: '0.6rem 1.25rem', background: '#6366F1', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span>📄</span> Generate PDF Report
                    </button>
                </div>

                {/* Top KPI Card */}
                <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '2rem', display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800, color: '#64748B' }}>
                        {student.name[0]}
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }}>{student.name}</h2>
                        <span style={{ color: '#64748B' }}>{student.email}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '2rem', marginLeft: 'auto', textAlign: 'center' }}>
                        <div><div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{student.totalTimeMins}m</div><div style={{ color: '#64748B', fontSize: '0.875rem' }}>Practice Time</div></div>
                        <div><div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{student.totalQuestions}</div><div style={{ color: '#64748B', fontSize: '0.875rem' }}>Total Questions</div></div>
                        <div><div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#22C55E' }}>{student.masteredSkills}</div><div style={{ color: '#64748B', fontSize: '0.875rem' }}>Skills Mastered</div></div>
                        <div><div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6366F1' }}>{student.avgProficiency}%</div><div style={{ color: '#64748B', fontSize: '0.875rem' }}>Avg Proficiency</div></div>
                    </div>
                </div>

                {/* 7-Day Activity Chart */}
                {student.recentActivity && student.recentActivity.length > 0 && (
                    <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1E293B' }}>7-Day Activity Trend</h3>
                            <span style={{ fontSize: '0.875rem', color: '#64748B' }}>Questions Answered per Day</span>
                        </div>
                        <div style={{ height: '170px', width: '100%', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            {(() => {
                                const rawMax = Math.max(...student.recentActivity.map(d => d.count), 4);
                                const maxCount = Math.ceil(rawMax / 4) * 4; // Ensure divisible by 4 for clean Y-axis ticks

                                const points = student.recentActivity.map((d, i) => {
                                    const x = (i / 6) * 100;
                                    const y = 100 - (d.count / maxCount) * 100;
                                    return `${x},${y}`;
                                }).join(' ');

                                return (
                                    <>
                                        {/* Y-Axis */}
                                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: '25px', color: '#64748B', fontSize: '0.875rem', fontWeight: 600, textAlign: 'right', minWidth: '24px' }}>
                                            <span>{maxCount}</span>
                                            <span>{maxCount * 0.75}</span>
                                            <span>{maxCount * 0.5}</span>
                                            <span>{maxCount * 0.25}</span>
                                            <span>0</span>
                                        </div>

                                        {/* Chart Area */}
                                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 'calc(100% - 25px)', overflow: 'visible' }} preserveAspectRatio="none">
                                                {/* Grid Lines */}
                                                <line x1="0" y1="0%" x2="100%" y2="0%" stroke="#E2E8F0" strokeWidth="1" />
                                                <line x1="0" y1="25%" x2="100%" y2="25%" stroke="#E2E8F0" strokeWidth="1" />
                                                <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#E2E8F0" strokeWidth="1" />
                                                <line x1="0" y1="75%" x2="100%" y2="75%" stroke="#E2E8F0" strokeWidth="1" />
                                                {/* X-Axis Bold Line */}
                                                <line x1="0" y1="100%" x2="100%" y2="100%" stroke="#94A3B8" strokeWidth="3" />

                                                {/* Y-Axis Bold Line */}
                                                <line x1="0" y1="0" x2="0" y2="100%" stroke="#94A3B8" strokeWidth="3" />

                                                {/* Line */}
                                                <polyline
                                                    points={points}
                                                    fill="none"
                                                    stroke="#38BDF8"
                                                    strokeWidth="4"
                                                    vectorEffect="non-scaling-stroke"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />

                                                {/* Data Points */}
                                                {student.recentActivity.map((d, i) => {
                                                    const x = (i / 6) * 100;
                                                    const y = 100 - (d.count / maxCount) * 100;
                                                    return (
                                                        <g key={i}>
                                                            <circle cx={`${x}%`} cy={`${y}%`} r="6" fill="#fff" stroke="#38BDF8" strokeWidth="3" />
                                                        </g>
                                                    );
                                                })}
                                            </svg>

                                            {/* X-Axis Labels */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'absolute', bottom: '0', left: 0, width: '100%' }}>
                                                {student.recentActivity.map((d, i) => {
                                                    const parts = d.date.split('-');
                                                    const dateStr = parts.length === 3 ? `${parts[1]}/${parts[2]}` : d.date;
                                                    return (
                                                        <div key={i} style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748B', textAlign: 'center', width: '50px', marginLeft: i === 0 ? '-25px' : 0, marginRight: i === 6 ? '-25px' : 0 }}>
                                                            {dateStr}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {/* Filter Tabs */}
                <div className="no-print" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '1rem', background: '#E2E8F0', padding: '0.25rem', borderRadius: '999px' }}>
                        {['All', 'Mastered', 'Needs Help'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                style={{
                                    padding: '0.4rem 1rem', borderRadius: '999px', border: 'none', fontWeight: 600, cursor: 'pointer',
                                    background: filter === f ? '#6366F1' : 'transparent',
                                    color: filter === f ? '#fff' : '#475569'
                                }}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    {/* Learning Period Date Range Picker */}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto', background: '#fff', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748B', marginRight: '0.5rem' }}>Learning Period:</span>
                        <input type="date" value={dateInputStart} onChange={e => setDateInputStart(e.target.value)} style={{ padding: '0.3rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.875rem', color: '#1E293B' }} />
                        <span style={{ color: '#94A3B8' }}>to</span>
                        <input type="date" value={dateInputEnd} onChange={e => setDateInputEnd(e.target.value)} style={{ padding: '0.3rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.875rem', color: '#1E293B' }} />
                        <button onClick={() => { setStartDate(dateInputStart); setEndDate(dateInputEnd); }} style={{ padding: '0.4rem 0.75rem', marginLeft: '0.5rem', background: '#6366F1', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>Apply</button>
                        {(startDate || endDate) && (
                            <button onClick={() => { setDateInputStart(''); setDateInputEnd(''); setStartDate(''); setEndDate(''); }} style={{ padding: '0.4rem 0.75rem', background: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>Clear</button>
                        )}
                    </div>
                </div>

                {/* Hierarchical Data Rendering */}
                {filteredCurriculum.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', background: '#fff', borderRadius: '12px', color: '#94A3B8' }}>No records match this filter.</div>
                ) : (
                    filteredCurriculum.map(subject => (
                        <div key={subject.id} style={{ marginBottom: '2rem' }}>
                            <h3 className="print-avoid-break" style={{ borderBottom: '2px solid #E2E8F0', paddingBottom: '0.5rem', color: '#0F172A', fontSize: '1.25rem' }}>{subject.name}</h3>

                            {subject.units.map(unit => (
                                <div key={unit.id} className="print-avoid-break" style={{ background: '#fff', borderRadius: '8px', padding: '1.5rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', color: '#334155' }}>{unit.name}</h4>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {unit.microskills.map(skill => (
                                            <div key={skill.id} style={{ display: 'flex', flexDirection: 'column', background: '#F8FAFC', padding: '1rem', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s', border: expandedSkill === skill.id ? '1px solid #CBD5E1' : '1px solid transparent' }} onClick={() => setExpandedSkill(expandedSkill === skill.id ? null : skill.id)}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            {skill.name}
                                                            <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>{expandedSkill === skill.id ? '▴' : '▾'}</span>
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>Last Practiced: {new Date(skill.lastPracticed).toLocaleString()}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '250px' }}>
                                                        <div style={{ flex: 1, height: '8px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                                                            <div style={{ height: '100%', width: `${skill.score}%`, background: skill.score >= 80 ? '#22C55E' : skill.score >= 50 ? '#6366F1' : '#F97316' }} />
                                                        </div>
                                                        <span style={{ fontWeight: 700, width: '40px', textAlign: 'right', color: skill.score >= 80 ? '#22C55E' : skill.score >= 50 ? '#6366F1' : '#F97316' }}>{skill.score}%</span>
                                                    </div>
                                                </div>

                                                {/* Expanded Question History Sub-Table */}
                                                {expandedSkill === skill.id && (
                                                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0', cursor: 'default' }} onClick={e => e.stopPropagation()}>
                                                        <h5 style={{ margin: '0 0 0.5rem 0', color: '#475569', fontSize: '0.875rem' }}>Recent Question Attempts</h5>
                                                        {(!skill.recentAttempts || skill.recentAttempts.length === 0) ? (
                                                            <div style={{ fontSize: '0.875rem', color: '#94A3B8' }}>No recent attempt data available.</div>
                                                        ) : (
                                                            <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '6px' }}>
                                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
                                                                    <thead style={{ background: '#F1F5F9' }}>
                                                                        <tr>
                                                                            <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 600 }}>Question</th>
                                                                            <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 600 }}>Student Answer</th>
                                                                            <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 600 }}>Result</th>
                                                                            <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 600 }}>Detected Misconception</th>
                                                                            <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 600 }}>Time Taken</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {skill.recentAttempts.map(atmpt => (
                                                                            <tr key={atmpt.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                                                                <td style={{ padding: '0.75rem 1rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={atmpt.questionText}>{atmpt.questionText}</td>
                                                                                <td style={{ padding: '0.75rem 1rem', color: '#0F172A', fontWeight: 500 }}>{atmpt.userAnswer} <span style={{ opacity: 0.5, fontSize: '0.7rem', marginLeft: '0.2rem' }}>(Correct: {atmpt.correctAnswer})</span></td>
                                                                                <td style={{ padding: '0.75rem 1rem' }}>
                                                                                    {atmpt.isCorrect ? <span style={{ background: '#DCFCE7', color: '#16A34A', padding: '0.2rem 0.5rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600 }}>Correct</span> : <span style={{ background: '#FEE2E2', color: '#DC2626', padding: '0.2rem 0.5rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600 }}>Incorrect</span>}
                                                                                </td>
                                                                                <td style={{ padding: '0.75rem 1rem' }}>
                                                                                    {atmpt.misconception ? (
                                                                                        <span style={{ fontSize: '0.75rem', background: '#FEF3C7', color: '#92400E', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #FCD34D' }}>
                                                                                            {atmpt.misconception.replace(/_/g, ' ')}
                                                                                        </span>
                                                                                    ) : '-'}
                                                                                </td>
                                                                                <td style={{ padding: '0.75rem 1rem', color: '#64748B' }}>{atmpt.timeSpentSeconds}s</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
