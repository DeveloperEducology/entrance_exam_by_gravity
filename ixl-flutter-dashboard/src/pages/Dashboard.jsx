
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Upload, Copy, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { api as supabase } from '../lib/apiClient';

const MOCK_QUESTIONS = [];

export function Dashboard() {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('all');
    const [filterDifficulty, setFilterDifficulty] = useState('all');

    // Cascade State
    const [grades, setGrades] = useState([]);
    const [units, setUnits] = useState([]);
    const [microSkills, setMicroSkills] = useState([]);

    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedUnit, setSelectedUnit] = useState('');
    const [selectedSkill, setSelectedSkill] = useState('');

    // Hierarchy Map for client-side filtering (when DB relations are missing)
    const [hierarchyMap, setHierarchyMap] = useState({});
    const [skillNameMap, setSkillNameMap] = useState({});

    // Text Search State
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    useEffect(() => {
        // Reset page on any filter change
        setCurrentPage(1);
    }, [searchTerm, filterType, filterDifficulty, selectedGrade, selectedUnit, selectedSkill]);

    useEffect(() => {
        const fetchQuestions = async () => {
            setLoading(true);
            try {
                const { data } = await supabase
                    .from('questions')
                    .select('*')
                    .order('created_at', { ascending: false });
                setQuestions(data || []);
            } catch (err) {
                console.warn('Fetch failed.', err);
            } finally {
                setLoading(false);
            }
        };

        const fetchHierarchy = async () => {
            // Fetch independent tables to build a lookup map to support flat NoSQL relationships
            try {
                const [
                    { data: skillsData },
                    { data: unitsData },
                    { data: subjectsData }
                ] = await Promise.all([
                    supabase.from('micro_skills').select('*'),
                    supabase.from('units').select('*'),
                    supabase.from('subjects').select('*')
                ]);

                if (skillsData && unitsData && subjectsData) {
                    const subjectMap = {};
                    subjectsData.forEach(s => subjectMap[s.id] = s);

                    const unitMap = {};
                    unitsData.forEach(u => unitMap[u.id] = u);

                    const map = {};
                    const nameMap = {};
                    skillsData.forEach(skill => {
                        const unitId = skill.unit_id;
                        const unit = unitMap[unitId] || {};
                        const subjectId = unit.subject_id;
                        const subject = subjectMap[subjectId] || {};

                        map[skill.id] = {
                            unitId: unitId,
                            gradeId: subject.grade_id || unit.grade_id // support legacy mapping
                        };
                        map[skill.name] = map[skill.id]; // map by name as well in case of old data
                        nameMap[skill.id] = skill.name;
                    });
                    setHierarchyMap(map);
                    setSkillNameMap(nameMap);
                }
            } catch (e) {
                console.error("Error fetching hierarchy map:", e);
            }
        };

        const fetchGrades = async () => {
            const { data } = await supabase.from('grades').select('*').order('name');
            if (data) setGrades(data);
        };

        fetchQuestions();
        fetchHierarchy();
        fetchGrades();
    }, []);

    // Cascade Handlers
    const handleGradeChange = async (e) => {
        const gradeId = e.target.value;
        setSelectedGrade(gradeId);
        setSelectedUnit('');
        setSelectedSkill('');
        setUnits([]);
        setMicroSkills([]);

        if (gradeId) {
            // Units are linked to Subjects, which are linked to Grades
            // 1. Get Subjects for Grade
            const { data: subjects } = await supabase.from('subjects').select('id').eq('grade_id', gradeId);
            if (subjects && subjects.length > 0) {
                const subjectIds = subjects.map(s => s.id || s._id).filter(Boolean);
                // 2. Get Units for Subjects
                const { data: unitsData } = await supabase.from('units').select('*').in('subject_id', subjectIds).order('name');
                setUnits(unitsData || []);
            } else {
                // Fallback if schema differs (some units might link directly?) - stick to subject path for now based on App.jsx
                setUnits([]);
            }
        }
    };

    const handleUnitChange = async (e) => {
        const unitId = e.target.value;
        setSelectedUnit(unitId);
        setSelectedSkill('');
        setMicroSkills([]);

        if (unitId) {
            const { data } = await supabase.from('micro_skills').select('*').eq('unit_id', unitId).order('name');
            setMicroSkills(data || []);
        }
    };

    const [selectedIds, setSelectedIds] = useState(new Set());

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredQuestions.length && filteredQuestions.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredQuestions.map(q => q.id)));
        }
    };

    const toggleSelect = (id) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleBulkDelete = async () => {
        if (!selectedIds.size) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} questions?`)) return;

        const idsToDelete = Array.from(selectedIds);
        const { error } = await supabase.from('questions').delete().in('id', idsToDelete);

        if (error) {
            alert('Error deleting questions');
            console.error(error);
        } else {
            setQuestions(questions.filter(q => !selectedIds.has(q.id)));
            setSelectedIds(new Set());
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this question?')) return;

        const { error } = await supabase.from('questions').delete().eq('id', id);

        if (error) {
            alert('Error deleting question');
            console.error(error);
        } else {
            setQuestions(questions.filter(q => q.id !== id));
            if (selectedIds.has(id)) {
                const newSelected = new Set(selectedIds);
                newSelected.delete(id);
                setSelectedIds(newSelected);
            }
        }
    };
    const handleClone = async (id) => {
        const { data: q } = await supabase.from('questions').select('*').eq('id', id).single();
        if (!q) {
            alert('Question not found');
            return;
        }

        const { id: oldId, _id, created_at, updated_at, ...copiedQuestion } = q;

        let parsedParts = copiedQuestion.parts;
        if (typeof parsedParts === 'string') {
            try { parsedParts = JSON.parse(parsedParts); } catch (e) { parsedParts = []; }
        }
        if (Array.isArray(parsedParts) && parsedParts.length > 0 && parsedParts[0].type === 'text') {
            parsedParts[0].content = parsedParts[0].content + ' (Copy)';
            copiedQuestion.parts = JSON.stringify(parsedParts);
        } else if (copiedQuestion.question_text) {
            copiedQuestion.question_text = copiedQuestion.question_text + ' (Copy)';
        }

        const { data: inserted, error } = await supabase.from('questions').insert([copiedQuestion]);
        if (error) {
            alert('Error cloning question: ' + error.message);
        } else if (inserted && inserted.length > 0) {
            setQuestions([inserted[0], ...questions]);
        }
    };


    const filteredQuestions = questions.filter(q => {
        // Safe parts parser
        let parsedParts = q.parts;
        if (typeof parsedParts === 'string') {
            try { parsedParts = JSON.parse(parsedParts); } catch (e) { parsedParts = []; }
        }

        // 1. Text Search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const qText = q.question_text || (Array.isArray(parsedParts) && parsedParts.find(p => p.type === 'text')?.content) || '';
            const matchesText = qText.toLowerCase().includes(term);
            const matchesId = q.id.toString().toLowerCase().includes(term);
            if (!matchesText && !matchesId) return false;
        }

        // 2. Type Filter
        if (filterType !== 'all' && q.type !== filterType) return false;

        // 3. Difficulty Filter
        if (filterDifficulty !== 'all' && q.difficulty !== filterDifficulty) return false;

        // 4. Hierarchy Filters
        // Use Direct Join Data OR Client-Side Map
        let gradeId, unitId, skillId;

        // Try getting data from join if available
        if (q.micro_skills) {
            const skill = Array.isArray(q.micro_skills) ? q.micro_skills[0] : q.micro_skills;
            const unit = Array.isArray(skill?.units) ? skill.units[0] : skill?.units;
            const subject = Array.isArray(unit?.subjects) ? unit.subjects[0] : unit?.subjects;

            gradeId = subject?.grade_id;
            unitId = skill?.unit_id;
            skillId = q.micro_skill_id;
        } else {
            // Fallback to Map
            const qSkillId = q.micro_skill_id || q.skill_id;
            if (qSkillId && hierarchyMap[qSkillId]) {
                const mapped = hierarchyMap[qSkillId];
                gradeId = mapped.gradeId;
                unitId = mapped.unitId;
                skillId = qSkillId;
            }
        }

        if (selectedGrade && gradeId != selectedGrade) return false;
        if (selectedUnit && unitId != selectedUnit) return false;
        if (selectedSkill && skillId != selectedSkill) return false;

        return true;
    });

    const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage);
    const paginatedQuestions = filteredQuestions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Questions</h1>
                    <p className="text-slate-500 mt-1">Manage all quiz questions and assessments</p>
                </div>
                <div className="flex gap-2">
                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
                        >
                            <Trash2 className="w-5 h-5" />
                            Delete ({selectedIds.size})
                        </button>
                    )}
                    <Link
                        to="/import"
                        className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <Upload className="w-5 h-5" />
                        Import JSON
                    </Link>
                    <Link
                        to="/division-journey"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <Sparkles className="w-5 h-5" />
                        Division Journey
                    </Link>
                    <Link
                        to="/create"
                        className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <Plus className="w-5 h-5" />
                        Create Question
                    </Link>
                </div>
            </header>

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                {/* Text Search & Basic Filters */}
                <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-[300px]">
                        <div className="relative flex-1">
                            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search questions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                            <Filter className="w-4 h-4" />
                            Filters:
                        </div>
                        <select
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="all">All Types</option>
                            <option value="mcq">MCQ</option>
                            <option value="drag_drop">Drag & Drop</option>
                            <option value="sorting">Sorting</option>
                            <option value="4pics">4 Pics 1 Word</option>
                            <option value="template">Template</option>
                        </select>

                        <select
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                            value={filterDifficulty}
                            onChange={(e) => setFilterDifficulty(e.target.value)}
                        >
                            <option value="all">All Difficulties</option>
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                        </select>
                    </div>
                </div>

                {/* Advanced Hierarchy Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                    <select
                        value={selectedGrade}
                        onChange={handleGradeChange}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                    >
                        <option value="">Filter by Grade</option>
                        {grades.map(g => <option key={g.id || g._id} value={g.id || g._id}>{g.name || g.level}</option>)}
                    </select>

                    <select
                        value={selectedUnit}
                        onChange={handleUnitChange}
                        disabled={!units.length}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                        <option value="">Filter by Unit</option>
                        {units.map(u => <option key={u.id || u._id} value={u.id || u._id}>{u.name || u.code}</option>)}
                    </select>

                    <select
                        value={selectedSkill}
                        onChange={(e) => setSelectedSkill(e.target.value)}
                        disabled={!microSkills.length}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                        <option value="">Filter by Skill</option>
                        {microSkills.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name || s.code}</option>)}
                    </select>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-slate-700 w-12">
                                <input
                                    type="checkbox"
                                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                    checked={filteredQuestions.length > 0 && selectedIds.size === filteredQuestions.length}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            <th className="px-6 py-4 font-semibold text-slate-700">ID</th>
                            <th className="px-6 py-4 font-semibold text-slate-700">Question</th>
                            <th className="px-6 py-4 font-semibold text-slate-700">Type</th>
                            <th className="px-6 py-4 font-semibold text-slate-700">Difficulty</th>
                            <th className="px-6 py-4 font-semibold text-slate-700">Skill Linked</th>
                            <th className="px-6 py-4 font-semibold text-slate-700 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {paginatedQuestions.map((q) => {
                            let parsedParts = q.parts;
                            if (typeof parsedParts === 'string') {
                                try { parsedParts = JSON.parse(parsedParts); } catch (e) { parsedParts = []; }
                            }

                            // Helper to extract question text from parts
                            const qText = parsedParts && Array.isArray(parsedParts)
                                ? parsedParts.find(p => p.type === 'text')?.content
                                : (q.question_text || 'No Text');

                            return (
                                <tr key={q.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(q.id) ? 'bg-slate-50' : ''}`}>
                                    <td className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                            checked={selectedIds.has(q.id)}
                                            onChange={() => toggleSelect(q.id)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-xs font-mono">#{q.id.slice(0, 8)}</td>
                                    <td className="px-6 py-4">
                                        <div className="max-w-xs">
                                            <span className="font-medium text-slate-900 block truncate" title={qText}>{qText}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "px-2.5 py-1 rounded-full text-xs font-medium border",
                                            q.type === 'mcq' && "bg-blue-50 text-blue-700 border-blue-100",
                                            q.type === 'dragAndDrop' && "bg-purple-50 text-purple-700 border-purple-100",
                                            q.type === 'sorting' && "bg-orange-50 text-orange-700 border-orange-100",
                                            q.type === 'fillInTheBlank' && q.logic_type === 'division_journey_v1' && "bg-indigo-600 text-white border-indigo-700",
                                            q.type === 'fillInTheBlank' && q.logic_type !== 'division_journey_v1' && "bg-teal-50 text-teal-700 border-teal-100",
                                            q.type === 'fourPicsOneWord' && "bg-pink-50 text-pink-700 border-pink-100",
                                            q.type === 'imageChoice' && "bg-indigo-50 text-indigo-700 border-indigo-100",
                                            q.type === 'template' && "bg-emerald-50 text-emerald-700 border-emerald-100",
                                            (!['mcq', 'dragAndDrop', 'sorting', 'fillInTheBlank', 'fourPicsOneWord', 'imageChoice', 'template'].includes(q.type)) && "bg-slate-100 text-slate-700 border-slate-200"
                                        )}>
                                            {q.logic_type === 'division_journey_v1' ? 'DIVISION JOURNEY' : (q.type?.replace(/([A-Z])/g, ' $1').trim().toUpperCase() || 'UNKNOWN')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5",
                                            q.difficulty?.toLowerCase() === 'easy' && "text-green-600",
                                            q.difficulty?.toLowerCase() === 'medium' && "text-yellow-600",
                                            q.difficulty?.toLowerCase() === 'hard' && "text-red-600",
                                        )}>
                                            <span className={cn("w-2 h-2 rounded-full",
                                                q.difficulty?.toLowerCase() === 'easy' ? "bg-green-500" :
                                                    q.difficulty?.toLowerCase() === 'medium' ? "bg-yellow-500" : "bg-red-500"
                                            )} />
                                            {q.difficulty}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 font-medium text-xs">
                                        {q.micro_skills?.name || skillNameMap[q.micro_skill_id || q.skill_id] || q.micro_skill_id || q.skill_id || '—'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link to={`/edit/${q.id}`} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-brand-600 transition-colors" title="Edit">
                                                <Edit className="w-4 h-4" />
                                            </Link>
                                            <button onClick={() => handleClone(q.id)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-brand-600 transition-colors" title="Clone inline">
                                                <Copy className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(q.id)}
                                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredQuestions.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    No questions found matching your filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
                        <div className="text-sm text-slate-500">
                            Showing <span className="font-medium text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-slate-900">{Math.min(currentPage * itemsPerPage, filteredQuestions.length)}</span> of <span className="font-medium text-slate-900">{filteredQuestions.length}</span> results
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 border border-slate-300 bg-white rounded-lg text-sm font-medium text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                Previous
                            </button>
                            <div className="flex items-center gap-1 hidden sm:flex">
                                {Array.from({ length: totalPages }).map((_, i) => {
                                    if (totalPages > 7) {
                                        if (i !== 0 && i !== totalPages - 1 && Math.abs(currentPage - 1 - i) > 1) {
                                            if (Math.abs(currentPage - 1 - i) === 2) return <span key={i} className="px-1 text-slate-400">...</span>;
                                            return null;
                                        }
                                    }
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentPage(i + 1)}
                                            className={cn("px-3 py-1 border rounded-lg text-sm font-medium transition-colors shadow-sm", currentPage === i + 1 ? "bg-brand-600 text-white border-brand-600" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50")}
                                        >
                                            {i + 1}
                                        </button>
                                    )
                                })}
                            </div>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 border border-slate-300 bg-white rounded-lg text-sm font-medium text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
