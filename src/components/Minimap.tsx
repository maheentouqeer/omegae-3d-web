import React, { useState } from 'react';
import { MapPin, Maximize2, Minimize2, Navigation } from 'lucide-react';
import { AISLE_CONFIG } from '../data/catalog';
import { ShelfSlot } from '../types';

interface MinimapProps {
  playerX: number;
  playerZ: number;
  playerYaw: number;
  shelfSlots: ShelfSlot[];
  onTeleportAisle: (aisleNum: number) => void;
  onTeleportCheckout: () => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  playerX,
  playerZ,
  playerYaw,
  shelfSlots,
  onTeleportAisle,
  onTeleportCheckout,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Store bounds in meters: X from -21 to +21 (42m), Z from -16 to +16 (32m)
  const mapW = isExpanded ? 280 : 180;
  const mapH = isExpanded ? 220 : 140;

  const toMapX = (x: number) => ((x + 21) / 42) * mapW;
  const toMapY = (z: number) => ((z + 16) / 32) * mapH;

  const pMapX = toMapX(playerX);
  const pMapY = toMapY(playerZ);

  // Direction angle in degrees on 2D map
  // Three.js yaw 0 is -Z (up on screen), PI is +Z (down on screen)
  const angleDeg = ((-playerYaw + Math.PI) * 180) / Math.PI;

  const lowStockSlots = shelfSlots.filter((s) => s.currentStock <= s.reorderThreshold);

  return (
    <div className="fixed bottom-4 left-4 z-30 select-none">
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-2.5 shadow-2xl backdrop-blur-xs text-slate-100">
        <div className="flex items-center justify-between pb-1.5 px-1 border-b border-slate-800">
          <div className="flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-slate-300">
              Floor Minimap
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
          >
            {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
        </div>

        {/* 2D Canvas Viewport */}
        <div
          className="relative bg-slate-950 rounded-xl overflow-hidden mt-1.5 border border-slate-800/80 cursor-crosshair"
          style={{ width: mapW, height: mapH }}
        >
          {/* North wall label */}
          <div className="absolute top-1 left-0 right-0 text-center text-[8px] font-semibold text-slate-600 uppercase tracking-widest">
            Back Wall
          </div>

          {/* 8 Aisles */}
          {AISLE_CONFIG.map((aisle) => {
            const ax = toMapX(aisle.x - 0.7);
            const ay = toMapY(aisle.z - 6);
            const aw = ((1.4 / 42) * mapW);
            const ah = ((12 / 32) * mapH);

            return (
              <button
                key={aisle.number}
                onClick={() => onTeleportAisle(aisle.number)}
                title={`Click to fly to Aisle ${aisle.number}: ${aisle.name}`}
                className="absolute rounded bg-slate-800/80 hover:bg-blue-600/40 border border-slate-700 hover:border-blue-400 flex flex-col items-center justify-center transition-all group"
                style={{
                  left: ax,
                  top: ay,
                  width: Math.max(12, aw),
                  height: ah,
                }}
              >
                <span className="text-[9px] font-bold text-slate-300 group-hover:text-white font-mono-numbers">
                  {aisle.number}
                </span>
                <span
                  className="w-1.5 h-1.5 rounded-full mt-0.5"
                  style={{ backgroundColor: aisle.color }}
                />
              </button>
            );
          })}

          {/* Checkout Counters */}
          <button
            onClick={onTeleportCheckout}
            title="Click to fly to Checkout Counters"
            className="absolute rounded bg-slate-800/90 hover:bg-emerald-600/40 border border-slate-700 hover:border-emerald-400 flex items-center justify-center transition-all"
            style={{
              left: toMapX(-10),
              top: toMapY(8.5),
              width: ((18 / 42) * mapW),
              height: ((3.5 / 32) * mapH),
            }}
          >
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
              Checkouts 1-4
            </span>
          </button>

          {/* Entrance Sliding Doors at bottom */}
          <div
            className="absolute bg-blue-500/30 border border-blue-400/60 rounded flex items-center justify-center text-[7px] text-blue-300 font-bold uppercase"
            style={{
              left: toMapX(-4),
              top: toMapY(14),
              width: ((8 / 42) * mapW),
              height: 7,
            }}
          >
            Entrance
          </div>

          {/* Low Stock Shelf Warning Pins */}
          {lowStockSlots.map((slot) => (
            <div
              key={slot.id}
              title="Low Stock Alert"
              className="absolute w-1.5 h-1.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/80 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                left: toMapX(slot.x),
                top: toMapY(slot.z),
              }}
            />
          ))}

          {/* Player Position & View Frustum Cone */}
          <div
            className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 transition-transform"
            style={{
              left: pMapX,
              top: pMapY,
              transform: `translate(-50%, -50%) rotate(${angleDeg}deg)`,
            }}
          >
            {/* View Frustum Cone */}
            <div
              className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[14px] border-b-blue-400/40"
            />
            {/* Center Player Dot */}
            <div className="w-2.5 h-2.5 rounded-full bg-blue-400 border border-white shadow-md mx-auto mt-0.5" />
          </div>
        </div>

        <div className="text-[9px] text-slate-500 text-center pt-1.5">
          Click any aisle or checkout to glide there
        </div>
      </div>
    </div>
  );
};
