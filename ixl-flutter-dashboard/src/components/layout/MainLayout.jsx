import { Sidebar } from './Sidebar';
import { Outlet, useLocation } from 'react-router-dom';

export function MainLayout() {
    const location = useLocation();
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

            <Sidebar />
            <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
                <div className="max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
