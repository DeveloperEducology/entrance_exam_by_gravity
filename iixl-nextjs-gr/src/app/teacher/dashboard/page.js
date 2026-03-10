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
    const [success, setSuccess] = useState('');
    const [expandedStudentId, setExpandedStudentId] = useState(null);
    const [isAddingStudent, setIsAddingStudent] = useState(false);
    const [studentForm, setStudentForm] = useState({ name: '', email: '', password: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const studentsPerPage = 10;

    const [liveData, setLiveData] = useState([]);
    const [settingsForm, setSettingsForm] = useState([]);

    // Assignments State
    const [assignments, setAssignments] = useState([]);
    const [isAssigning, setIsAssigning] = useState(false);
    const [curriculumData, setCurriculumData] = useState({ curriculum: [], students: [] });
    const [assignForm, setAssignForm] = useState({ micro_skill_id: '', student_ids: [], due_date: '' });
    const [curriculumSelection, setCurriculumSelection] = useState({ subject_id: '', unit_id: '' });
    const [analyticsStudentSelect, setAnalyticsStudentSelect] = useState('All');
    const [analyticsSearchFilter, setAnalyticsSearchFilter] = useState('');

    const toggleStudent = (id) => {
        setExpandedStudentId(expandedStudentId === id ? null : id);
    };

    useEffect(() => {
        let interval;
        if (view === 'live') {
            const fetchLive = async () => {
                try {
                    const res = await fetch('/api/teacher/live-classroom');
                    if (res.ok) {
                        const payload = await res.json();
                        setLiveData(payload.liveData);
                    }
                } catch (e) { console.error('Live fetch error:', e); }
            };
            fetchLive();
            interval = setInterval(fetchLive, 10000);
        } else if (view === 'assignments') {
            const fetchAssignments = async () => {
                try {
                    const res = await fetch('/api/teacher/assignments');
                    const d = await res.json();
                    if (res.ok) setAssignments(d.assignments || []);
                } catch (e) { console.error('Error fetching assignments:', e); }
            };
            fetchAssignments();
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [view]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Pass local timezone offset to sync UTC accurately for "Today"
                const tzOffset = new Date().getTimezoneOffset();

                const res = await fetch('/api/teacher/dashboard-data', {
                    headers: { 'x-timezone-offset': tzOffset.toString() }
                });

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Failed to load dashboard data');
                }
                const payload = await res.json();
                setData(payload);
                if (payload.meta?.teacherSpecialties) {
                    setSettingsForm(payload.meta.teacherSpecialties);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const handleAddStudent = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            const res = await fetch('/api/teacher/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(studentForm),
            });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload.error || 'Failed to add student');
            setSuccess('Student added successfully!');
            setStudentForm({ name: '', email: '', password: '' });
            setIsAddingStudent(false);
            // Refresh dashboard
            const freshRes = await fetch('/api/teacher/dashboard-data');
            const freshData = await freshRes.json();
            setData(freshData);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDownloadReport = () => {
        window.location.href = '/api/teacher/export-report';
    };

    const handleSaveSettings = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/teacher/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ specialties: settingsForm })
            });
            if (!res.ok) throw new Error('Failed to save settings');
            setSuccess('Settings saved successfully!');

            // Refetch dashboard data
            const freshRes = await fetch('/api/teacher/dashboard-data');
            const freshData = await freshRes.json();
            setData(freshData);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (studentId, studentName) => {
        const newPassword = prompt(`Enter a new temporary password for ${studentName} (Min 6 chars):`);
        if (!newPassword) return;
        if (newPassword.length < 6) {
            alert('Password must be at least 6 characters.');
            return;
        }

        try {
            const res = await fetch('/api/teacher/students', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId, newPassword })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to reset password');
            }
            alert(`Successfully reset password for ${studentName}!`);
        } catch (e) {
            alert(`Error: ${e.message}`);
        }
    };

    const handleOpenAssignModal = async () => {
        setIsAssigning(true);
        try {
            const res = await fetch('/api/teacher/curriculum');
            if (res.ok) {
                const data = await res.json();
                setCurriculumData(data);
                if (data.curriculum.length > 0) {
                    setCurriculumSelection({ subject_id: data.curriculum[0].id, unit_id: '' });
                }
            }
        } catch (e) { console.error(e); }
    };

    const handleCreateAssignment = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            const payload = {
                micro_skill_id: assignForm.micro_skill_id,
                student_ids: assignForm.student_ids.includes('all') ? curriculumData.students.map(s => s.id) : assignForm.student_ids,
                due_date: assignForm.due_date
            };
            const res = await fetch('/api/teacher/assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to create assignment');
            setSuccess('Assignment created successfully!');
            setIsAssigning(false);
            setAssignForm({ micro_skill_id: '', student_ids: [], due_date: '' });

            // Refresh
            const freshRes = await fetch('/api/teacher/assignments');
            const freshData = await freshRes.json();
            setAssignments(freshData.assignments || []);
            setTimeout(() => setSuccess(''), 3000);
        } catch (e) {
            setError(e.message);
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleDeleteAssignment = async (id) => {
        if (!confirm('Are you sure you want to cancel this assignment?')) return;
        try {
            const res = await fetch(`/api/teacher/assignments?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setAssignments(assignments.filter(a => a.id !== id));
            }
        } catch (e) { console.error(e); }
    };

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
                <div onClick={() => setView('live')} className={`${styles.navItem} ${view === 'live' ? styles.navItemActive : ''}`}>
                    <span className={styles.navIcon}>🔴</span>
                    <span className={styles.navText}>Live Grid</span>
                </div>
                <div onClick={() => setView('assignments')} className={`${styles.navItem} ${view === 'assignments' ? styles.navItemActive : ''}`}>
                    <span className={styles.navIcon}>⭐</span>
                    <span className={styles.navText}>Assignments</span>
                </div>
                <div onClick={() => setView('analytics')} className={`${styles.navItem} ${view === 'analytics' ? styles.navItemActive : ''}`}>
                    <span className={styles.navIcon}>📈</span>
                    <span className={styles.navText}>Analytics</span>
                </div>
                <div onClick={() => setView('trouble')} className={`${styles.navItem} ${view === 'trouble' ? styles.navItemActive : ''}`}>
                    <span className={styles.navIcon}>⚠️</span>
                    <span className={styles.navText}>Trouble Spots</span>
                </div>

                <div className={styles.navSectionLabel}>System</div>
                <div onClick={() => setView('settings')} className={`${styles.navItem} ${view === 'settings' ? styles.navItemActive : ''}`}><span className={styles.navIcon}>⚙️</span><span className={styles.navText}>Settings</span></div>
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
                        <div className={styles.avatar} style={{ background: 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)', color: 'white' }}>
                            {data?.meta?.teacherName ? data.meta.teacherName[0].toUpperCase() : 'T'}
                        </div>
                        <span>{data?.meta?.teacherName || 'Teacher'}</span>
                    </div>
                </header>

                <div className={styles.dashboardBody}>
                    <div className={styles.pageHeader}>
                        <div className={styles.titleArea}>
                            <h1>{view === 'overview' ? 'Analytics Overview' : view === 'students' ? 'Student Directory' : view === 'live' ? 'Live Classroom Grid' : view === 'settings' ? 'Teacher Settings' : view === 'assignments' ? 'Skill Assignments' : view === 'analytics' ? 'Student Analytics' : 'Trouble Spots'}</h1>
                            <p>{view === 'overview' ? 'Monitor your class\'s progress and identify students who need extra support.' : view === 'students' ? 'Review individual student performance and history.' : view === 'live' ? 'Real-time monitor of student activity right now.' : view === 'settings' ? 'Configure your classroom settings.' : view === 'assignments' ? 'Assign specific skills and track completion.' : view === 'analytics' ? 'Review detailed practice history and skill performance for each student.' : 'Review specific skills where your students are encountering difficulties.'}</p>
                        </div>
                        <div className={styles.headerActions}>
                            {success && <div style={{ color: '#22C55E' }}>{success}</div>}
                            {error && <div style={{ color: '#EF4444' }}>{error}</div>}
                            {view === 'students' && (
                                <button className={`${styles.actionBtn} ${styles.primaryAction}`} onClick={() => setIsAddingStudent(!isAddingStudent)}>
                                    {isAddingStudent ? 'Cancel' : '+ Add Student'}
                                </button>
                            )}
                            {view === 'assignments' && (
                                <button className={`${styles.actionBtn} ${styles.primaryAction}`} onClick={handleOpenAssignModal}>
                                    + Assign Skill
                                </button>
                            )}
                            <button className={`${styles.actionBtn} ${styles.secondaryAction}`} onClick={handleDownloadReport}>Download Report</button>
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
                                                            <div className={styles.smAvatar} style={{ background: s.proficiency > 80 ? '#F0FDF4' : '#F1F5F9', position: 'relative' }}>
                                                                {s.name[0]}
                                                                {s.isPracticingLive && <div style={{ position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, background: '#22C55E', borderRadius: '50%', border: '2px solid white' }} title="Practicing right now!"></div>}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                                    {s.name}
                                                                    {s.isPracticingLive && <span style={{ fontSize: '0.65rem', background: '#DCFCE7', color: '#16A34A', padding: '0.1rem 0.3rem', borderRadius: '4px', fontWeight: 800 }}>LIVE</span>}
                                                                </div>
                                                                <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>4th Grade</div>
                                                            </div>
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
                                                                        <Link href={`/teacher/student/${s.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                                                                            <button className={styles.btnAction} style={{ width: '100%', borderColor: '#6366F1' }}>View Full Profile</button>
                                                                        </Link>
                                                                    </div>
                                                                    <div className={styles.insightCard}>
                                                                        <h5>AI Insight</h5>
                                                                        <p>{s.aiInsight}</p>
                                                                    </div>
                                                                    <div className={styles.insightCard} style={{ marginTop: '0.75rem', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                                                                        <h5>Pacing Analysis</h5>
                                                                        <p>Averages <strong>{Math.floor(s.avgSecondsPerQuestion / 60)}m {s.avgSecondsPerQuestion % 60}s</strong> per question.</p>
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
                                                                    <div className={styles.historyPlaceholder} style={{ background: '#F8FAFC', borderRadius: '8px', padding: '0.5rem', marginBottom: '1rem' }}>
                                                                        {s.recentGraphPoints && s.recentGraphPoints.length > 0 ? (
                                                                            <svg viewBox="0 0 200 60" style={{ width: '100%', height: '60px' }}>
                                                                                <path
                                                                                    d={`M ${s.recentGraphPoints.map((val, i) => {
                                                                                        const x = (i / Math.max(1, s.recentGraphPoints.length - 1)) * 200;
                                                                                        const y = val === 1 ? 15 : 45; // 1 = right, 0 = wrong
                                                                                        return `${x},${y}`;
                                                                                    }).join(' L ')}`}
                                                                                    fill="none"
                                                                                    stroke="#6366F1"
                                                                                    strokeWidth="2"
                                                                                    strokeLinecap="round"
                                                                                    strokeLinejoin="round"
                                                                                />
                                                                                {s.recentGraphPoints.map((val, i) => {
                                                                                    const x = (i / Math.max(1, s.recentGraphPoints.length - 1)) * 200;
                                                                                    const y = val === 1 ? 15 : 45;
                                                                                    return <circle key={i} cx={x} cy={y} r="3" fill="#6366F1" />;
                                                                                })}
                                                                            </svg>
                                                                        ) : (
                                                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', lineHeight: '60px' }}>No recent attempt data...</div>
                                                                        )}
                                                                    </div>
                                                                    <div style={{ marginTop: '1rem' }}>
                                                                        {s.assessmentHistory?.map((hist, i) => (
                                                                            <div key={i} className={styles.historyEntry}>
                                                                                <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hist.name}</span>
                                                                                <span>{hist.dateStr}</span>
                                                                                <span style={{ color: hist.score >= 80 ? '#22C55E' : hist.score >= 50 ? '#6366F1' : '#F97316', fontWeight: 700 }}>{hist.score}%</span>
                                                                            </div>
                                                                        ))}
                                                                        {(!s.assessmentHistory || s.assessmentHistory.length === 0) && (
                                                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>No history to display.</div>
                                                                        )}
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

                    {view === 'assignments' && (
                        <div>
                            {assignments.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', color: '#64748B' }}>
                                    <h3 style={{ fontSize: '1.2rem', color: '#1E293B', marginBottom: '0.5rem' }}>No Active Assignments</h3>
                                    <p style={{ marginBottom: '1.5rem' }}>Assign specific skills for your students to practice.</p>
                                    <button onClick={handleOpenAssignModal} style={{ background: '#6366F1', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>+ Create First Assignment</button>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gap: '1rem' }}>
                                    {assignments.map(a => (
                                        <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', background: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                                            <div>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1E293B' }}>{a.skill_name}</span>
                                                    {a.due_date && <span style={{ background: '#FEF08A', color: '#854D0E', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>Due {new Date(a.due_date).toLocaleDateString()}</span>}
                                                </div>
                                                <div style={{ fontSize: '0.875rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                                    <span>Assigned to: <strong>{a.student_count} student(s)</strong> <span style={{ opacity: 0.7 }}>({a.students})</span></span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{ background: '#DCFCE7', color: '#16A34A', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 800 }}>{a.completed_count}/{a.student_count} Completed</span>
                                                        <div style={{ width: '100px', height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                                                            <div style={{ width: `${(a.completed_count / a.student_count) * 100}%`, height: '100%', background: '#22C55E' }}></div>
                                                        </div>
                                                    </span>
                                                </div>
                                            </div>
                                            <button onClick={() => handleDeleteAssignment(a.id)} style={{ padding: '0.5rem 1rem', background: '#FEE2E2', color: '#EF4444', border: '1px solid #FCA5A5', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                                                Cancel Assignment
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {view === 'live' && (() => {
                        const totalStudents = liveData.length;
                        const activeStudents = liveData.filter(d => d.status !== 'offline');
                        const offlineStudents = liveData.filter(d => d.status === 'offline');
                        const idleCount = liveData.filter(d => d.status === 'idle').length;
                        const needHelpCount = liveData.filter(d => d.alert === 'needs-help').length;
                        const uniqueSkills = new Set(liveData.filter(d => d.status === 'active' && d.currentSkill && d.currentSkill !== 'None').map(d => d.currentSkill)).size;
                        const questionsHour = liveData.reduce((acc, d) => acc + (d.attemptsCount || 0), 0);

                        return (
                            <div style={{ background: '#e6f8f1', padding: '3rem', margin: '-2rem', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 60px)' }}>
                                <h1 style={{ fontFamily: '"Georgia", serif', color: '#567568', fontSize: '2.5rem', fontWeight: 400, marginBottom: '2rem', marginTop: 0 }}>
                                    LIVE CLASSROOM
                                </h1>

                                {/* Stat Strip */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', background: '#fff', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '3rem', overflow: 'hidden' }}>
                                    <div style={{ padding: '2rem 1rem', textAlign: 'center', borderTop: '5px solid #0EA5E9', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <div style={{ fontSize: '2.5rem', color: '#0EA5E9', marginBottom: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem' }}>
                                            <span style={{ fontSize: '2rem' }}>👥</span> <span style={{ fontWeight: 300 }}>{totalStudents}</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700, letterSpacing: '0.05em' }}>TOTAL<br />STUDENTS</div>
                                    </div>
                                    <div style={{ padding: '2rem 1rem', textAlign: 'center', borderTop: '5px solid #94A3B8', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <div style={{ fontSize: '2.5rem', color: '#94A3B8', marginBottom: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem' }}>
                                            <span style={{ fontSize: '2rem', border: '2px solid #94a3b8', borderRadius: '4px', padding: '0 4px', paddingBottom: '2px' }}>⏸</span> <span style={{ fontWeight: 300 }}>{idleCount}</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700, letterSpacing: '0.05em' }}>STUDENTS<br />IDLE</div>
                                    </div>
                                    <div style={{ padding: '2rem 1rem', textAlign: 'center', borderTop: '5px solid #F97316', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <div style={{ fontSize: '2.5rem', color: '#F97316', marginBottom: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem' }}>
                                            <span style={{ fontSize: '2rem' }}>⚠️</span> <span style={{ fontWeight: 300 }}>{needHelpCount}</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700, letterSpacing: '0.05em' }}>STUDENTS MAY<br />NEED HELP</div>
                                    </div>
                                    <div style={{ padding: '2rem 1rem', textAlign: 'center', borderTop: '5px solid #FBBF24', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <div style={{ fontSize: '2.5rem', color: '#FBBF24', marginBottom: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem' }}>
                                            <span style={{ fontSize: '2rem' }}>🧩</span> <span style={{ fontWeight: 300 }}>{uniqueSkills}</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700, letterSpacing: '0.05em' }}>SKILLS<br />IN PRACTICE</div>
                                    </div>
                                    <div style={{ padding: '2rem 1rem', textAlign: 'center', borderTop: '5px solid #84CC16', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <div style={{ fontSize: '2.5rem', color: '#84CC16', marginBottom: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem' }}>
                                            <span style={{ fontSize: '2rem' }}>✏️</span> <span style={{ fontWeight: 300 }}>{questionsHour}</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700, letterSpacing: '0.05em' }}>QUESTIONS PRACTICED<br />(PAST HOUR)</div>
                                    </div>
                                </div>

                                {/* Banner */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #c1ded1', paddingBottom: '1rem', marginBottom: '2rem' }}>
                                    <h3 style={{ fontSize: '1.75rem', color: '#567568', fontWeight: 400, margin: 0 }}>Student activity wall</h3>
                                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', fontSize: '0.875rem', color: '#567568', fontWeight: 600 }}>
                                        <span style={{ cursor: 'pointer' }}>Sort by ▾</span>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 400 }}>
                                            Group by skill:
                                            <div style={{ width: '36px', height: '20px', background: '#cbd5e1', borderRadius: '10px', position: 'relative' }}>
                                                <div style={{ width: '16px', height: '16px', background: 'white', borderRadius: '50%', position: 'absolute', left: '2px', top: '2px', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}></div>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                    {activeStudents.length === 0 ? (
                                        <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: '#567568', fontStyle: 'italic' }}>Loading live data or no students currently active...</div>
                                    ) : (
                                        (() => {
                                            // Group by class
                                            const grouped = activeStudents.reduce((acc, student) => {
                                                const group = student.classGroup || 'Unassigned';
                                                if (!acc[group]) acc[group] = [];
                                                acc[group].push(student);
                                                return acc;
                                            }, {});

                                            return Object.entries(grouped).map(([groupName, students]) => (
                                                <React.Fragment key={groupName}>
                                                    {Object.keys(grouped).length > 1 && (
                                                        <div style={{ gridColumn: '1 / -1', marginTop: '1rem', borderBottom: '2px solid #c1ded1', paddingBottom: '0.5rem' }}>
                                                            <h4 style={{ margin: 0, color: '#0EA5E9', fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{groupName} Data</h4>
                                                        </div>
                                                    )}
                                                    {students.map(student => (
                                                        <div key={student.id} style={{ background: '#fff', border: student.alert === 'needs-help' ? '2px solid #F97316' : '1px solid #cbd5e1', borderRadius: '4px', padding: '1.25rem', display: 'flex', flexDirection: 'column', height: '160px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', position: 'relative' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                                <Link href={`/teacher/student/${student.id}`} style={{ fontWeight: 600, color: '#334155', fontSize: '1.1rem', textDecoration: 'none' }} onMouseEnter={e => e.target.style.textDecoration = 'underline'} onMouseLeave={e => e.target.style.textDecoration = 'none'}>
                                                                    {student.name}
                                                                </Link>
                                                                <div style={{ border: student.status === 'active' ? 'none' : '2px solid #cbd5e1', background: student.status === 'active' ? '#84CC16' : 'transparent', color: student.status === 'active' ? 'white' : '#94a3b8', borderRadius: '4px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 700 }}>
                                                                    {student.status === 'active' ? '▶' : '⏸'}
                                                                </div>
                                                            </div>
                                                            <div style={{ fontSize: '0.875rem', color: '#64748B', lineHeight: '1.4', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                                                {student.currentSkill && student.currentSkill !== 'None' ? `I (${student.currentSkill})` : 'No active skill observed recently.'}
                                                            </div>

                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '1rem' }}>
                                                                <div style={{ flex: 1, paddingRight: '1.5rem' }}>
                                                                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.4rem', fontWeight: 600 }}>{student.attemptsCount || 0} questions answered</div>
                                                                    <div style={{ display: 'flex', gap: '4px', height: '6px' }}>
                                                                        {(student.recentHistory && student.recentHistory.length > 0) ? student.recentHistory.map((isCorrect, idx) => (
                                                                            <div key={idx} style={{ flex: 1, background: isCorrect ? '#A3E635' : '#FCA5A5', borderRadius: '2px' }} />
                                                                        )) : (
                                                                            <div style={{ width: '100%', background: '#f1f5f9', borderRadius: '2px' }} />
                                                                        )}
                                                                        {student.recentHistory && student.recentHistory.length > 0 && Array(Math.max(0, 5 - student.recentHistory.length)).fill(0).map((_, i) => (
                                                                            <div key={`extra-${i}`} style={{ flex: 1, background: '#D9F99D', borderRadius: '2px' }} />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div style={{ fontSize: '2.5rem', fontWeight: 300, color: '#0EA5E9', lineHeight: '0.9' }}>
                                                                    {student.score || 0}
                                                                </div>
                                                            </div>
                                                            {student.alert === 'needs-help' && (
                                                                <div style={{ position: 'absolute', top: -10, right: -10, background: '#F97316', color: 'white', fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(249, 115, 22, 0.3)' }}>NEEDS HELP</div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </React.Fragment>
                                            ));
                                        })()
                                    )}
                                </div>

                                <div style={{ textAlign: 'center', marginTop: '3rem', color: '#567568', fontSize: '1rem', fontWeight: 600 }}>
                                    <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                        <span style={{ border: '2px solid currentColor', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>?</span>
                                        Show {offlineStudents.length} inactive students ▾
                                    </span>
                                </div>
                            </div>
                        );
                    })()}

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
                            <div className={styles.cardTop}>
                                <h3>Student Directory</h3>
                            </div>

                            {isAddingStudent && (
                                <form onSubmit={handleAddStudent} className={styles.addStudentForm} style={{ padding: '1rem', background: '#F8FAFC', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'end', flexWrap: 'wrap' }}>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: '150px' }}>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Name</span>
                                        <input type="text" value={studentForm.name} onChange={e => setStudentForm({ ...studentForm, name: e.target.value })} required style={{ padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '4px' }} />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: '150px' }}>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Email</span>
                                        <input type="email" value={studentForm.email} onChange={e => setStudentForm({ ...studentForm, email: e.target.value })} required style={{ padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '4px' }} />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: '150px' }}>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Class / Group</span>
                                        <input type="text" placeholder="e.g. Period 1" value={studentForm.classGroup || ''} onChange={e => setStudentForm({ ...studentForm, classGroup: e.target.value })} style={{ padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '4px' }} />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: '150px' }}>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Temp Password</span>
                                        <input type="password" value={studentForm.password} onChange={e => setStudentForm({ ...studentForm, password: e.target.value })} required minLength={6} style={{ padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '4px' }} />
                                    </label>
                                    <button type="submit" className={`${styles.actionBtn} ${styles.primaryAction}`} style={{ height: 'fit-content', whiteSpace: 'nowrap' }}>Create Login</button>
                                </form>
                            )}

                            {(() => {
                                const indexOfLastStudent = currentPage * studentsPerPage;
                                const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
                                const currentStudents = students.slice(indexOfFirstStudent, indexOfLastStudent);
                                const totalPages = Math.ceil(students.length / studentsPerPage);

                                return (
                                    <>
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
                                                {currentStudents.map(s => (
                                                    <tr key={s.id}>
                                                        <td>
                                                            <strong>{s.name}</strong>
                                                            {s.isPracticingLive && <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', background: '#DCFCE7', color: '#16A34A', padding: '0.1rem 0.3rem', borderRadius: '4px', fontWeight: 800 }}>LIVE</span>}
                                                        </td>
                                                        <td>{s.email}</td>
                                                        <td>{s.questions} Ques ({s.avgSecondsPerQuestion}s/q)</td>
                                                        <td>{s.mastered} Skills</td>
                                                        <td style={{ display: 'flex', gap: '0.5rem' }}>
                                                            <button className={styles.viewDetails} onClick={() => toggleStudent(s.id)}>Review History</button>
                                                            <button className={styles.viewDetails} style={{ color: '#EF4444', borderColor: '#FCA5A5' }} onClick={() => handleResetPassword(s.id, s.name)}>Reset Password</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {totalPages > 1 && (
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', marginTop: '1rem', padding: '1rem 0' }}>
                                                <button
                                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                    disabled={currentPage === 1}
                                                    style={{ padding: '0.5rem 1rem', border: '1px solid #CBD5E1', borderRadius: '6px', background: currentPage === 1 ? '#F1F5F9' : '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                                                >
                                                    Previous
                                                </button>
                                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748B' }}>
                                                    Page {currentPage} of {totalPages}
                                                </span>
                                                <button
                                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                    disabled={currentPage === totalPages}
                                                    style={{ padding: '0.5rem 1rem', border: '1px solid #CBD5E1', borderRadius: '6px', background: currentPage === totalPages ? '#F1F5F9' : '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    )}

                    {view === 'analytics' && (() => {
                        const filteredStudents = students.filter(s => {
                            if (analyticsStudentSelect !== 'All' && String(s.id) !== String(analyticsStudentSelect)) return false;
                            if (analyticsSearchFilter && !s.name.toLowerCase().includes(analyticsSearchFilter.toLowerCase())) return false;
                            return true;
                        });
                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                <div className={styles.whiteCard} style={{ padding: '2rem', overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                        <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 300, color: '#64748B', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            {analyticsStudentSelect === 'All' ? 'STUDENTS QUICKVIEW' : 'STUDENT REPORT'}
                                            <span style={{ cursor: 'pointer', opacity: 0.5 }}>🖨️</span>
                                        </h2>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <input
                                                type="text"
                                                placeholder="Search student..."
                                                value={analyticsSearchFilter}
                                                onChange={(e) => setAnalyticsSearchFilter(e.target.value)}
                                                style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #CBD5E1', width: '200px' }}
                                            />
                                            <select
                                                value={analyticsStudentSelect}
                                                onChange={e => setAnalyticsStudentSelect(e.target.value)}
                                                style={{ border: '1px solid #CBD5E1', padding: '0.5rem 1rem', borderRadius: '4px', background: '#fff', color: '#64748B', fontWeight: 600, minWidth: '200px', cursor: 'pointer' }}>
                                                <option value="All">All students</option>
                                                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <h3 style={{ fontSize: '1.5rem', fontWeight: 300, color: '#334155', marginBottom: '1.5rem' }}>
                                        In the last 30 days, your students have...
                                    </h3>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '2rem', marginBottom: '2rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingLeft: '1rem' }}>
                                            <span style={{ fontSize: '2rem', color: '#84CC16' }}>✎</span>
                                            <div>
                                                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em' }}>ANSWERED</div>
                                                <div style={{ fontSize: '2rem', fontWeight: 300, color: '#334155' }}>
                                                    {filteredStudents.reduce((acc, s) => acc + s.questions, 0).toLocaleString()}
                                                </div>
                                                <div style={{ fontSize: '0.875rem', color: '#64748B' }}>QUESTIONS</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '1px solid #E2E8F0', paddingLeft: '3rem' }}>
                                            <span style={{ fontSize: '2rem', color: '#38BDF8' }}>⏱</span>
                                            <div>
                                                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em' }}>SPENT</div>
                                                <div style={{ fontSize: '2rem', fontWeight: 300, color: '#334155' }}>
                                                    {(() => {
                                                        const totalMins = filteredStudents.reduce((acc, s) => acc + (parseInt(s.timeSpent) || 0), 0);
                                                        const hrs = Math.floor(totalMins / 60);
                                                        const mins = totalMins % 60;
                                                        return hrs > 0 ? `${hrs} hr ${mins} min` : `${mins} min`;
                                                    })()}
                                                </div>
                                                <div style={{ fontSize: '0.875rem', color: '#64748B' }}>PRACTICING</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '1px solid #E2E8F0', paddingLeft: '3rem' }}>
                                            <span style={{ fontSize: '2rem', color: '#D97706' }}>🧩</span>
                                            <div>
                                                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em' }}>MADE PROGRESS IN</div>
                                                <div style={{ fontSize: '2rem', fontWeight: 300, color: '#334155' }}>
                                                    {(() => {
                                                        const uniqueSkills = new Set();
                                                        filteredStudents.forEach(s => s.analyticsSkills?.forEach(sk => uniqueSkills.add(sk.id)));
                                                        return uniqueSkills.size;
                                                    })()}
                                                </div>
                                                <div style={{ fontSize: '0.875rem', color: '#64748B' }}>SKILLS</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '3rem' }}>
                                        {/* Practice By Category - Donut Chart Mockup */}
                                        <div>
                                            <h4 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', marginBottom: '1rem' }}>PRACTICE BY CATEGORY</h4>
                                            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                                                <svg viewBox="0 0 100 100" style={{ width: '120px', height: '120px', transform: 'rotate(-90deg)' }}>
                                                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#F1F5F9" strokeWidth="16" />
                                                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#84CC16" strokeWidth="16" strokeDasharray="251.2" strokeDashoffset="100.48" />
                                                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#38BDF8" strokeWidth="16" strokeDasharray="251.2" strokeDashoffset="210" style={{ transform: 'rotate(216deg)', transformOrigin: '50% 50%' }} />
                                                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#FBBF24" strokeWidth="16" strokeDasharray="251.2" strokeDashoffset="230" style={{ transform: 'rotate(270deg)', transformOrigin: '50% 50%' }} />
                                                </svg>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><span style={{ background: '#84CC16', color: '#fff', padding: '0.1rem 0.3rem', borderRadius: '4px', fontWeight: 800, fontSize: '0.75rem' }}>60%</span> <span style={{ color: '#334155' }}>Math Fundamentals</span></div>
                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><span style={{ background: '#38BDF8', color: '#fff', padding: '0.1rem 0.3rem', borderRadius: '4px', fontWeight: 800, fontSize: '0.75rem' }}>25%</span> <span style={{ color: '#334155' }}>Algebra</span></div>
                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><span style={{ background: '#FBBF24', color: '#fff', padding: '0.1rem 0.3rem', borderRadius: '4px', fontWeight: 800, fontSize: '0.75rem' }}>15%</span> <span style={{ color: '#334155' }}>Geometry</span></div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Practice By Day - Bar Chart */}
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                <h4 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', margin: 0 }}>PRACTICE BY DAY</h4>
                                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#64748B' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#38BDF8' }}></span> Weeknights</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#84CC16' }}></span> Weekdays</div>
                                                </div>
                                            </div>
                                            <div style={{ height: '140px', display: 'flex', alignItems: 'flex-end', gap: '0.5rem', position: 'relative', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.5rem' }}>
                                                {activityData.map((val, i) => {
                                                    const d = new Date();
                                                    d.setDate(d.getDate() - (6 - i));
                                                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                                    const heightPct = Math.max(5, (val / (Math.max(...activityData, 10))) * 100);

                                                    return (
                                                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                                            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, visibility: val > 0 ? 'visible' : 'hidden' }}>{val}</div>
                                                            <div style={{ width: '40%', height: `${heightPct}px`, background: isWeekend ? '#38BDF8' : '#84CC16', transition: 'height 0.3s' }}></div>
                                                            <div style={{ fontSize: '0.65rem', color: '#94A3B8', transform: 'rotate(-45deg)', transformOrigin: 'top left', marginTop: '0.5rem', whiteSpace: 'nowrap' }}>
                                                                {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.whiteCard} style={{ padding: '0', overflow: 'hidden' }}>
                                    <div style={{ padding: '1.5rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.75rem', color: '#64748B', fontWeight: 300, display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            Students <span style={{ fontSize: '0.875rem', background: '#F1F5F9', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 600 }}>Sort by: Name ▾</span>
                                        </h3>
                                        <div style={{ fontSize: '0.875rem', color: '#64748B', border: '1px solid #CBD5E1', padding: '0.4rem 0.8rem', borderRadius: '4px', background: '#fff' }}>
                                            Show week of ... ▾
                                        </div>
                                    </div>


                                    <div>
                                        {filteredStudents.length === 0 ? (
                                            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B', fontStyle: 'italic' }}>
                                                No students matched your search criteria.
                                            </div>
                                        ) : filteredStudents.map(s => (
                                            <div key={s.id} style={{ borderBottom: '6px solid #F1F5F9', padding: '1.5rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #E2E8F0' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#DEF7EC', color: '#046C4E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>👤</div>
                                                        <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#0EA5E9', fontWeight: 600 }}>{s.name}</h4>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem', color: '#64748B', fontWeight: 600 }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span style={{ color: '#84CC16', fontSize: '1.1rem' }}>✎</span> {s.questions} questions</span>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span style={{ color: '#38BDF8', fontSize: '1.1rem' }}>⏱</span> {s.timeSpent}</span>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span style={{ color: '#94A3B8', fontSize: '1.1rem' }}>📅</span> {s.analyticsSkills?.[0]?.lastPracticed ? `Practiced ${Math.floor((new Date().getTime() - new Date(s.analyticsSkills[0].lastPracticed).getTime()) / (1000 * 3600 * 24))} days ago` : 'N/A'}</span>
                                                    </div>
                                                </div>

                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                                    <tbody>
                                                        {s.analyticsSkills?.slice(0, 5).map(skill => (
                                                            <tr key={skill.id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                                                                <td style={{ padding: '0.6rem 0', width: '5%', color: '#FBBF24', fontSize: '1rem' }}>{skill.score >= 90 ? '★' : ''}</td>
                                                                <td style={{ padding: '0.6rem 0', width: '12%', color: '#94A3B8', fontWeight: 600 }}>I ({skill.code})</td>
                                                                <td style={{ padding: '0.6rem 0', width: '40%', color: '#334155' }}>
                                                                    <Link href={`/teacher/student/${s.id}`} style={{ textDecoration: 'none', color: 'inherit' }} onMouseEnter={e => e.target.style.textDecoration = 'underline'} onMouseLeave={e => e.target.style.textDecoration = 'none'}>
                                                                        {skill.name}
                                                                    </Link>
                                                                </td>
                                                                <td style={{ padding: '0.6rem 0', width: '10%', textAlign: 'center', color: '#64748B' }}>{skill.questions}</td>
                                                                <td style={{ padding: '0.6rem 0', width: '10%', textAlign: 'center', color: '#64748B' }}>{skill.timeMin} min</td>
                                                                <td style={{ padding: '0.6rem 0', width: '23%' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                        <span style={{ color: '#CBD5E1', fontSize: '0.75rem' }}>0</span>
                                                                        <div style={{ flex: 1, height: '4px', background: '#F1F5F9', position: 'relative' }}>
                                                                            <div style={{ position: 'absolute', top: '-1px', left: 0, bottom: '-1px', width: `${skill.score}%`, background: '#84CC16', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                                                <div style={{ width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: '6px solid #84CC16', marginRight: '-6px' }}></div>
                                                                            </div>
                                                                        </div>
                                                                        <span style={{ fontWeight: 800, color: '#1E293B', width: '28px', textAlign: 'right' }}>{skill.score}</span>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {(!s.analyticsSkills || s.analyticsSkills.length === 0) && (
                                                            <tr><td colSpan="6" style={{ padding: '1rem 0', color: '#94A3B8', textAlign: 'center' }}>No skills practiced yet.</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                                {s.analyticsSkills?.length > 5 && (
                                                    <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: '#0EA5E9', cursor: 'pointer', fontWeight: 600 }}>
                                                        See all {s.analyticsSkills.length} skills ▾
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {view === 'settings' && (
                        <div className={styles.whiteCard} style={{ padding: '2rem' }}>
                            <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Subject Specialization</h2>
                            <p style={{ color: '#64748B', marginBottom: '2rem' }}>
                                Are you a departmentalized teacher? Select the specific subjects you teach.
                                Your dashboard analytics and student progress reports will automatically filter to only show these subjects.
                                Leave all un-checked if you are a homeroom teacher covering all subjects.
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                                {data?.meta?.allSubjects?.map(subj => {
                                    const isSelected = settingsForm.includes(String(subj.id));
                                    return (
                                        <div
                                            key={subj.id}
                                            onClick={() => {
                                                if (isSelected) {
                                                    setSettingsForm(settingsForm.filter(id => id !== String(subj.id)));
                                                } else {
                                                    setSettingsForm([...settingsForm, String(subj.id)]);
                                                }
                                            }}
                                            style={{
                                                padding: '1rem',
                                                border: `2px solid ${isSelected ? '#6366F1' : '#E2E8F0'}`,
                                                borderRadius: '12px',
                                                cursor: 'pointer',
                                                background: isSelected ? '#EEF2FF' : '#fff',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{
                                                width: '20px', height: '20px', borderRadius: '4px',
                                                background: isSelected ? '#6366F1' : '#fff', border: `2px solid ${isSelected ? '#6366F1' : '#CBD5E1'}`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                {isSelected && <span style={{ color: '#fff', fontSize: '14px' }}>✓</span>}
                                            </div>
                                            <span style={{ fontWeight: 600, color: isSelected ? '#4F46E5' : '#334155' }}>{subj.name}</span>
                                        </div>
                                    )
                                })}
                            </div>

                            <button onClick={handleSaveSettings} className={`${styles.actionBtn} ${styles.primaryAction}`}>
                                Save Settings
                            </button>
                        </div>
                    )}

                </div>
            </main>

            {/* Assign Modal */}
            {isAssigning && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#1E293B' }}>Create Assignment</h2>
                        <form onSubmit={handleCreateAssignment}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>1. Select Subject</label>
                                <select
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                                    value={curriculumSelection.subject_id}
                                    onChange={e => setCurriculumSelection({ subject_id: e.target.value, unit_id: '' })}
                                    required
                                >
                                    <option value="" disabled>Choose Subject...</option>
                                    {curriculumData.curriculum.map(sub => (
                                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                                    ))}
                                </select>
                            </div>

                            {curriculumSelection.subject_id && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>2. Select Unit</label>
                                    <select
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                                        value={curriculumSelection.unit_id}
                                        onChange={e => {
                                            setCurriculumSelection({ ...curriculumSelection, unit_id: e.target.value });
                                            setAssignForm({ ...assignForm, micro_skill_id: '' });
                                        }}
                                        required
                                    >
                                        <option value="" disabled>Choose Unit...</option>
                                        {curriculumData.curriculum.find(s => s.id === curriculumSelection.subject_id)?.units.map(unit => (
                                            <option key={unit.id} value={unit.id}>{unit.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {curriculumSelection.unit_id && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>3. Select Skill</label>
                                    <select
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                                        value={assignForm.micro_skill_id}
                                        onChange={e => setAssignForm({ ...assignForm, micro_skill_id: e.target.value })}
                                        required
                                    >
                                        <option value="" disabled>Choose Skill...</option>
                                        {curriculumData.curriculum.find(s => s.id === curriculumSelection.subject_id)
                                            ?.units.find(u => u.id === curriculumSelection.unit_id)
                                            ?.microskills.map(ms => (
                                                <option key={ms.id} value={ms.id}>{ms.name}</option>
                                            ))}
                                    </select>
                                </div>
                            )}

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>4. Assign To</label>
                                <select
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                                    multiple
                                    value={assignForm.student_ids}
                                    onChange={e => {
                                        const values = Array.from(e.target.selectedOptions, option => option.value);
                                        // If "all" is selected, clear other selections
                                        if (values.includes('all')) {
                                            setAssignForm({ ...assignForm, student_ids: ['all'] });
                                        } else {
                                            setAssignForm({ ...assignForm, student_ids: values.filter(v => v !== 'all') });
                                        }
                                    }}
                                    required
                                >
                                    <option value="all">Entire Class</option>
                                    {curriculumData.students.map(st => (
                                        <option key={st.id} value={st.id}>{st.name}</option>
                                    ))}
                                </select>
                                <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.25rem' }}>Hold Cmd/Ctrl to select multiple individuals.</div>
                            </div>

                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>5. Due Date (Optional)</label>
                                <input
                                    type="date"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                                    value={assignForm.due_date}
                                    onChange={e => setAssignForm({ ...assignForm, due_date: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setIsAssigning(false)} style={{ padding: '0.75rem 1.5rem', background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" disabled={!assignForm.micro_skill_id || assignForm.student_ids.length === 0} style={{ padding: '0.75rem 1.5rem', background: '#6366F1', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: (!assignForm.micro_skill_id || assignForm.student_ids.length === 0) ? 'not-allowed' : 'pointer', opacity: (!assignForm.micro_skill_id || assignForm.student_ids.length === 0) ? 0.5 : 1 }}>Create Assignment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
