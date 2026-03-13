'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './SuperAdminDashboard.module.css';
import { backendUrl } from '@/lib/backend/url';

const DEFAULT_Q_PARTS = JSON.stringify([
    { type: 'text', content: 'Write your question here', isVertical: true, hasAudio: true },
], null, 2);

const DEFAULT_Q_OPTIONS = JSON.stringify(['A', 'B', 'C', 'D'], null, 2);

function sortByOrder(list = []) {
    return [...list].sort((a, b) => {
        const ao = Number(a?.sort_order ?? a?.idx ?? 0);
        const bo = Number(b?.sort_order ?? b?.idx ?? 0);
        if (ao !== bo) return ao - bo;
        return String(a?.id || '').localeCompare(String(b?.id || ''));
    });
}

export default function SuperAdminDashboard() {
    const [view, setView] = useState('curriculum'); // 'curriculum', 'questions', 'schools'
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [catalog, setCatalog] = useState({ grades: [], subjects: [], units: [], microskills: [] });
    const [questions, setQuestions] = useState([]);

    // Schools State
    const [schools, setSchools] = useState([]);
    const [schoolForm, setSchoolForm] = useState({
        schoolName: '',
        schoolDomain: '',
        adminName: '',
        adminEmail: '',
        adminPassword: ''
    });

    const [gradeForm, setGradeForm] = useState({ name: '', code: '', sort_order: 0 });
    const [subjectForm, setSubjectForm] = useState({ grade_id: '', name: '', slug: '', sort_order: 0 });
    const [unitForm, setUnitForm] = useState({ subject_id: '', name: '', sort_order: 0 });
    const [skillForm, setSkillForm] = useState({ unit_id: '', code: '', name: '', slug: '', sort_order: 0 });
    const [questionForm, setQuestionForm] = useState({
        microSkillId: '',
        type: 'mcq',
        difficulty: 'easy',
        complexity: 10,
        marks: 1,
        sort_order: 0,
        is_multi_select: false,
        show_submit_button: false,
        parts: DEFAULT_Q_PARTS,
        options: DEFAULT_Q_OPTIONS,
        items: '[]',
        correct_answer_index: 0,
        correct_answer_indices: '[]',
        correct_answer_text: '',
        solution: '',
        adaptive_config: '{\n  "conceptTags": ["sample_tag"]\n}',
    });

    const subjectsByGrade = useMemo(() => {
        const acc = {};
        for (const subject of catalog.subjects || []) {
            const gid = String(subject.grade_id || '');
            if (!acc[gid]) acc[gid] = [];
            acc[gid].push(subject);
        }
        return acc;
    }, [catalog.subjects]);

    const unitsBySubject = useMemo(() => {
        const acc = {};
        for (const unit of catalog.units || []) {
            const sid = String(unit.subject_id || '');
            if (!acc[sid]) acc[sid] = [];
            acc[sid].push(unit);
        }
        return acc;
    }, [catalog.units]);

    const microskillsByUnit = useMemo(() => {
        const acc = {};
        for (const skill of catalog.microskills || []) {
            const uid = String(skill.unit_id || '');
            if (!acc[uid]) acc[uid] = [];
            acc[uid].push(skill);
        }
        return acc;
    }, [catalog.microskills]);

    useEffect(() => {
        loadCatalog();
        loadSchools();
    }, []);

    const loadSchools = async () => {
        try {
            const res = await fetch('/api/super-admin/schools');
            if (res.ok) {
                const data = await res.json();
                setSchools(data.schools || []);
            }
        } catch (e) {
            console.error('Failed to load schools', e);
        }
    };

    const handleCreateSchool = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const res = await fetch('/api/super-admin/schools', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(schoolForm)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create school');

            setSuccess(`Successfully onboarded ${data.name}!`);
            setSchoolForm({ schoolName: '', schoolDomain: '', adminName: '', adminEmail: '', adminPassword: '' });
            await loadSchools();
        } catch (err) {
            setError(err?.message || 'Failed to create school');
        } finally {
            setLoading(false);
        }
    };

    const loadCatalog = async () => {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const res = await fetch('/api/admin/curriculum', { cache: 'no-store' });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload.error || 'Failed to load catalog');
            setCatalog({
                grades: sortByOrder(payload.grades || []),
                subjects: sortByOrder(payload.subjects || []),
                units: sortByOrder(payload.units || []),
                microskills: sortByOrder(payload.microskills || []),
            });
        } catch (err) {
            setError(err?.message || 'Failed to load catalog');
        } finally {
            setLoading(false);
        }
    };

    const createEntity = async (entity, data) => {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const res = await fetch('/api/admin/curriculum', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entity, ...data }),
            });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload.error || `Failed to create ${entity}`);
            await loadCatalog();
            setSuccess(`${entity} created successfully!`);
        } catch (err) {
            setError(err?.message || `Failed to create ${entity}`);
        } finally {
            setLoading(false);
        }
    };

    const deleteEntity = async (entity, id) => {
        if (!confirm(`Delete ${entity} item ${String(id).slice(0, 8)}...?`)) return;
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const res = await fetch('/api/admin/curriculum', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entity, id }),
            });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload.error || `Failed to delete ${entity}`);
            await loadCatalog();
            setSuccess(`${entity} deleted successfully!`);
        } catch (err) {
            setError(err?.message || `Failed to delete ${entity}`);
        } finally {
            setLoading(false);
        }
    };

    const loadQuestions = async (microSkillId) => {
        const id = String(microSkillId || '').trim();
        if (!id) {
            setError('Select a microskill to load questions.');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const res = await fetch(backendUrl(`/api/admin/questions?microSkillId=${encodeURIComponent(id)}&limit=120`), { cache: 'no-store' });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload.error || 'Failed to load questions');
            setQuestions(payload.rows || []);
            setSuccess(`Loaded ${payload.rows?.length || 0} question(s)`);
        } catch (err) {
            setQuestions([]);
            setError(err?.message || 'Failed to load questions');
        } finally {
            setLoading(false);
        }
    };

    const createQuestion = async () => {
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const body = {
                microSkillId: questionForm.microSkillId,
                type: questionForm.type,
                difficulty: questionForm.difficulty,
                complexity: Number(questionForm.complexity || 0),
                marks: Number(questionForm.marks || 1),
                sort_order: Number(questionForm.sort_order || 0),
                is_multi_select: Boolean(questionForm.is_multi_select),
                show_submit_button: Boolean(questionForm.show_submit_button),
                parts: questionForm.parts,
                options: questionForm.options,
                items: questionForm.items,
                correct_answer_index: Number(questionForm.correct_answer_index),
                correct_answer_indices: questionForm.correct_answer_indices,
                correct_answer_text: questionForm.correct_answer_text,
                solution: questionForm.solution,
                adaptive_config: questionForm.adaptive_config,
            };

            const res = await fetch(backendUrl('/api/admin/questions'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const payload = await res.json();
            if (!res.ok) throw new Error(payload.error || 'Failed to create question');

            await loadQuestions(questionForm.microSkillId);
            setSuccess('Question created successfully!');
        } catch (err) {
            setError(err?.message || 'Failed to create question');
        } finally {
            setLoading(false);
        }
    };

    const deleteQuestion = async (id) => {
        if (!confirm(`Delete question ${String(id).slice(0, 8)}...?`)) return;
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const res = await fetch(backendUrl('/api/admin/questions'), {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload.error || 'Failed to delete question');
            await loadQuestions(questionForm.microSkillId);
            setSuccess('Question deleted successfully!');
        } catch (err) {
            setError(err?.message || 'Failed to delete question');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerInfo}>
                    <h1>Global Super Admin</h1>
                    <p>WEXLS Curriculum Authority & AI Question Generator Platform.</p>
                </div>
                <div className={styles.navTabs}>
                    <button className={`${styles.tab} ${view === 'curriculum' ? styles.activeTab : ''}`} onClick={() => setView('curriculum')}>Curriculum Setup</button>
                    <button className={`${styles.tab} ${view === 'questions' ? styles.activeTab : ''}`} onClick={() => setView('questions')}>Question Generator</button>
                    <button className={`${styles.tab} ${view === 'schools' ? styles.activeTab : ''}`} onClick={() => setView('schools')}>Partner Schools</button>
                    <Link href="/" className={styles.tab} style={{ textDecoration: 'none' }}>Exit Portal</Link>
                </div>
            </header>

            {error && <div className={`${styles.message} ${styles.error}`}>{error}</div>}
            {success && <div className={`${styles.message} ${styles.success}`}>{success}</div>}

            {view === 'curriculum' && (
                <>
                    <div className={styles.cardGrid}>
                        <article className={styles.card}>
                            <h2>Create Grade</h2>
                            <input placeholder="Name (e.g. 5th Grade)" value={gradeForm.name} onChange={(e) => setGradeForm((v) => ({ ...v, name: e.target.value }))} />
                            <input placeholder="Code (e.g. GRADE_5)" value={gradeForm.code} onChange={(e) => setGradeForm((v) => ({ ...v, code: e.target.value }))} />
                            <input type="number" placeholder="Sort Order" value={gradeForm.sort_order} onChange={(e) => setGradeForm((v) => ({ ...v, sort_order: Number(e.target.value || 0) }))} />
                            <button className={styles.btnPrimary} onClick={() => createEntity('grades', gradeForm)} disabled={loading}>+ Create Grade</button>
                        </article>

                        <article className={styles.card}>
                            <h2>Create Subject</h2>
                            <select value={subjectForm.grade_id} onChange={(e) => setSubjectForm((v) => ({ ...v, grade_id: e.target.value }))}>
                                <option value="">Assign to Grade...</option>
                                {catalog.grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}
                            </select>
                            <input placeholder="Name (e.g. Math)" value={subjectForm.name} onChange={(e) => setSubjectForm((v) => ({ ...v, name: e.target.value }))} />
                            <input placeholder="Slug (e.g. math)" value={subjectForm.slug} onChange={(e) => setSubjectForm((v) => ({ ...v, slug: e.target.value }))} />
                            <input type="number" placeholder="Sort Order" value={subjectForm.sort_order} onChange={(e) => setSubjectForm((v) => ({ ...v, sort_order: Number(e.target.value || 0) }))} />
                            <button className={styles.btnPrimary} onClick={() => createEntity('subjects', subjectForm)} disabled={loading}>+ Create Subject</button>
                        </article>

                        <article className={styles.card}>
                            <h2>Create Unit</h2>
                            <select value={unitForm.subject_id} onChange={(e) => setUnitForm((v) => ({ ...v, subject_id: e.target.value }))}>
                                <option value="">Assign to Subject...</option>
                                {catalog.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                            </select>
                            <input placeholder="Name (e.g. Algebra Basics)" value={unitForm.name} onChange={(e) => setUnitForm((v) => ({ ...v, name: e.target.value }))} />
                            <input type="number" placeholder="Sort Order" value={unitForm.sort_order} onChange={(e) => setUnitForm((v) => ({ ...v, sort_order: Number(e.target.value || 0) }))} />
                            <button className={styles.btnPrimary} onClick={() => createEntity('units', unitForm)} disabled={loading}>+ Create Unit</button>
                        </article>

                        <article className={styles.card}>
                            <h2>Create Microskill</h2>
                            <select value={skillForm.unit_id} onChange={(e) => setSkillForm((v) => ({ ...v, unit_id: e.target.value }))}>
                                <option value="">Assign to Unit...</option>
                                {catalog.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                            </select>
                            <input placeholder="Code (e.g. M.5.A.1)" value={skillForm.code} onChange={(e) => setSkillForm((v) => ({ ...v, code: e.target.value }))} />
                            <input placeholder="Name (e.g. Solving for x)" value={skillForm.name} onChange={(e) => setSkillForm((v) => ({ ...v, name: e.target.value }))} />
                            <input placeholder="Slug (e.g. solve-x)" value={skillForm.slug} onChange={(e) => setSkillForm((v) => ({ ...v, slug: e.target.value }))} />
                            <input type="number" placeholder="Sort Order" value={skillForm.sort_order} onChange={(e) => setSkillForm((v) => ({ ...v, sort_order: Number(e.target.value || 0) }))} />
                            <button className={styles.btnPrimary} onClick={() => createEntity('microskills', skillForm)} disabled={loading}>+ Create Microskill</button>
                        </article>
                    </div>

                    <div className={styles.fullSection}>
                        <h2>Curriculum Architecture Tree</h2>
                        <div>
                            {catalog.grades.map((grade) => (
                                <div key={grade.id} className={`${styles.treeNode} ${styles.treeGrade}`}>
                                    <div className={styles.treeRow}>
                                        <strong style={{ fontSize: '1.25rem' }}>{grade.name}</strong>
                                        <button className={styles.btnDanger} onClick={() => deleteEntity('grades', grade.id)}>Delete</button>
                                    </div>
                                    {(subjectsByGrade[String(grade.id)] || []).map((subject) => (
                                        <div key={subject.id} className={`${styles.treeNode} ${styles.treeSubject}`}>
                                            <div className={styles.treeRow}>
                                                <span style={{ fontWeight: 600 }}>{subject.name}</span>
                                                <button className={styles.btnDanger} onClick={() => deleteEntity('subjects', subject.id)}>Delete</button>
                                            </div>
                                            {(unitsBySubject[String(subject.id)] || []).map((unit) => (
                                                <div key={unit.id} className={`${styles.treeNode} ${styles.treeUnit}`}>
                                                    <div className={styles.treeRow}>
                                                        <span>{unit.name}</span>
                                                        <button className={styles.btnDanger} onClick={() => deleteEntity('units', unit.id)}>Delete</button>
                                                    </div>
                                                    {(microskillsByUnit[String(unit.id)] || []).map((skill) => (
                                                        <div key={skill.id} className={`${styles.treeNode} ${styles.treeSkill}`}>
                                                            <div className={styles.treeRow}>
                                                                <span><strong>{skill.code || 'Skill'}</strong> - {skill.name}</span>
                                                                <button className={styles.btnDanger} onClick={() => deleteEntity('microskills', skill.id)}>Delete</button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {view === 'questions' && (
                <div className={styles.fullSection}>
                    <h2>AI Question Matrix Builder</h2>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                        <select className={styles.card} style={{ flex: 1, padding: '0.75rem' }} value={questionForm.microSkillId} onChange={(e) => setQuestionForm((v) => ({ ...v, microSkillId: e.target.value }))}>
                            <option value="">Select Target Microskill...</option>
                            {catalog.microskills.map((skill) => (
                                <option key={skill.id} value={skill.id}>{skill.code || 'Skill'} - {skill.name}</option>
                            ))}
                        </select>
                        <button className={styles.btnPrimary} onClick={() => loadQuestions(questionForm.microSkillId)} disabled={loading || !questionForm.microSkillId}>Fetch Existing Questions</button>
                    </div>

                    <div className={styles.card} style={{ marginBottom: '2rem' }}>
                        <h3>Configure New Question</h3>
                        <div className={styles.qFormGrid}>
                            <select value={questionForm.type} onChange={(e) => setQuestionForm((v) => ({ ...v, type: e.target.value }))}>
                                {['mcq', 'imageChoice', 'fillInTheBlank', 'textInput', 'sorting', 'dragAndDrop', 'measure', 'fourPicsOneWord', 'smartTable', 'shadeGrid'].map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                            <select value={questionForm.difficulty} onChange={(e) => setQuestionForm((v) => ({ ...v, difficulty: e.target.value }))}>
                                {['easy', 'medium', 'hard'].map((d) => <option key={d} value={d}>{d.toUpperCase()}</option>)}
                            </select>
                            <input type="number" placeholder="AI Complexity" value={questionForm.complexity} onChange={(e) => setQuestionForm((v) => ({ ...v, complexity: Number(e.target.value || 0) }))} />
                            <input type="number" placeholder="Marks Value" value={questionForm.marks} onChange={(e) => setQuestionForm((v) => ({ ...v, marks: Number(e.target.value || 1) }))} />
                            <input type="number" placeholder="Sort Priority" value={questionForm.sort_order} onChange={(e) => setQuestionForm((v) => ({ ...v, sort_order: Number(e.target.value || 0) }))} />
                            <input type="number" placeholder="Correct Array Index" value={questionForm.correct_answer_index} onChange={(e) => setQuestionForm((v) => ({ ...v, correct_answer_index: Number(e.target.value || -1) }))} />
                        </div>

                        <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '4px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                                <input type="checkbox" checked={questionForm.is_multi_select} onChange={(e) => setQuestionForm((v) => ({ ...v, is_multi_select: e.target.checked }))} />
                                Multi-Select Mode
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                                <input type="checkbox" checked={questionForm.show_submit_button} onChange={(e) => setQuestionForm((v) => ({ ...v, show_submit_button: e.target.checked }))} />
                                Force Submit Button
                            </label>
                        </div>

                        <textarea rows={6} placeholder="Parts Definition JSON (Render the UI shape)" value={questionForm.parts} onChange={(e) => setQuestionForm((v) => ({ ...v, parts: e.target.value }))} style={{ fontFamily: 'monospace' }} />
                        <textarea rows={4} placeholder="Options Matrix JSON" value={questionForm.options} onChange={(e) => setQuestionForm((v) => ({ ...v, options: e.target.value }))} style={{ fontFamily: 'monospace' }} />
                        <textarea rows={3} placeholder="Sub-Items JSON" value={questionForm.items} onChange={(e) => setQuestionForm((v) => ({ ...v, items: e.target.value }))} style={{ fontFamily: 'monospace' }} />
                        <textarea rows={2} placeholder="Correct Answer Indices JSON Array" value={questionForm.correct_answer_indices} onChange={(e) => setQuestionForm((v) => ({ ...v, correct_answer_indices: e.target.value }))} style={{ fontFamily: 'monospace' }} />
                        <textarea rows={4} placeholder="Adaptive Configuration Array" value={questionForm.adaptive_config} onChange={(e) => setQuestionForm((v) => ({ ...v, adaptive_config: e.target.value }))} style={{ fontFamily: 'monospace' }} />

                        <input placeholder="Exact Correct Answer Text Match" value={questionForm.correct_answer_text} onChange={(e) => setQuestionForm((v) => ({ ...v, correct_answer_text: e.target.value }))} />
                        <textarea rows={3} placeholder="Victory/Solution Explanation Text" value={questionForm.solution} onChange={(e) => setQuestionForm((v) => ({ ...v, solution: e.target.value }))} />

                        <button className={styles.btnPrimary} onClick={createQuestion} disabled={loading || !questionForm.microSkillId} style={{ marginTop: '1rem' }}>Commit Question to DB</button>
                    </div>

                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Object ID</th>
                                    <th>Question Type</th>
                                    <th>Difficulty</th>
                                    <th>Sort Priority</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {questions.map((q) => (
                                    <tr key={q.id}>
                                        <td>{String(q.id).slice(0, 8)}...</td>
                                        <td><span style={{ fontWeight: 600, color: '#3b82f6' }}>{q.type}</span></td>
                                        <td>{q.difficulty}</td>
                                        <td>{q.sort_order ?? q.idx ?? 0}</td>
                                        <td><button className={styles.btnDanger} onClick={() => deleteQuestion(q.id)}>Delete</button></td>
                                    </tr>
                                ))}
                                {questions.length === 0 && (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', fontStyle: 'italic', color: '#94a3b8' }}>
                                            No questions generated for this Microskill tier yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {view === 'schools' && (
                <div className={styles.fullSection}>
                    <h2>Onboard a New Partner School</h2>
                    <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                        Provisioning a school automatically spins up an isolated environment and generates a Tier-2 Principal/Admin account for them.
                        They will only see their own school&apos;s data.
                    </p>

                    <form onSubmit={handleCreateSchool} className={styles.card} style={{ marginBottom: '3rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>School Name</label>
                                <input placeholder="e.g. Lincoln High School" value={schoolForm.schoolName} onChange={e => setSchoolForm({ ...schoolForm, schoolName: e.target.value })} required />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>School Domain (Optional)</label>
                                <input placeholder="e.g. lincolnhigh.edu" value={schoolForm.schoolDomain} onChange={e => setSchoolForm({ ...schoolForm, schoolDomain: e.target.value })} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Principal Name</label>
                                <input placeholder="e.g. Arthur Penn" value={schoolForm.adminName} onChange={e => setSchoolForm({ ...schoolForm, adminName: e.target.value })} required />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Principal Email (Login ID)</label>
                                <input type="email" placeholder="principal@lincolnhigh.edu" value={schoolForm.adminEmail} onChange={e => setSchoolForm({ ...schoolForm, adminEmail: e.target.value })} required />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Temporary Password</label>
                                <input type="password" placeholder="Min. 6 characters" value={schoolForm.adminPassword} onChange={e => setSchoolForm({ ...schoolForm, adminPassword: e.target.value })} required minLength={6} />
                            </div>
                        </div>

                        <button type="submit" className={styles.btnPrimary} style={{ marginTop: '1.5rem', alignSelf: 'flex-start' }} disabled={loading}>
                            {loading ? 'Provisioning Environment...' : 'Onboard Client & Generate Admin Config'}
                        </button>
                    </form>

                    <h2>Active School Clients ({schools.length})</h2>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>School Name</th>
                                    <th>Domain Restriction</th>
                                    <th>Assigned Principal (Tier 2 Admin)</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {schools.map((school) => (
                                    <tr key={school.id}>
                                        <td><strong>{school.name}</strong></td>
                                        <td>{school.domain || <span style={{ color: '#94a3b8' }}>None</span>}</td>
                                        <td>
                                            {school.adminName}<br />
                                            <small style={{ color: '#64748b' }}>{school.adminEmail}</small>
                                        </td>
                                        <td><span className={styles.success}>{school.status}</span></td>
                                    </tr>
                                ))}
                                {schools.length === 0 && (
                                    <tr>
                                        <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', fontStyle: 'italic', color: '#94a3b8' }}>
                                            No schools ontboarded yet. Fill out the form above to onboard your first client!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
