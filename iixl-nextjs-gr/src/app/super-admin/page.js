import SuperAdminDashboard from '@/components/super-admin/SuperAdminDashboard';

export const metadata = {
    title: 'Super Admin - WEXLS Curriculum Manager',
    description: 'Manage root curriculum tree, grades, and generative AI questions.',
    alternates: {
        canonical: '/super-admin',
    },
};

export default function SuperAdminPage() {
    return <SuperAdminDashboard />;
}
