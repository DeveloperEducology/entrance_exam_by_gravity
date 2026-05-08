
import { GraphPlane } from '@/components/geometry/GraphPlane';
import { CoordinatePoint, DistanceVisualizer } from '@/components/geometry/CoordinatePoint';
import { FormulaPanel } from '@/components/geometry/FormulaPanel';

export default function GeometryLabPage() {
  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-100 flex items-center px-8 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black">
            W
          </div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">
            WEXLS <span className="text-blue-600">Geometry Lab</span>
          </h1>
        </div>
        <nav className="ml-12 flex gap-6">
          <button className="text-sm font-semibold text-blue-600 border-b-2 border-blue-600 pb-5 translate-y-2.5">
            Coordinate Geometry
          </button>
          <button className="text-sm font-semibold text-slate-400 hover:text-slate-600 transition-colors">
            Transformation
          </button>
          <button className="text-sm font-semibold text-slate-400 hover:text-slate-600 transition-colors">
            Trigonometry
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Side: Formulas (1/3 width) */}
        <aside className="w-1/3 min-w-[400px] shrink-0">
          <FormulaPanel />
        </aside>

        {/* Right Side: Interactive Graph (2/3 width) */}
        <section className="flex-1 relative bg-white m-4 rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
          <GraphPlane>
            <DistanceVisualizer />
            <CoordinatePoint id="A" />
            <CoordinatePoint id="B" />
          </GraphPlane>
          
          {/* Legend Overlay */}
          <div className="absolute bottom-6 left-6 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-xs font-bold text-slate-600">Distance (d)</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-t border-slate-400 border-dashed" />
                <span className="text-xs font-bold text-slate-400">Component Deltas (Δx, Δy)</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
