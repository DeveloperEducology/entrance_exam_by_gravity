import { Sidebar } from './Sidebar';
import { Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { cn } from '../../lib/utils';

export function MainLayout() {
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const isEditing = location.pathname.startsWith('/create') || location.pathname.startsWith('/edit');

    if (isEditing) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col">
                <main className="flex-1 overflow-hidden h-screen">
                    <Outlet />
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
            <main className={cn(
                "flex-1 p-8 overflow-y-auto h-screen transition-all duration-300 ease-in-out",
                isCollapsed ? "ml-20" : "ml-64"
            )}>
                <div className="max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
