'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './teacher-dashboard.module.css';
import QuestionParts from '@/components/practice/QuestionParts';

export default function TeacherDashboard() {
    const [view, setView] = useState('overview'); // 'overview', 'students', 'trouble'
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedStudentId, setExpandedStudentId] = useState(null);

    const toggleStudent = (id) => {
        setExpandedStudentId(expandedStudentId === id ? null : id);
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const res = await fetch('/api/teacher/dashboard-data');
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Failed to load dashboard data');
                }
                const payload = await res.json();
                setData(payload);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    if (loading) return <div className={styles.page} style={{ alignItems: 'center', justifyContent: 'center' }}>Loading teacher dashboard...</div>;
    if (error) return <div className={styles.page} style={{ alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>Error: {error}</div>;

    const { stats, activityData, distribution, troubleSpots, students } = data;

    return (
        <div className={styles.page}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.logoArea}>
                    <div className={styles.logoCircle}>L</div>
                    <span className={styles.brandName}>LearnFlow</span>
                </div>

                <div className={styles.navSectionLabel}>Main Menu</div>
                <div onClick={() => setView('overview')} className={`${styles.navItem} ${view === 'overview' ? styles.navItemActive : ''}`}>
                    <span className={styles.navIcon}>📊</span>
                    <span className={styles.navText}>Overview</span>
                </div>
                <div onClick={() => setView('students')} className={`${styles.navItem} ${view === 'students' ? styles.navItemActive : ''}`}>
                    <span className={styles.navIcon}>👥</span>
                    <span className={styles.navText}>Students</span>
                </div>
                <div onClick={() => setView('trouble')} className={`${styles.navItem} ${view === 'trouble' ? styles.navItemActive : ''}`}>
                    <span className={styles.navIcon}>⚠️</span>
                    <span className={styles.navText}>Trouble Spots</span>
                </div>

                <div className={styles.navSectionLabel}>System</div>
                <div className={styles.navItem}><span className={styles.navIcon}>⚙️</span><span className={styles.navText}>Settings</span></div>
                <Link href="/" className={styles.navItem}><span className={styles.navIcon}>⬅️</span><span className={styles.navText}>Exit Portal</span></Link>
            </aside>

            {/* Content Area */}
            <main className={styles.content}>
                <header className={styles.topBar}>
                    <div className={styles.searchBox}>
                        <span>🔍</span>
                        <input type="text" placeholder="Search students, skills, or reports..." />
                    </div>
                    <div className={styles.userMenu}>
                        <div className={styles.avatar}>T</div>
                        <span>Jane Smith</span>
                    </div>
                </header>

                <div className={styles.dashboardBody}>
                    <div className={styles.pageHeader}>
                        <div className={styles.titleArea}>
                            <h1>{view === 'overview' ? 'Analytics Overview' : view === 'students' ? 'Student Directory' : 'Trouble Spots'}</h1>
                            <p>{view === 'overview' ? 'Monitor your class\'s progress and identify students who need extra support.' : view === 'students' ? 'Review individual student performance and history.' : 'Review specific skills where your students are encountering difficulties.'}</p>
                        </div>
                        <div className={styles.headerActions}>
                            <button className={`${styles.actionBtn} ${styles.secondaryAction}`}>Download Report</button>
                            <button className={`${styles.actionBtn} ${styles.primaryAction}`}>Assign New Skill</button>
                        </div>
                    </div>

                    {view === 'overview' && (
                        <>
                            {/* Stats */}
                            <div className={styles.kpiGrid}>
                                <div className={styles.kpiCard}>
                                    <div className={styles.kpiIcon} style={{ background: '#EEF2FF', color: '#6366F1' }}>👥</div>
                                    <div className={styles.val}><span>Active Students</span><strong>{stats.activeStudents}</strong></div>
                                </div>
                                <div className={styles.kpiCard}>
                                    <div className={styles.kpiIcon} style={{ background: '#F0F9FF', color: '#0EA5E9' }}>🕒</div>
                                    <div className={styles.val}><span>Avg. Time Spent</span><strong>{stats.avgTimeSpent}</strong></div>
                                </div>
                                <div className={styles.kpiCard}>
                                    <div className={styles.kpiIcon} style={{ background: '#F0FDF4', color: '#22C55E' }}>🏆</div>
                                    <div className={styles.val}><span>Skills Mastered</span><strong>{stats.skillsMastered}</strong></div>
                                </div>
                                <div className={styles.kpiCard}>
                                    <div className={styles.kpiIcon} style={{ background: '#FFFBEB', color: '#D97706' }}>⚠️</div>
                                    <div className={styles.val}><span>Trouble Spots</span><strong>{stats.troubleSpotsCount}</strong></div>
                                </div>
                            </div>

                            {/* Charts Strip */}
                            <div className={styles.mainCols}>
                                <div className={styles.whiteCard}>
                                    <div className={styles.cardTop}><h3>Class Activity</h3><span>Last 7 Days</span></div>
                                    <div className={styles.chartPlaceholder}>
                                        {activityData.map((val, i) => (
                                            <div
                                                key={i}
                                                className={styles.chartBar}
                                                style={{ height: `${Math.min(100, (val / (Math.max(...activityData) || 1)) * 100)}%`, opacity: i === 6 ? 0.8 : 0.15 }}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className={styles.whiteCard}>
                                    <div className={styles.cardTop}><h3>Proficiency Distribution</h3></div>
                                    <div className={styles.profList}>
                                        <div className={styles.profItem}>
                                            <div className={styles.profLabel}><span>Mastered</span><span>{distribution.mastered}</span></div>
                                            <div className={styles.proficiencyBar}><div className={styles.proficiencyFill} style={{ width: `${(distribution.mastered / (students.length || 1)) * 100}%`, background: '#22C55E' }} /></div>
                                        </div>
                                        <div className={styles.profItem}>
                                            <div className={styles.profLabel}><span>Proficient</span><span>{distribution.proficient}</span></div>
                                            <div className={styles.proficiencyBar}><div className={styles.proficiencyFill} style={{ width: `${(distribution.proficient / (students.length || 1)) * 100}%`, background: '#6366F1' }} /></div>
                                        </div>
                                        <div className={styles.profItem}>
                                            <div className={styles.profLabel}><span>Needs Help</span><span>{distribution.needsHelp}</span></div>
                                            <div className={styles.proficiencyBar}><div className={styles.proficiencyFill} style={{ width: `${(distribution.needsHelp / (students.length || 1)) * 100}%`, background: '#EF4444' }} /></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Table */}
                            <div className={styles.whiteCard}>
                                <div className={styles.cardTop}><h3>Recent Student Activity</h3><span style={{ fontSize: '0.8rem', color: '#7c3aed', cursor: 'pointer' }}>View All</span></div>
                                <table className={styles.studentTable}>
                                    <thead>
                                        <tr>
                                            <th>Student</th>
                                            <th>Trend</th>
                                            <th>Time Spent</th>
                                            <th>Questions</th>
                                            <th>Mastered</th>
                                            <th>Trouble Spots</th>
                                            <th>Proficiency</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.map(s => (
                                            <React.Fragment key={s.id}>
                                                <tr className={styles.studentRow} onClick={() => toggleStudent(s.id)}>
                                                    <td>
                                                        <div className={styles.studentInfo}>
                                                            <div className={styles.smAvatar} style={{ background: s.proficiency > 80 ? '#F0FDF4' : '#F1F5F9' }}>{s.name[0]}</div>
                                                            <div><div style={{ fontWeight: 700 }}>{s.name}</div><div style={{ fontSize: '0.75rem', opacity: 0.6 }}>4th Grade</div></div>
                                                        </div>
                                                    </td>
                                                    <td style={{ color: s.trend.startsWith('+') ? '#22C55E' : '#EF4444', fontWeight: 700 }}>
                                                        {s.trend.startsWith('+') ? '📈' : '📉'} {s.trend}
                                                    </td>
                                                    <td>{s.timeSpent}</td>
                                                    <td>{s.questions}</td>
                                                    <td>{s.mastered}</td>
                                                    <td>
                                                        <span style={{ color: s.troubleSpotsCount > 0 ? '#D97706' : '#94a3b8', fontWeight: 600 }}>
                                                            {s.troubleSpotsCount} SPOTS
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <div className={styles.proficiencyBar}><div className={styles.proficiencyFill} style={{ width: `${s.proficiency}%`, background: s.proficiency > 80 ? '#22C55E' : s.proficiency > 50 ? '#6366F1' : '#F97316' }} /></div>
                                                            <strong>{s.proficiency}%</strong>
                                                            <span style={{ opacity: 0.3, marginLeft: 'auto' }}>{expandedStudentId === s.id ? '▴' : '▾'}</span>
                                                        </div>
                                                    </td>
                                                </tr>

                                                {expandedStudentId === s.id && (
                                                    <tr className={styles.expandedRow}>
                                                        <td colSpan="7">
                                                            <div className={styles.expandedContent}>
                                                                {/* Col 1: Actions */}
                                                                <div className={styles.detailCol}>
                                                                    <h4>Quick Actions</h4>
                                                                    <div className={styles.actionStack}>
                                                                        <button className={`${styles.btnAction} ${styles.btnPrimary}`}>Assign Intervention</button>
                                                                        <button className={styles.btnAction}>Message Parent</button>
                                                                        <button className={styles.btnAction}>View Full Profile</button>
                                                                    </div>
                                                                    <div className={styles.insightCard}>
                                                                        <h5>AI Insight</h5>
                                                                        <p>{s.aiInsight}</p>
                                                                    </div>
                                                                </div>

                                                                {/* Col 2: Skills */}
                                                                <div className={styles.detailCol}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                                                        <h4>Skill Performance</h4>
                                                                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8' }}>LINEAR%</span>
                                                                    </div>
                                                                    {s.skillPerformance.map(skill => (
                                                                        <div key={skill.id} className={styles.skillEntry}>
                                                                            <div className={styles.skillLabel}>
                                                                                <span className={styles.skillInfoText}>{skill.name}</span>
                                                                                <span className={styles.skillValText}>{skill.score}%</span>
                                                                            </div>
                                                                            <div className={styles.proficiencyBar} style={{ width: '100%' }}>
                                                                                <div className={styles.proficiencyFill} style={{ width: `${skill.score}%`, background: skill.score > 80 ? '#22C55E' : skill.score > 50 ? '#6366F1' : '#F97316' }} />
                                                                            </div>
                                                                            <span className={styles.skillSubLabel}>Last Session: {skill.status}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                {/* Col 3: History */}
                                                                <div className={styles.detailCol}>
                                                                    <h4>Assessment History</h4>
                                                                    <div className={styles.historyPlaceholder}>
                                                                        <svg viewBox="0 0 200 60">
                                                                            <polyline points="0,50 40,45 80,48 120,30 160,35 200,20" fill="none" stroke="#6366F1" strokeWidth="2" />
                                                                            <circle cx="200" cy="20" r="3" fill="#6366F1" />
                                                                        </svg>
                                                                    </div>
                                                                    <div style={{ marginTop: '1rem' }}>
                                                                        <div className={styles.historyEntry}><span>Unit 4 Math</span><span>2024-02-28</span><span>88%</span></div>
                                                                        <div className={styles.historyEntry}><span>Reading Comp</span><span>2024-02-15</span><span>92%</span></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {view === 'trouble' && (
                        <>
                            <div className={styles.troubleHeader}>
                                <div className={styles.troubleIcon}>🔔</div>
                                <div className={styles.troubleText}>
                                    <h4>Class Trouble Spots</h4>
                                    <p>We've identified {troubleSpots.length} skills where multiple students are struggling. Consider a small-group intervention for these topics.</p>
                                </div>
                            </div>

                            {troubleSpots.map(skill => (
                                <div key={skill.id} className={styles.troubleCard} style={{ display: 'block' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div className={styles.troubleInfo}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                                                <span className={`${styles.priorityTag} ${skill.priority === 'High' ? styles.highPri : styles.medPri}`}>{skill.priority} Priority</span>
                                            </div>
                                            <h4>{skill.name}</h4>
                                            <div className={styles.troubleMeta}>
                                                <span>👥 {skill.studentCount} students need help</span>
                                                <span>🔴 {skill.missedQuestions} missed questions</span>
                                            </div>
                                        </div>
                                        <button className={styles.viewDetails}>View Group Intervention</button>
                                    </div>

                                    {/* Question Carousel */}
                                    <div className={styles.troubleSamples}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <h5 style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8' }}>Recent Error Analysis</h5>
                                            <div className={styles.carouselNav}>
                                                <button className={styles.navBtn}>←</button>
                                                <button className={styles.navBtn}>→</button>
                                            </div>
                                        </div>
                                        <div className={styles.carousel}>
                                            {skill.samples?.map(sample => (
                                                <div key={sample.id} className={styles.sampleCard}>
                                                    <div className={styles.sampleHeader}>
                                                        <span className={styles.studentBadge}>{sample.studentName}</span>
                                                        <span>{new Date(sample.timestamp).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className={styles.sampleBody}>
                                                        {sample.questionParts && sample.questionParts.length > 0 ? (
                                                            <QuestionParts parts={sample.questionParts} className={styles.questionPreview} />
                                                        ) : (
                                                            sample.questionText
                                                        )}
                                                    </div>
                                                    <div className={styles.badgeStack}>
                                                        <div className={styles.badgeLine}>
                                                            <span className={styles.badgeLabel}>Mistake:</span>
                                                            <span className={`${styles.badgeVal} ${styles.valWrong}`}>{sample.userSelection}</span>
                                                        </div>
                                                        <div className={styles.badgeLine}>
                                                            <span className={styles.badgeLabel}>Correct:</span>
                                                            <span className={`${styles.badgeVal} ${styles.valRight}`}>{sample.correctAnswer}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {(!skill.samples || skill.samples.length === 0) && (
                                                <div style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', width: '100%' }}>
                                                    No recent question samples available for this skill.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}

                    {view === 'students' && (
                        <div className={styles.whiteCard}>
                            <div className={styles.cardTop}><h3>Student Directory</h3></div>
                            <table className={styles.studentTable}>
                                <thead>
                                    <tr>
                                        <th>Student Name</th>
                                        <th>Contact Email</th>
                                        <th>Lifetime Practice</th>
                                        <th>Mastery Level</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map(s => (
                                        <tr key={s.id}>
                                            <td><strong>{s.name}</strong></td>
                                            <td>{s.email}</td>
                                            <td>{s.questions} Questions</td>
                                            <td>{s.mastered} Skills</td>
                                            <td><button className={styles.viewDetails}>Review History</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
