
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { cn } from '../lib/utils';

// Usage: <ResourceList ... relationships={{ grade_id: 'grades' }} filterColumn="grade_id" upstreamFilter={{ filterColumn: 'subject_id', parentTable: 'grades', parentColumn: 'grade_id', parentLabel: 'Grade' }} />
export function ResourceList({ title, tableName, columns = ['id', 'name'], sortBy = 'id', sortAscending = true, relationships = {}, filterColumn = null, upstreamFilter = null }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newItemData, setNewItemData] = useState({});
    const [relationData, setRelationData] = useState({});
    const [filterValue, setFilterValue] = useState('');

    // Upstream Filter State (e.g. Grade)
    const [upstreamValue, setUpstreamValue] = useState('');
    const [upstreamOptions, setUpstreamOptions] = useState([]);

    // Edit State
    const [editingItemId, setEditingItemId] = useState(null);
    const [editItemData, setEditItemData] = useState({});

    useEffect(() => {
        // Initial Fetch for Relations and Upstream Options
        const init = async () => {
            if (upstreamFilter) {
                const { data } = await supabase.from(upstreamFilter.parentTable).select('id, name').order('name');
                setUpstreamOptions(data || []);
            }
            fetchRelations();
        };
        init();
    }, [tableName]);

    // Fetch Relations (Subjects) when Upstream (Grade) changes
    useEffect(() => {
        if (Object.keys(relationships).length > 0) {
            fetchRelations();
        }
    }, [upstreamValue]);

    // Fetch Items when filters change
    useEffect(() => {
        fetchItems();
    }, [tableName, filterValue, upstreamValue, relationData]);

    const fetchItems = async () => {
        setLoading(true);
        let query = supabase.from(tableName).select('*').order(sortBy, { ascending: sortAscending });

        // Apply Direct Filter (e.g. Selected Subject)
        if (filterColumn && filterValue) {
            query = query.eq(filterColumn, filterValue);
        }
        // Apply Upstream Cascade (e.g. Selected Grade -> Filter Units by filtered Subjects)
        else if (upstreamFilter && upstreamValue && filterColumn === upstreamFilter.filterColumn) {
            const validIds = relationData[filterColumn]?.map(r => r.id) || [];
            if (validIds.length > 0) {
                query = query.in(filterColumn, validIds);
            } else {
                // Selected grade has no subjects, so it should have no units
                // Force empty result
                query = query.eq('id', -1); // Hack usage
            }
        }

        const { data, error } = await query;
        if (!error) setItems(data || []);
        else console.error(error);
        setLoading(false);
    };

    const fetchRelations = async () => {
        const newRelData = {};
        for (const [col, relatedTable] of Object.entries(relationships)) {
            let query = supabase.from(relatedTable).select('id, name');

            // If this column is controlled by the upstream filter
            if (upstreamFilter && col === upstreamFilter.filterColumn && upstreamValue) {
                query = query.eq(upstreamFilter.parentColumn, upstreamValue);
            }

            const { data } = await query;
            if (data) newRelData[col] = data;
        }
        setRelationData(newRelData);
    };

    const handleCreate = async () => {
        // If filtering, auto-fill the filter column
        const dataToSave = { ...newItemData };
        if (filterColumn && filterValue && !dataToSave[filterColumn]) {
            dataToSave[filterColumn] = filterValue;
        }

        const { error } = await supabase.from(tableName).insert([dataToSave]);
        if (!error) {
            setIsCreating(false);
            setNewItemData({});
            fetchItems();
        } else {
            alert('Error creating item: ' + error.message);
        }
    };

    const handleUpdate = async () => {
        const dataToSave = { ...editItemData };
        delete dataToSave.id;

        const { error } = await supabase.from(tableName).update(dataToSave).eq('id', editingItemId);
        if (!error) {
            setEditingItemId(null);
            setEditItemData({});
            fetchItems();
        } else {
            alert('Error updating item: ' + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;
        const { error } = await supabase.from(tableName).delete().eq('id', id);
        if (!error) {
            fetchItems();
        } else {
            alert('Error deleting item: ' + error.message);
        }
    };

    const startEdit = (item) => {
        setEditingItemId(item.id);
        setEditItemData(item);
    };

    const cancelEdit = () => {
        setEditingItemId(null);
        setEditItemData({});
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
                    <p className="text-slate-500 mt-1">Manage {title.toLowerCase()}</p>
                </div>
                <div className="flex gap-4">
                    {/* Upstream Filter (Grade) */}
                    {upstreamFilter && (
                        <select
                            value={upstreamValue}
                            onChange={(e) => {
                                setUpstreamValue(e.target.value);
                                setFilterValue(''); // Reset child filter
                            }}
                            className="border border-slate-300 rounded-lg px-3 py-2 text-sm min-w-[150px]"
                        >
                            <option value="">All {upstreamFilter.parentLabel}s</option>
                            {upstreamOptions.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                            ))}
                        </select>
                    )}

                    {/* Direct Filter (Subject) */}
                    {filterColumn && relationData[filterColumn] && (
                        <select
                            value={filterValue}
                            onChange={(e) => setFilterValue(e.target.value)}
                            className="border border-slate-300 rounded-lg px-3 py-2 text-sm min-w-[150px]"
                            disabled={upstreamFilter && !upstreamValue && !filterValue} // Optional: Lock subject until grade selected? Nah, let them see all.
                        >
                            <option value="">All {filterColumn.replace('_id', '').replace(/^\w/, c => c.toUpperCase())}s</option>
                            {relationData[filterColumn].map(rel => (
                                <option key={rel.id} value={rel.id}>{rel.name}</option>
                            ))}
                        </select>
                    )}
                    <button
                        onClick={() => setIsCreating(true)}
                        className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <Plus className="w-5 h-5" />
                        New {title.slice(0, -1)}
                    </button>
                </div>
            </header>

            {isCreating && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="font-semibold text-slate-900">Add New {title.slice(0, -1)}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {columns.filter(c => c !== 'id').map(col => (
                            <div key={col}>
                                <label className="text-xs font-medium text-slate-500 uppercase">{col}</label>
                                {relationships[col] ? (
                                    <select
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                        value={newItemData[col] || (col === filterColumn ? filterValue : '')}
                                        onChange={e => setNewItemData(prev => ({ ...prev, [col]: e.target.value }))}
                                        disabled={col === filterColumn && !!filterValue} // Lock if filtered
                                    >
                                        <option value="">Select {col.replace('_id', '')}</option>
                                        {relationData[col]?.map(rel => (
                                            <option key={rel.id} value={rel.id}>{rel.name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                        placeholder={col}
                                        value={newItemData[col] || ''}
                                        onChange={e => setNewItemData(prev => ({ ...prev, [col]: e.target.value }))}
                                    />
                                )}
                            </div>
                        ))}
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
                            {columns.map(col => (
                                <th key={col} className="px-6 py-4 font-semibold text-slate-700 uppercase tracking-wider text-xs">{col}</th>
                            ))}
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.map(item => editingItemId === item.id ? (
                            <tr key={item.id} className="bg-brand-50 border-y border-brand-100">
                                {columns.map(col => (
                                    <td key={col} className="px-6 py-4">
                                        {col === 'id' ? (
                                            <span className="text-slate-500 text-sm font-mono">{item.id}</span>
                                        ) : relationships[col] ? (
                                            <select
                                                className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-500"
                                                value={editItemData[col] || ''}
                                                onChange={e => setEditItemData(prev => ({ ...prev, [col]: e.target.value }))}
                                            >
                                                <option value="">Select {col.replace('_id', '')}</option>
                                                {relationData[col]?.map(rel => (
                                                    <option key={rel.id} value={rel.id}>{rel.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-500"
                                                value={editItemData[col] || ''}
                                                onChange={e => setEditItemData(prev => ({ ...prev, [col]: e.target.value }))}
                                            />
                                        )}
                                    </td>
                                ))}
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    <button onClick={cancelEdit} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors" title="Cancel"><X className="w-4 h-4" /></button>
                                    <button onClick={handleUpdate} className="p-2 bg-brand-600 hover:bg-brand-700 rounded-lg text-white transition-colors shadow-sm" title="Save"><Save className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ) : (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                {columns.map(col => (
                                    <td key={col} className="px-6 py-4 text-slate-700">
                                        {col === 'id' ? <span className="text-xs font-mono text-slate-400">{item[col]}</span> : typeof item[col] === 'object' ? JSON.stringify(item[col]) : item[col]}
                                    </td>
                                ))}
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    <button onClick={() => startEdit(item)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-brand-600 transition-colors" title="Edit"><Edit className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                        {items.length === 0 && !loading && (
                            <tr><td colSpan={columns.length + 1} className="p-8 text-center text-slate-400">No items found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
