
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, List, Users, BookOpen, Settings, Book, Image, Wand2, LayoutTemplate, Layers, FileText, Edit3, Sigma, FileJson, Database } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Sidebar() {
    const navItems = [
        { label: 'Questions', icon: List, to: '/' },
        { label: 'Grades', icon: BookOpen, to: '/grades' },
        { label: 'Subjects', icon: Book, to: '/subjects' },
        { label: 'Units', icon: LayoutDashboard, to: '/units' },
        { label: 'Visual Editor', icon: Edit3, to: '/visual-editor' },
        { label: 'Equations', icon: Sigma, to: '/equation-reference' },
        { label: 'Micro Skills', icon: Users, to: '/micro-skills' },
        { label: 'Auto Generator', icon: Wand2, to: '/auto-generator' },
        { label: 'Bulk Generator', icon: Layers, to: '/bulk-generator' },
        { label: 'SVG Generator', icon: LayoutTemplate, to: '/svg-generator' },
        { label: 'Media Gallery', icon: Image, to: '/media' },
        { label: 'Documentation', icon: FileText, to: '/docs' },
        { label: 'JSON View', icon: FileJson, to: '/json-view' },
        { label: 'Schema Docs', icon: Database, to: '/schema' },
        { label: 'Users', icon: Users, to: '/users' },

        { label: 'Settings', icon: Settings, to: '/settings' },
    ];

    return (
        <aside className="w-64 bg-slate-900 text-slate-50 flex flex-col h-screen fixed left-0 top-0 border-r border-slate-800">
            <div className="p-6 border-b border-slate-800">
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <LayoutDashboard className="w-6 h-6 text-brand-400" />
                    <span>Gravity Admin</span>
                </h1>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                                isActive
                                    ? "bg-brand-600 text-white shadow-md"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                            )
                        }
                    >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <div className="flex items-center gap-3 px-4 py-2">
                    <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold">
                        A
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">Admin User</p>
                        <p className="text-xs text-slate-400 truncate">admin@gravity.com</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
