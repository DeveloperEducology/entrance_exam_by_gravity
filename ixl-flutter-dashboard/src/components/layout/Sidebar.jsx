import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
    LayoutDashboard, List, Users, BookOpen, Settings, Book, Image, 
    Wand2, LayoutTemplate, Layers, FileText, Edit3, Sigma, 
    FileJson, Database, ChevronLeft, ChevronRight, Menu 
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function Sidebar({ isCollapsed, onToggle }) {
    const navItems = [
        { label: 'Questions', icon: List, to: '/' },
        { label: 'Grades', icon: BookOpen, to: '/grades' },
        { label: 'Subjects', icon: Book, to: '/subjects' },
        { label: 'Units', icon: LayoutDashboard, to: '/units' },
        { label: 'Lessons', icon: BookOpen, to: '/lessons' },
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
        <aside className={cn(
            "bg-slate-900 text-slate-50 flex flex-col h-screen fixed left-0 top-0 border-r border-slate-800 transition-all duration-300 ease-in-out z-20",
            isCollapsed ? "w-20" : "w-64"
        )}>
            {/* Header */}
            <div className={cn(
                "p-6 border-b border-slate-800 flex items-center transition-all",
                isCollapsed ? "justify-center" : "justify-between"
            )}>
                {!isCollapsed && (
                    <h1 className="text-xl font-bold flex items-center gap-2 overflow-hidden truncate">
                        <LayoutDashboard className="w-6 h-6 text-brand-400 shrink-0" />
                        <span>Gravity Admin</span>
                    </h1>
                )}
                <button 
                    onClick={onToggle}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        title={isCollapsed ? item.label : ""}
                        className={({ isActive }) =>
                            cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group",
                                isActive
                                    ? "bg-brand-600 text-white shadow-md"
                                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                            )
                        }
                    >
                        <item.icon className={cn(
                            "w-5 h-5 shrink-0 transition-transform group-hover:scale-110",
                            isCollapsed && "mx-auto"
                        )} />
                        {!isCollapsed && <span className="font-medium truncate">{item.label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* Footer / User Profile */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                <div className={cn(
                    "flex items-center gap-3 px-2 py-2 rounded-lg",
                    !isCollapsed && "bg-slate-800/30"
                )}>
                    <div className="w-8 h-8 shrink-0 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold shadow-sm">
                        A
                    </div>
                    {!isCollapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">Admin User</p>
                            <p className="text-xs text-slate-400 truncate">admin@gravity.com</p>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
