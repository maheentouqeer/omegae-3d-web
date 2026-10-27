import React, { useState } from 'react';
import { Maximize2, Minimize2, Navigation } from 'lucide-react';
import { AISLE_CONFIG } from '../data/catalog';
import { ShelfSlot } from '../types';

interface MinimapProps {
  playerX: number;
  playerZ: number;
  playerYaw: number;
  shelfSlots: ShelfSlot[];
  isIdle: boolean;
  onTeleportAisle: (aisleNum: number) => void;
  onTeleportCheckout: () => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  playerX,
  playerZ,
  playerYaw,
  shelfSlots,
  isIdle,
  onTeleportAisle,
  onTeleportCheckout,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Store bounds in meters: X from -20 to +20 (40m), Z from -15 to +15 (30m)
  const mapW = isExpanded ? 260 : 180;
  const mapH = isExpanded ? 200 : 138;

  const toMapX = (x: number) => ((x + 20) / 40) * mapW;
  const toMapY = (z: number) => ((z + 15) / 30) * mapH;

  const pMapX = toMapX(playerX);
  const pMapY = toMapY(playerZ);
  const angleDeg = ((-playerYaw + Math.PI) * 180) / Math.PI;

  const lowStockSlots = shelfSlots.filter((s) => s.currentStock <= s.reorderThreshold);

  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Map Icon (renders on small screens < md) */}
      <div
        className={`fixed bottom-4 left-4 z-30 md:hidden select-none transition-all duration-500 ${
          isIdle ? 'opacity-25 hover:opacity-100' : 'opacity-100'
        }`}
      >
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-10 h-10 rounded-full bg-[#101A3A]/90 hover:bg-[#182346] border border-slate-700/80 shadow-xl flex items-center justify-center text-white backdrop-blur-md active:scale-95"
          title="Toggle Store Minimap"
        >
          <Navigation className="w-5 h-5 text-[#5B3DF5]" />
        </button>
      </div>

      {/* Desktop Minimap / Mobile Modal */}
      <div
        className={`fixed bottom-4 left-4 z-30 select-none transition-all duration-500 ${
          mobileOpen ? 'block' : 'hidden md:block'
        } ${isIdle && !mobileOpen ? 'opacity-25 hover:opacity-100' : 'opacity-100'}`}
      >
        <div className="bg-[#101A3A]/95 border border-slate-700/80 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md text-[#F7F6F2]">
          <div className="flex items-center justify-between pb-1 px-1 border-b border-slate-800">
            <button
              onClick={() => {
                if (window.innerWidth < 768) {
                  setMobileOpen(false);
                } else {
                  setIsCollapsed(!isCollapsed);
                }
              }}
              className="flex items-center gap-1.5 text-[11px] font-heading font-bold uppercase tracking-wider text-slate-300 hover:text-white"
            >
              <Navigation className="w-3.5 h-3.5 text-[#5B3DF5]" />
              <span>Store Minimap</span>
            </button>
            <div className="flex items-center gap-1">
              {!isCollapsed && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1 hover:bg-[#182346] rounded text-slate-400 hover:text-white transition-colors"
                >
                  {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                </button>
              )}
              {window.innerWidth < 768 && (
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1 hover:bg-[#182346] rounded text-slate-400 hover:text-white transition-colors"
                >
                  <Minimize2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {!isCollapsed && (
            <>
            <div
              className="relative bg-[#0A1024] rounded-xl overflow-hidden mt-1.5 border border-slate-800 cursor-crosshair"
              style={{ width: mapW, height: mapH }}
            >
              {/* Back Wall Marker */}
              <div className="absolute top-1 left-0 right-0 text-center text-[7px] font-bold text-slate-600 uppercase tracking-widest">
                North Wall
              </div>

              {/* 8 Aisles */}
              {AISLE_CONFIG.map((aisle) => {
                const ax = toMapX(aisle.x - 0.7);
                const ay = toMapY(aisle.z - 6);
                const aw = (1.4 / 40) * mapW;
                const ah = (12 / 30) * mapH;

                return (
                  <button
                    key={aisle.number}
                    onClick={() => onTeleportAisle(aisle.number)}
                    title={`Click to fly to Aisle 0${aisle.number}: ${aisle.name}`}
                    className="absolute rounded bg-[#182346]/90 hover:bg-[#5B3DF5]/40 border border-slate-700 hover:border-[#5B3DF5] flex flex-col items-center justify-center transition-all group"
                    style={{
                      left: ax,
                      top: ay,
                      width: Math.max(12, aw),
                      height: ah,
                    }}
                  >
                    <span className="text-[8px] font-bold text-slate-300 group-hover:text-white font-mono-numbers">
                      {aisle.number}
                    </span>
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-0.5"
                      style={{ backgroundColor: aisle.accentColor }}
                    />
                  </button>
                );
              })}

              {/* Checkout Counters */}
              <button
                onClick={onTeleportCheckout}
                title="Click to fly to Checkout Counters"
                className="absolute rounded bg-[#182346]/90 hover:bg-[#19C39A]/30 border border-slate-700 hover:border-[#19C39A] flex items-center justify-center transition-all"
                style={{
                  left: toMapX(-9.5),
                  top: toMapY(8.5),
                  width: (19 / 40) * mapW,
                  height: (3.2 / 30) * mapH,
                }}
              >
                <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">
                  Checkouts 1-4
                </span>
              </button>

              {/* Entrance Portal */}
              <div
                className="absolute bg-[#5B3DF5]/30 border border-[#5B3DF5]/60 rounded flex items-center justify-center text-[7px] text-[#CBD5E1] font-bold uppercase"
                style={{
                  left: toMapX(-3.5),
                  top: toMapY(13.8),
                  width: (7 / 40) * mapW,
                  height: 6,
                }}
              >
                Doors
              </div>

              {/* Low Stock Pins (Coral #FF5A4D) */}
              {lowStockSlots.map((slot) => (
                <div
                  key={slot.id}
                  title="Low Stock Slot"
                  className="absolute w-1.5 h-1.5 rounded-full bg-[#FF5A4D] shadow-xs shadow-[#FF5A4D]/80 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{
                    left: toMapX(slot.x),
                    top: toMapY(slot.z),
                  }}
                />
              ))}

              {/* Player Position & Direction Cone */}
              <div
                className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 transition-transform"
                style={{
                  left: pMapX,
                  top: pMapY,
                  transform: `translate(-50%, -50%) rotate(${angleDeg}deg)`,
                }}
              >
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[12px] border-b-[#5B3DF5]/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#5B3DF5] border border-white shadow-md mx-auto mt-0.5" />
              </div>
            </div>

            <div className="text-[8px] text-slate-400 text-center pt-1 font-medium">
              Click aisle to glide · 6s idle auto-fade
            </div>
          </>
        )}
      </div>
    </div>
  </>
);
};
