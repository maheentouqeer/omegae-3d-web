import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Navigation, ShoppingBag, Eye } from 'lucide-react';
import { AISLE_CONFIG } from '../data/catalog';

interface ControlsDockProps {
  onSelectAisle: (aisleNum: number) => void;
  onGoToCheckout: () => void;
}

export const ControlsDock: React.FC<ControlsDockProps> = ({
  onSelectAisle,
  onGoToCheckout,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-auto">
      {/* Collapse Toggle Tab */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="px-3 py-1 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-t-lg text-[10px] font-semibold text-slate-300 hover:text-white flex items-center gap-1 shadow-md transition-all -mb-[1px]"
      >
        {isCollapsed ? (
          <>
            <ChevronUp className="w-3 h-3 text-blue-400" />
            <span>Show Navigation Dock</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3 h-3 text-slate-400" />
            <span>Hide Controls (Zen Mode)</span>
          </>
        )}
      </button>

      {/* Dock Content */}
      {!isCollapsed && (
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-2.5 px-4 shadow-2xl backdrop-blur-xs flex flex-wrap items-center justify-center gap-3 text-xs text-slate-200 max-w-3xl">
          {/* Controls Hint */}
          <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-400 border-r border-slate-800 pr-3">
            <span className="font-semibold text-slate-300">WASD</span>
            <span>Locomotion</span>
            <span>·</span>
            <span className="font-semibold text-slate-300">Drag</span>
            <span>Look</span>
            <span>·</span>
            <span className="font-semibold text-slate-300">Click</span>
            <span>Inspect</span>
          </div>

          {/* Quick Aisle Waypoint Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
            {AISLE_CONFIG.map((a) => (
              <button
                key={a.number}
                onClick={() => onSelectAisle(a.number)}
                title={`Glide to Aisle ${a.number}: ${a.name}`}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 rounded-md text-[11px] font-medium text-slate-300 hover:text-white transition-all whitespace-nowrap flex items-center gap-1"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: a.color }}
                />
                <span>A{a.number}</span>
              </button>
            ))}
          </div>

          {/* Direct Checkout Fly Action */}
          <button
            onClick={onGoToCheckout}
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-md text-[11px] font-bold transition-all shadow-sm"
          >
            <ShoppingBag className="w-3 h-3" />
            <span>To Checkouts</span>
          </button>
        </div>
      )}
    </div>
  );
};
