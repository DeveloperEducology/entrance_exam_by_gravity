import DungeonDash from '@/components/games/DungeonDash';

export const metadata = {
  title: 'Dungeon Dash - Even/Odd Practice',
  description: 'Practice identifying even and odd numbers in this fun infinite runner game.',
};

export default function DungeonDashPage() {
  return (
    <main style={{ padding: '40px 20px', minHeight: '100vh', background: '#1E1430' }}>
      <h1 style={{ textAlign: 'center', color: 'white', marginBottom: '30px', fontFamily: 'Inter, sans-serif' }}>
        Even Numbers Dungeon Dash
      </h1>
      <DungeonDash />
    </main>
  );
}
