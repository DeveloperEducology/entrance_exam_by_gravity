'use client';

import React, { useState, useEffect } from 'react';
import styles from './SchoolAdminDashboard.module.css';

export default function SchoolAdminDashboard() {
    const [view, setView] = useState('overview'); // overview, performance, teachers, classes
    const [data, setData] = useState({
        teachersCount: 0,
        studentsCount: 0,
        questionsAnswered: 0,
        classesCount: 0
    });

    const [teachers, setTeachers] = useState([]);
    const [teacherForm, setTeacherForm] = useState({ name: '', email: '', password: '' });

    // Classes
    const [classes, setClasses] = useState([]);
    const [classForm, setClassForm] = useState({ name: '', teacher_id: '' });

    // Performance
    const [performance, setPerformance] = useState({ topClasses: [], subjectMastery: [] });

    // Settings & Importing
    const [schoolSettings, setSchoolSettings] = useState({ licenseLimit: 500, announcement: '' });
    const [announcementText, setAnnouncementText] = useState('');
    const [gradeFilter, setGradeFilter] = useState('All Grades');
    const [importingText, setImportingText] = useState('');
    const [importStatus, setImportStatus] = useState('');

    const [isLoading, setIsLoading] = useState(true);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/school-admin/data');
            if (res.ok) {
                const payload = await res.json();
                setData(payload.stats);
                setTeachers(payload.teachers || []);
                setClasses(payload.classes || []);
                if (payload.performance) setPerformance(payload.performance);
                if (payload.schoolSettings) {
                    setSchoolSettings(payload.schoolSettings);
                    setAnnouncementText(payload.schoolSettings.announcement || '');
                }
            }
        } catch (error) {
            console.error('Failed to load dashboard', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const handleCreateTeacher = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/school-admin/teachers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(teacherForm)
            });
            if (res.ok) {
                const newTeacher = await res.json();
                setTeachers([...teachers, newTeacher]);
                setTeacherForm({ name: '', email: '', password: '' });
            }
        } catch (error) {
            console.error('Adding teacher failed', error);
            // Optimistic UI for demo
            setTeachers([...teachers, { id: Date.now().toString(), ...teacherForm, status: 'active', classCount: 0 }]);
            setTeacherForm({ name: '', email: '', password: '' });
        }
    };

    const handleCreateClass = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/school-admin/classes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(classForm)
            });
            if (res.ok) {
                const newClass = await res.json();
                setClasses([...classes, newClass]);
                setClassForm({ name: '', teacher_id: '' });
            }
        } catch (error) {
            console.error('Adding class failed', error);
        }
    };

    const handleSaveAnnouncement = async () => {
        try {
            const res = await fetch('/api/school-admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ announcement: announcementText })
            });
            if (res.ok) {
                alert('Announcement Saved!');
            }
        } catch (error) {
            console.error('Failed to save announcement', error);
        }
    };

    const handleBulkImport = async (e) => {
        e.preventDefault();
        setImportStatus('Importing students...');
        try {
            const res = await fetch('/api/school-admin/students/import', {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: importingText
            });
            const payload = await res.json();
            if (res.ok) {
                setImportStatus(`Success: ${payload.message}`);
                setImportingText('');
                fetchDashboardData(); // Refresh counts
            } else {
                setImportStatus(`Error: ${payload.error}`);
            }
        } catch (err) {
            setImportStatus('Failed to import data');
        }
    };

    const exportCSV = () => {
        const headers = "Classroom,Lead Teacher,Total Practiced\n";
        const rows = performance.topClasses.map(c => `"${c.name}","${c.teacherName}",${c.questionsAnswered}`).join("\n");
        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('href', url);
        a.setAttribute('download', 'school_performance_report.csv');
        a.click();
    };

    if (isLoading) {
        return <div className={styles.container} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading School Admin Portal...</div>;
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerInfo}>
                    <h1>School Administration</h1>
                    <p>Manage staff, curriculum alignment, and school-wide performance.</p>
                </div>
                <div className={styles.navTabs}>
                    <button className={`${styles.tab} ${view === 'overview' ? styles.activeTab : ''}`} onClick={() => setView('overview')}>Overview</button>
                    <button className={`${styles.tab} ${view === 'performance' ? styles.activeTab : ''}`} onClick={() => setView('performance')}>Performance Analytics</button>
                    <button className={`${styles.tab} ${view === 'teachers' ? styles.activeTab : ''}`} onClick={() => setView('teachers')}>Teachers</button>
                    <button className={`${styles.tab} ${view === 'classes' ? styles.activeTab : ''}`} onClick={() => setView('classes')}>Classes</button>
                </div>
            </header>

            {view === 'overview' && (
                <>
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <span className={styles.statIcon}>🏢</span>
                            <div className={styles.statValue}>{data.studentsCount}</div>
                            <div className={styles.statLabel}>Total Students</div>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statIcon}>👩‍🏫</span>
                            <div className={styles.statValue}>{data.teachersCount}</div>
                            <div className={styles.statLabel}>Active Staff</div>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statIcon}>📚</span>
                            <div className={styles.statValue}>{data.classesCount}</div>
                            <div className={styles.statLabel}>Active Classes</div>
                        </div>
                        <div className={styles.statCard} style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
                            <span className={styles.statIcon}>🚀</span>
                            <div className={styles.statValue} style={{ color: '#1d4ed8' }}>{data.questionsAnswered.toLocaleString()}</div>
                            <div className={styles.statLabel} style={{ color: '#3b82f6' }}>Questions Practiced</div>
                        </div>
                    </div>

                    <div className={styles.analyticsGrid}>
                        <div className={styles.analyticsCard}>
                            <h3>Seat & License Management</h3>
                            <p className={styles.analyticsSubtitle}>Monitor your active WEXLS subscription limits.</p>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 600 }}>
                                <span>{data.studentsCount} Used</span>
                                <span>{schoolSettings.licenseLimit} Total Licenses</span>
                            </div>

                            <div className={styles.progressBarBg} style={{ height: '16px', marginBottom: '1rem', background: '#f1f5f9' }}>
                                <div className={styles.progressBarFill} style={{
                                    width: `${Math.min((data.studentsCount / schoolSettings.licenseLimit) * 100, 100)}%`,
                                    backgroundColor: (data.studentsCount / schoolSettings.licenseLimit) > 0.9 ? '#ef4444' : '#3b82f6'
                                }}></div>
                            </div>
                            <small style={{ color: '#64748b' }}>If you need to increase your capacity beyond {schoolSettings.licenseLimit} students, please contact WEXLS support.</small>
                        </div>

                        <div className={styles.analyticsCard}>
                            <h3>System Announcement</h3>
                            <p className={styles.analyticsSubtitle}>Broadcast a message to all Teacher Dashboards instantly.</p>
                            <textarea
                                rows={3}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '1rem', outline: 'none', resize: 'vertical' }}
                                placeholder="e.g., Mandatory staff meeting Friday at 3 PM..."
                                value={announcementText}
                                onChange={(e) => setAnnouncementText(e.target.value)}
                            />
                            <button className={styles.btnPrimary} onClick={handleSaveAnnouncement}>Update Announcement</button>
                        </div>
                    </div>
                </>
            )}

            {view === 'performance' && (
                <div className={styles.analyticsGrid}>
                    <div className={styles.analyticsCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>School-wide Subject Mastery</h3>
                                <p className={styles.analyticsSubtitle} style={{ margin: 0 }}>Average completion percentage by curriculum area.</p>
                            </div>
                            <select
                                value={gradeFilter}
                                onChange={(e) => setGradeFilter(e.target.value)}
                                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: 600, color: '#334155' }}
                            >
                                <option value="All Grades">All Grades</option>
                                <option value="1st Grade">1st Grade</option>
                                <option value="2nd Grade">2nd Grade</option>
                                <option value="3rd Grade">3rd Grade</option>
                                <option value="4th Grade">4th Grade</option>
                                <option value="5th Grade">5th Grade</option>
                            </select>
                        </div>

                        <div className={styles.masteryList}>
                            {performance.subjectMastery.map((item, i) => (
                                <div key={i} className={styles.masteryItem}>
                                    <div className={styles.masteryHeader}>
                                        <span className={styles.subjectName}>{item.subject}</span>
                                        <span className={styles.masteryPercent}>{item.mastery}%</span>
                                    </div>
                                    <div className={styles.progressBarBg}>
                                        <div className={styles.progressBarFill} style={{ width: `${item.mastery}%`, backgroundColor: item.mastery > 75 ? '#10b981' : item.mastery > 60 ? '#f59e0b' : '#ef4444' }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.analyticsCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>Top Performing Classrooms</h3>
                                <p className={styles.analyticsSubtitle}>Ranked by longest engagement and questions answered.</p>
                            </div>
                            <button className={styles.btnPrimary} onClick={exportCSV} style={{ backgroundColor: '#10b981' }}>⬇ Export CSV Report</button>
                        </div>

                        <table className={styles.baseTable} style={{ marginTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
                            <thead>
                                <tr>
                                    <th style={{ background: '#fff' }}>Classroom</th>
                                    <th style={{ background: '#fff' }}>Total Practiced</th>
                                </tr>
                            </thead>
                            <tbody>
                                {performance.topClasses.map((c, i) => (
                                    <tr key={c.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <span className={styles.rankBadge}>#{i + 1}</span>
                                                <div>
                                                    <strong style={{ display: 'block' }}>{c.name}</strong>
                                                    <small style={{ color: '#64748b' }}>{c.teacherName}</small>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ fontWeight: 800, color: '#3b82f6' }}>{c.questionsAnswered.toLocaleString()} Qs</td>
                                    </tr>
                                ))}
                                {performance.topClasses.length === 0 && (
                                    <tr><td colSpan="2" style={{ textAlign: 'center', padding: '2rem' }}>Not enough data locally collected yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {view === 'teachers' && (
                <div className={styles.tableContainer}>
                    <div className={styles.tableHeader}>
                        <h3>Staff Directory</h3>
                    </div>
                    <form onSubmit={handleCreateTeacher} className={styles.formRow}>
                        <div className={styles.inputGroup}>
                            <label>Teacher Name</label>
                            <input type="text" placeholder="e.g. Jane Smith" value={teacherForm.name} onChange={e => setTeacherForm({ ...teacherForm, name: e.target.value })} required />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Email Access</label>
                            <input type="email" placeholder="jane@school.edu" value={teacherForm.email} onChange={e => setTeacherForm({ ...teacherForm, email: e.target.value })} required />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Temporary Password</label>
                            <input type="password" value={teacherForm.password} onChange={e => setTeacherForm({ ...teacherForm, password: e.target.value })} required minLength={6} />
                        </div>
                        <button type="submit" className={styles.btnPrimary}>+ Add Teacher</button>
                    </form>

                    <table className={styles.baseTable}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Classes Supervised</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teachers.map(t => (
                                <tr key={t.id}>
                                    <td><strong>{t.name}</strong></td>
                                    <td>{t.email}</td>
                                    <td>{t.classCount || 0} Classes</td>
                                    <td><span className={`${styles.statusBadge} ${t.status === 'active' ? styles.statusActive : styles.statusPending}`}>{t.status || 'Active'}</span></td>
                                    <td><button className={styles.btnDanger}>Deactivate</button></td>
                                </tr>
                            ))}
                            {teachers.length === 0 && (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}>No teachers added yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {view === 'classes' && (
                <>
                    <div className={styles.tableContainer}>
                        <div className={styles.tableHeader}>
                            <h3>Class Registration & Assignments</h3>
                        </div>
                        <form onSubmit={handleCreateClass} className={styles.formRow}>
                            <div className={styles.inputGroup}>
                                <label>Class / Section Name</label>
                                <input type="text" placeholder="e.g. 5th Grade Science - Sec A" value={classForm.name} onChange={e => setClassForm({ ...classForm, name: e.target.value })} required />
                            </div>
                            <div className={styles.inputGroup}>
                                <label>Assign Primary Teacher</label>
                                <select value={classForm.teacher_id} onChange={e => setClassForm({ ...classForm, teacher_id: e.target.value })} required>
                                    <option value="">Select a staff member...</option>
                                    {teachers.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            <button type="submit" className={styles.btnPrimary}>+ Create Class</button>
                        </form>

                        <table className={styles.baseTable}>
                            <thead>
                                <tr>
                                    <th>Class Name</th>
                                    <th>Lead Teacher</th>
                                    <th>Enrolled Students</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {classes.map(c => (
                                    <tr key={c.id}>
                                        <td><strong>{c.name}</strong></td>
                                        <td>{c.teacherName || teachers.find(t => t.id === c.teacher_id)?.name || 'Unassigned'}</td>
                                        <td>{c.studentCount || 0} Students</td>
                                        <td><button className={styles.btnDanger}>Archive</button></td>
                                    </tr>
                                ))}
                                {classes.length === 0 && (
                                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem' }}>No classes registered yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className={styles.tableContainer}>
                        <div className={styles.tableHeader}>
                            <h3>Bulk Student Import</h3>
                        </div>
                        <div style={{ padding: '1.5rem', background: '#f8fafc' }}>
                            <p style={{ margin: '0 0 1rem 0', color: '#64748b' }}>Upload an Excel or CSV file mapping your students. For this demo, copy & paste directly. Format: <strong>Name, Email, Password, ClassID (optional)</strong></p>

                            <form onSubmit={handleBulkImport}>
                                <textarea
                                    rows={6}
                                    style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '1rem', fontFamily: 'monospace', outline: 'none', resize: 'vertical' }}
                                    placeholder={`John Doe, johndoe@school.edu, pass123, 64a8b... \nJane Roe, janeroe@school.edu, securepwd \n...`}
                                    value={importingText}
                                    onChange={(e) => setImportingText(e.target.value)}
                                    required
                                />

                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                    <button type="submit" className={styles.btnPrimary} style={{ backgroundColor: '#8b5cf6' }}>+ Import Subscriptions</button>
                                    {importStatus && <span style={{ fontWeight: 600, color: importStatus.startsWith('Success') ? '#10b981' : '#ef4444' }}>{importStatus}</span>}
                                </div>
                            </form>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
