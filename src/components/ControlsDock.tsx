import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ShoppingBag, Sliders } from 'lucide-react';
import { AISLE_CONFIG } from '../data/catalog';
import { QualityLevel } from '../types';

interface ControlsDockProps {
  isIdle: boolean;
  quality: QualityLevel;
  onSetQuality: (q: QualityLevel) => void;
  onSelectAisle: (aisleNum: number) => void;
  onGoToCheckout: () => void;
}

export const ControlsDock: React.FC<ControlsDockProps> = ({
  isIdle,
  quality,
  onSetQuality,
  onSelectAisle,
  onGoToCheckout,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true); // Default collapsed into a small chip
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-auto select-none transition-all duration-500 ${
        isIdle ? 'opacity-25 hover:opacity-100' : 'opacity-100'
      }`}
    >
      {/* Sleek Controls Chip */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="px-3.5 py-1.5 bg-[#101A3A]/90 hover:bg-[#182346] border border-slate-700/80 rounded-full text-xs font-bold text-slate-200 hover:text-white flex items-center gap-1.5 shadow-xl backdrop-blur-md transition-all active:scale-95"
      >
        <span className="w-2 h-2 rounded-full bg-[#5B3DF5]" />
        <span>Controls</span>
        {isCollapsed ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>

      {/* Dock Expanded Content */}
      {!isCollapsed && (
        <div className="mt-2 bg-[#101A3A]/95 border border-slate-700/80 rounded-2xl p-2 px-4 shadow-2xl backdrop-blur-md flex flex-wrap items-center justify-center gap-2.5 text-xs text-slate-200 max-w-4xl animate-fade-in">
          {/* Controls Hint */}
          <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-400 border-r border-slate-800 pr-3">
            <span className="font-bold text-slate-200">WASD</span>
            <span>Move</span>
            <span>·</span>
            <span className="font-bold text-slate-200">Shift</span>
            <span>Run</span>
            <span>·</span>
            <span className="font-bold text-slate-200">Drag</span>
            <span>Look</span>
            <span>·</span>
            <span className="font-bold text-slate-200">Click</span>
            <span>Inspect</span>
          </div>

          {/* Quick Aisle Waypoints */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
            {AISLE_CONFIG.map((a) => (
              <button
                key={a.number}
                onClick={() => onSelectAisle(a.number)}
                title={`Glide to Aisle 0${a.number}: ${a.name}`}
                className="px-2 py-1 bg-[#182346] hover:bg-[#202E5C] border border-slate-700/80 rounded-md text-[11px] font-semibold text-slate-300 hover:text-white transition-all whitespace-nowrap flex items-center gap-1"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: a.accentColor }}
                />
                <span>0{a.number}</span>
              </button>
            ))}
          </div>

          {/* Quality Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowQualityMenu(!showQualityMenu)}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#182346] hover:bg-[#202E5C] text-slate-300 rounded-md text-[11px] font-semibold border border-slate-700 transition-colors"
            >
              <Sliders className="w-3 h-3 text-[#5B3DF5]" />
              <span className="uppercase">{quality}</span>
            </button>

            {showQualityMenu && (
              <div
                className="absolute bottom-full mb-1.5 right-0 bg-[#101A3A] border border-slate-700 rounded-xl p-1 shadow-xl z-50 flex flex-col gap-0.5 w-24"
                onMouseLeave={() => setShowQualityMenu(false)}
              >
                {(['low', 'medium', 'high'] as QualityLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => {
                      onSetQuality(lvl);
                      setShowQualityMenu(false);
                    }}
                    className={`px-2 py-1 rounded text-[11px] font-bold text-left uppercase transition-colors ${
                      quality === lvl ? 'bg-[#5B3DF5] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Direct Checkout Fly Action */}
          <button
            onClick={onGoToCheckout}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#19C39A] hover:bg-[#16A34A] text-[#101A3A] rounded-md text-[11px] font-extrabold transition-all shadow-sm"
          >
            <ShoppingBag className="w-3 h-3" />
            <span>To Checkout</span>
          </button>
        </div>
      )}
    </div>
  );
};
