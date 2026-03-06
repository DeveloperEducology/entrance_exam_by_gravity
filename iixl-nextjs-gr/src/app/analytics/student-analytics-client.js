'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import styles from './student-analytics.module.css';

function toPoints(values, width = 520, height = 140, pad = 16) {
    if (!Array.isArray(values) || values.length === 0) return '';
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(1, max - min);
    return values.map((v, i) => {
        const x = pad + (i * ((width - pad * 2) / Math.max(1, values.length - 1)));
        const y = height - pad - (((v - min) / range) * (height - pad * 2));
        return `${x},${y}`;
    }).join(' ');
}

export default function StudentAnalyticsClient() {
    const supabase = createClient();
    const [studentId, setStudentId] = useState('');
    const [microSkillId, setMicroSkillId] = useState('');
    const [selectedMicroSkill, setSelectedMicroSkill] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [phase, setPhase] = useState('');
    const [loading, setLoading] = useState(true);
    const [fetchLoading, setFetchLoading] = useState(false);
    const [error, setError] = useState('');
    const [data, setData] = useState(null);
    const [optionData, setOptionData] = useState({ microSkillOptions: [] });
    const [summaryStats, setSummaryStats] = useState({ totalHours: 0, totalMinutes: 0, skillsStarted: 0, skillsMastered: 0 });
    const [hasLoaded, setHasLoaded] = useState(false);
    const [userChecked, setUserChecked] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        async function loadUser() {
            const { data } = await supabase.auth.getUser();
            if (data?.user?.id) {
                setStudentId(data.user.id);
                setIsAuthenticated(true);
            } else {
                const localId = typeof window !== 'undefined'
                    ? (localStorage.getItem('practice_student_id') || localStorage.getItem('wexls_student_id'))
                    : null;
                if (localId) setStudentId(localId);
                else setError('Please sign in or start practicing to view your analytics.');
                setIsAuthenticated(false);
            }
            setUserChecked(true);
            setLoading(false);
        }
        loadUser();
    }, [supabase.auth]);

    useEffect(() => {
        let active = true;
        const loadInitialData = async () => {
            if (!studentId) return;
            try {
                // Fetch Options
                const optPromise = fetch('/api/adaptive/analytics/my-options', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ studentId: isAuthenticated ? undefined : studentId }),
                    cache: 'no-store'
                });

                // Fetch Summary Stats
                const statPromise = fetch('/api/adaptive/analytics/my-summary', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ studentId: isAuthenticated ? undefined : studentId }),
                    cache: 'no-store'
                });

                const [optRes, statRes] = await Promise.all([optPromise, statPromise]);

                let optPayload = { microSkillOptions: [] };
                try {
                    const optRaw = await optRes.text();
                    if (optRes.ok && optRaw) optPayload = JSON.parse(optRaw);
                } catch (e) {
                    console.error("Failed to parse options JSON", e);
                }

                let statPayload = { totalHours: 0, totalMinutes: 0, skillsStarted: 0, skillsMastered: 0 };
                try {
                    const statRaw = await statRes.text();
                    if (statRes.ok && statRaw) statPayload = JSON.parse(statRaw);
                } catch (e) {
                    console.error("Failed to parse summary JSON", e);
                }

                if (!active) return;

                if (optRes.ok) {
                    setOptionData({
                        microSkillOptions: optPayload.microSkillOptions || [],
                    });
                    if (optPayload.microSkillOptions?.length > 0 && !selectedMicroSkill) {
                        const firstSkill = optPayload.microSkillOptions[0].id;
                        setSelectedMicroSkill(firstSkill);
                        setMicroSkillId(firstSkill);
                    }
                }

                if (statRes.ok) {
                    setSummaryStats(statPayload);
                }
            } catch (err) {
                console.error("Failed to load student dashboard data", err);
            }
        };

        if (userChecked && studentId) {
            loadInitialData();
        }
        return () => {
            active = false;
        };
    }, [studentId, userChecked, selectedMicroSkill]);

    const fetchData = async () => {
        if (!studentId || !microSkillId) {
            setError('studentId and microSkillId are required.');
            return;
        }
        setFetchLoading(true);
        setHasLoaded(true);
        setError('');
        try {
            const res = await fetch('/api/adaptive/analytics/score-breakdown', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: isAuthenticated ? undefined : studentId,
                    microSkillId,
                    limit: 80,
                    dateFrom: dateFrom || undefined,
                    dateTo: dateTo || undefined,
                    phase: phase || undefined
                }),
                cache: 'no-store'
            });
            const raw = await res.text();
            let payload = {};
            try {
                payload = raw ? JSON.parse(raw) : {};
            } catch {
                payload = { error: raw || `Request failed with status ${res.status}` };
            }
            if (!res.ok) throw new Error(payload.error || 'Failed to load analytics.');
            setData(payload);
        } catch (err) {
            setData(null);
            setError(err?.message || 'Failed to load analytics.');
        } finally {
            setFetchLoading(false);
        }
    };

    useEffect(() => {
        if (studentId && microSkillId) {
            fetchData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentId, microSkillId]);

    const rows = data?.rows || [];
    const diagnostics = data?.diagnostics || null;
    const adaptiveSummary = data?.summary || null;
    const summary = useMemo(() => {
        if (!rows.length) return null;
        const correct = rows.filter((r) => r.isCorrect).length;
        const accuracy = Math.round((correct / rows.length) * 100);
        const avgDelta = Math.round(rows.reduce((acc, r) => acc + Number(r.estimatedDelta || 0), 0) / rows.length);
        const avgMs = Math.round(rows.reduce((acc, r) => acc + Number(r.factors?.responseMs || 0), 0) / rows.length);
        return { accuracy, avgDelta, avgMs, attempts: rows.length };
    }, [rows]);

    const accuracySeries = rows.map((r) => (r.isCorrect ? 100 : 0)).reverse();
    const deltaSeries = rows.map((r) => Number(r.estimatedDelta || 0)).reverse();
    const speedSeries = rows.map((r) => Number(r.factors?.responseMs || 0)).reverse();

    if (loading) {
        return <div className={styles.page}><p>Loading your analytics...</p></div>;
    }

    return (
        <main className={styles.page}>
            {/* Header Area */}
            <div className={styles.headerRow}>
                <div className={styles.titleArea}>
                    <h1>My Learning Dashboard</h1>
                    <p>Track your achievements and see what’s next in your learning journey.</p>
                </div>
                <button className={styles.downloadBtn}>Download Report</button>
            </div>

            {/* Welcome Banner */}
            <section className={styles.banner}>
                <div className={styles.bannerContent}>
                    <h1>Welcome back, {summaryStats.userName || 'Learner'}! 👋</h1>
                    <p>You're on a {summaryStats.streak || 0}-day streak! Keep up the great work and you'll reach your weekly goal in no time.</p>
                    <div className={styles.bannerButtons}>
                        <Link href="/practice">
                            <button className={styles.primaryBtn}>Resume Practice</button>
                        </Link>
                        <button className={styles.secondaryBtn}>View Awards</button>
                    </div>
                </div>
                <div className={styles.bannerAlpha}>🏆</div>
            </section>

            {/* KPI Cards */}
            <div className={styles.kpiGrid}>
                <div className={styles.kpiCard}>
                    <div className={styles.iconBox} style={{ background: '#FFF7ED', color: '#F97316' }}>🏆</div>
                    <div className={styles.kpiVal}>
                        <span>Skills Mastered</span>
                        <strong>{summaryStats.skillsMastered || 0}</strong>
                    </div>
                </div>
                <div className={styles.kpiCard}>
                    <div className={styles.iconBox} style={{ background: '#EEF2FF', color: '#6366F1' }}>🎯</div>
                    <div className={styles.kpiVal}>
                        <span>Current Score</span>
                        <strong>{summaryStats.avgScore || 0}</strong>
                    </div>
                </div>
                <div className={styles.kpiCard}>
                    <div className={styles.iconBox} style={{ background: '#F0F9FF', color: '#0EA5E9' }}>🕒</div>
                    <div className={styles.kpiVal}>
                        <span>Time Today</span>
                        <strong>{summaryStats.todayMinutes || 0}m</strong>
                    </div>
                </div>
                <div className={styles.kpiCard}>
                    <div className={styles.iconBox} style={{ background: '#F0FDF4', color: '#22C55E' }}>📖</div>
                    <div className={styles.kpiVal}>
                        <span>Questions</span>
                        <strong>{summaryStats.totalQuestions || 0}</strong>
                    </div>
                </div>
            </div>

            {/* Main Dashboard Grid */}
            <div className={styles.dashboardGrid}>
                {/* Left Column: Learning Progress & Recommended */}
                <div className={styles.mainColumn}>
                    <article className={styles.contentCard}>
                        <div className={styles.cardHeader}>
                            <h3>Learning Progress</h3>
                            <span>Last 7 Days</span>
                        </div>
                        <div className={styles.chartContainer}>
                            <svg viewBox="0 0 520 140" className={styles.chartSvg}>
                                <defs>
                                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.2" />
                                        <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <path
                                    d={`M 16,140 L ${toPoints(deltaSeries || [30, 45, 38, 55, 48, 70, 65])} L 504,140 Z`}
                                    fill="url(#chartGradient)"
                                />
                                <polyline
                                    points={toPoints(deltaSeries || [30, 45, 38, 55, 48, 70, 65])}
                                    fill="none"
                                    stroke="#7c3aed"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>
                    </article>

                    <article className={styles.contentCard}>
                        <div className={styles.cardHeader}>
                            <h3>Recommended Skills</h3>
                            <Link href="/practice" className={styles.seeAll}>See All</Link>
                        </div>
                        <div className={styles.skillList}>
                            {(optionData.recommendedSkills || [
                                { name: 'Multiplying by 3-digit numbers', code: 'A.5', level: 'Level E', id: '1', icon: '⚡' },
                                { name: 'Complex Sentence Structures', code: 'L.1', level: 'Level F', id: '2', icon: '⭐' },
                                { name: 'Introduction to Decimals', code: 'D.1', level: 'Level E', id: '3', icon: '⚡' }
                            ]).map((skill, idx) => (
                                <Link key={skill.id || idx} href={`/practice/${skill.id}`} className={styles.skillItem}>
                                    <div className={styles.skillIcon}>{skill.icon || (idx % 2 === 0 ? '⚡' : '⭐')}</div>
                                    <div className={styles.skillInfo}>
                                        <div className={styles.skillName}>{skill.name}</div>
                                        <div className={styles.skillSub}>Math • {skill.level}</div>
                                    </div>
                                    <span style={{ opacity: 0.3 }}>›</span>
                                </Link>
                            ))}
                        </div>
                    </article>
                </div>

                {/* Right Column: Recent & Goal */}
                <div className={styles.sideColumn}>
                    <article className={styles.contentCard}>
                        <div className={styles.cardHeader}>
                            <h3>My Recent Skills</h3>
                        </div>
                        <div className={styles.recentSkillsList}>
                            {(optionData.recentSkills || []).slice(0, 5).map((skill, idx) => {
                                const colors = ['#22C55E', '#8B5CF6', '#F97316', '#0EA5E9', '#F43F5E'];
                                return (
                                    <div key={skill.id} className={styles.recentSkillItem}>
                                        <div className={styles.recentSkillHeader}>
                                            <span className={styles.skillTitle}>{skill.name}</span>
                                            <span className={styles.skillScore}>{skill.score}</span>
                                        </div>
                                        <div className={styles.progressBar}>
                                            <div
                                                className={styles.progressFill}
                                                style={{ width: `${skill.progress}%`, background: colors[idx % colors.length] }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                            <Link href="/practice" className={styles.downloadBtn} style={{ display: 'block', textAlign: 'center', marginTop: '1rem', textDecoration: 'none' }}>
                                View All Skills
                            </Link>
                        </div>
                    </article>

                    <article className={styles.contentCard}>
                        <div className={styles.cardHeader}>
                            <h3>Goal Progress</h3>
                        </div>
                        <div className={styles.goalBox}>
                            <div className={styles.circleChart}>
                                <svg width="140" height="140" className={styles.circleSvg}>
                                    <circle cx="70" cy="70" r="60" fill="none" stroke="#F1F5F9" strokeWidth="12" />
                                    <circle
                                        cx="70" cy="70" r="60" fill="none" stroke="#7c3aed" strokeWidth="12"
                                        strokeDasharray="377"
                                        strokeDashoffset={377 - (377 * 0.75)}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className={styles.circleVal}>
                                    <strong>75%</strong>
                                    <span>Weekly</span>
                                </div>
                            </div>
                            <p className={styles.goalText}>
                                You've answered <b>{summaryStats.totalQuestions || 0}</b> of <b>500</b> questions this week.
                            </p>
                        </div>
                    </article>
                </div>
            </div>

            {/* Subtle Skill History Section */}
            <section style={{ marginTop: '4rem', padding: '1rem', borderTop: '1px solid #e2e8f0', opacity: 0.6 }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0 }}>Detailed History Filter</h4>
                    <select
                        value={selectedMicroSkill}
                        onChange={(e) => {
                            setSelectedMicroSkill(e.target.value);
                            setMicroSkillId(e.target.value);
                        }}
                        style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    >
                        <option value="">Select individual skill logs...</option>
                        {optionData.microSkillOptions.map((item) => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                    </select>
                </div>
                {summary && (
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Correct</th>
                                    <th>Score Delta</th>
                                    <th>Difficulty</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.slice(0, 10).map((row) => (
                                    <tr key={row.id}>
                                        <td>{new Date(row.createdAt).toLocaleTimeString()}</td>
                                        <td>{row.isCorrect ? '✅' : '❌'}</td>
                                        <td>{row.estimatedDelta > 0 ? `+${row.estimatedDelta}` : row.estimatedDelta}</td>
                                        <td>{row.factors?.difficulty || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </main>
    );
}
