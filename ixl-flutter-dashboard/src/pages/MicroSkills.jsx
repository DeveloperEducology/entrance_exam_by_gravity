import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';

export function MicroSkills() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newItemData, setNewItemData] = useState({});

    // Edit State
    const [editingItemId, setEditingItemId] = useState(null);
    const [editItemData, setEditItemData] = useState({});

    // Filter State
    const [grades, setGrades] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [units, setUnits] = useState([]);

    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedUnit, setSelectedUnit] = useState('');

    // Global Data for Creation/Editing
    const [allUnits, setAllUnits] = useState([]);

    useEffect(() => {
        fetchGrades();
        fetchAllUnits();
        fetchItems(); // Initial fetch (all or empty?)
    }, []);

    const fetchAllUnits = async () => {
        const { data } = await supabase.from('units').select('id, name').order('name');
        setAllUnits(data || []);
    };

    const fetchGrades = async () => {
        const { data } = await supabase.from('grades').select('id, name').order('sort_order');
        setGrades(data || []);
    };

    const handleGradeChange = async (e) => {
        const gradeId = e.target.value;
        setSelectedGrade(gradeId);
        setSelectedSubject('');
        setSelectedUnit('');
        setSubjects([]);
        setUnits([]);

        if (gradeId) {
            const { data } = await supabase.from('subjects').select('id, name').eq('grade_id', gradeId).order('name');
            setSubjects(data || []);
        }
        fetchItems(gradeId, null, null);
    };

    const handleSubjectChange = async (e) => {
        const subjectId = e.target.value;
        setSelectedSubject(subjectId);
        setSelectedUnit('');
        setUnits([]);

        if (subjectId) {
            const { data } = await supabase.from('units').select('id, name').eq('subject_id', subjectId).order('sort_order');
            setUnits(data || []);
        }
        fetchItems(selectedGrade, subjectId, null);
    };

    const handleUnitChange = (e) => {
        const unitId = e.target.value;
        setSelectedUnit(unitId);
        fetchItems(selectedGrade, selectedSubject, unitId);
    };

    const fetchItems = async (gradeId = selectedGrade, subjectId = selectedSubject, unitId = selectedUnit) => {
        setLoading(true);

        let query;

        if (unitId) {
            // Simple filter by unit_id
            query = supabase
                .from('micro_skills')
                .select('*, units(name)')
                .eq('unit_id', unitId)
                .order('sort_order', { ascending: true });
        } else if (subjectId) {
            // Filter by subject_id via units table
            // We use !inner on units to ensure we only get micro skills that have a unit in this subject
            // units table has subject_id, so we can filter directly on units.subject_id
            query = supabase
                .from('micro_skills')
                .select('*, units!inner(name, subject_id)')
                .eq('units.subject_id', subjectId)
                .order('sort_order', { ascending: true });
        } else if (gradeId) {
            // Filter by grade_id via units -> subjects table
            // subjects table has grade_id
            query = supabase
                .from('micro_skills')
                .select('*, units!inner(name, subjects!inner(grade_id))')
                .eq('units.subjects.grade_id', gradeId)
                .order('sort_order', { ascending: true });
        } else {
            // No filters - fetch all (limit to 100 to appear faster initially?)
            query = supabase
                .from('micro_skills')
                .select('*, units(name)')
                .order('sort_order', { ascending: true })
                .limit(200);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching micro skills:', error);
            setItems([]);
        } else {
            setItems(data || []);
        }
        setLoading(false);
    };

    const handleCreate = async () => {
        if (!newItemData.name || !newItemData.code) {
            alert('Name and Code are required');
            return;
        }

        // Must have a unit selected or provided
        let unitIdToSave = newItemData.unit_id;
        if (!unitIdToSave && selectedUnit) {
            unitIdToSave = selectedUnit;
        }

        if (!unitIdToSave) {
            alert('Please select a Unit or manually enter a Unit ID');
            return;
        }

        const dataToSave = {
            name: newItemData.name,
            code: newItemData.code,
            sort_order: newItemData.sort_order || 0,
            unit_id: unitIdToSave
        };

        const { error } = await supabase.from('micro_skills').insert([dataToSave]);
        if (!error) {
            setIsCreating(false);
            setNewItemData({});
            fetchItems();
        } else {
            alert('Error creating item: ' + error.message);
        }
    };

    const handleUpdate = async () => {
        const dataToSave = {
            name: editItemData.name,
            code: editItemData.code,
            sort_order: editItemData.sort_order || 0,
            unit_id: editItemData.unit_id
        };

        const { error } = await supabase.from('micro_skills').update(dataToSave).eq('id', editingItemId);
        if (!error) {
            setEditingItemId(null);
            setEditItemData({});
            fetchItems();
        } else {
            alert('Error updating item: ' + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this micro skill?')) return;
        const { error } = await supabase.from('micro_skills').delete().eq('id', id);
        if (!error) {
            fetchItems();
        } else {
            alert('Error deleting item: ' + error.message);
        }
    };

    const startEdit = (item) => {
        setEditingItemId(item.id);
        setEditItemData({
            name: item.name,
            code: item.code,
            sort_order: item.sort_order,
            unit_id: item.unit_id
        });
    };

    const cancelEdit = () => {
        setEditingItemId(null);
        setEditItemData({});
    };

    // For creating, we need all units if specific unit is not selected, or just the selected one.
    // Actually, to make it simple, let's just use the selected unit if available.

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Micro Skills</h1>
                    <p className="text-slate-500 mt-1">Manage micro skills hierarchy</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setIsCreating(true)}
                        className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <Plus className="w-5 h-5" />
                        New Micro Skill
                    </button>
                </div>
            </header>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Class / Grade</label>
                    <select
                        value={selectedGrade}
                        onChange={handleGradeChange}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                    >
                        <option value="">All Grades</option>
                        {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Subject</label>
                    <select
                        value={selectedSubject}
                        onChange={handleSubjectChange}
                        disabled={!selectedGrade}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                        <option value="">All Subjects</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Unit</label>
                    <select
                        value={selectedUnit}
                        onChange={handleUnitChange}
                        disabled={!selectedSubject}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                        <option value="">All Units</option>
                        {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </div>
            </div>

            {isCreating && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="font-semibold text-slate-900">Add New Micro Skill</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase">Name</label>
                            <input
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                placeholder="Name"
                                value={newItemData.name || ''}
                                onChange={e => setNewItemData({ ...newItemData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase">Code</label>
                            <input
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                placeholder="Code"
                                value={newItemData.code || ''}
                                onChange={e => setNewItemData({ ...newItemData, code: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase">Sort Order</label>
                            <input
                                type="number"
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                placeholder="0"
                                value={newItemData.sort_order || ''}
                                onChange={e => setNewItemData({ ...newItemData, sort_order: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase">Unit</label>
                            <select
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                value={newItemData.unit_id || selectedUnit || ''}
                                onChange={e => setNewItemData({ ...newItemData, unit_id: e.target.value })}
                                disabled={!!selectedUnit} // Lock if already selected in filter
                            >
                                <option value="">Select Unit</option>
                                {allUnits.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                        <button onClick={handleCreate} className="px-4 py-2 bg-brand-600 text-white rounded-lg">Save</button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-slate-700 uppercase tracking-wider text-xs">Name</th>
                            <th className="px-6 py-4 font-semibold text-slate-700 uppercase tracking-wider text-xs">Code</th>
                            <th className="px-6 py-4 font-semibold text-slate-700 uppercase tracking-wider text-xs">Unit</th>
                            <th className="px-6 py-4 font-semibold text-slate-700 uppercase tracking-wider text-xs">Sort Order</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.map(item => editingItemId === item.id ? (
                            <tr key={item.id} className="bg-brand-50 border-y border-brand-100">
                                <td className="px-6 py-4">
                                    <input
                                        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-500"
                                        value={editItemData.name || ''}
                                        onChange={e => setEditItemData(prev => ({ ...prev, name: e.target.value }))}
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <input
                                        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-500"
                                        value={editItemData.code || ''}
                                        onChange={e => setEditItemData(prev => ({ ...prev, code: e.target.value }))}
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    {/* Edit Unit */}
                                    <select
                                        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-500"
                                        value={editItemData.unit_id || ''}
                                        onChange={e => setEditItemData(prev => ({ ...prev, unit_id: e.target.value }))}
                                    >
                                        <option value="">Select Unit</option>
                                        {allUnits.map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-6 py-4">
                                    <input
                                        type="number"
                                        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-500"
                                        value={editItemData.sort_order || 0}
                                        onChange={e => setEditItemData(prev => ({ ...prev, sort_order: e.target.value }))}
                                    />
                                </td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    <button onClick={cancelEdit} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors" title="Cancel"><X className="w-4 h-4" /></button>
                                    <button onClick={handleUpdate} className="p-2 bg-brand-600 hover:bg-brand-700 rounded-lg text-white transition-colors shadow-sm" title="Save"><Save className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ) : (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-slate-900 font-medium">{item.name}</td>
                                <td className="px-6 py-4 text-slate-600 font-mono text-xs">{item.code}</td>
                                <td className="px-6 py-4 text-slate-600">
                                    {item.units?.name || item.unit_id}
                                </td>
                                <td className="px-6 py-4 text-slate-600">{item.sort_order}</td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    <button onClick={() => startEdit(item)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-brand-600 transition-colors" title="Edit"><Edit className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                        {items.length === 0 && !loading && (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400">No micro skills found</td></tr>
                        )}
                        {loading && (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading...</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
