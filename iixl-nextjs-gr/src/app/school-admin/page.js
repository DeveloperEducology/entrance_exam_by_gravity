import SchoolAdminDashboard from '../../components/school-admin/SchoolAdminDashboard';

export const metadata = {
    title: 'School Admin Dashboard',
    description: 'Manage teachers, classes, and view school-wide analytics.',
};

export default function SchoolAdminPage() {
    return <SchoolAdminDashboard />;
}
