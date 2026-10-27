import React from 'react';
import { Compass, MousePointer, ShieldCheck, ArrowRight, Smartphone } from 'lucide-react';

interface HelpOverlayProps {
  isOpen: boolean;
  onDismiss: () => void;
}

export const HelpOverlay: React.FC<HelpOverlayProps> = ({ isOpen, onDismiss }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in select-none">
      <div className="relative w-full max-w-lg bg-[#101A3A] border border-slate-700 rounded-2xl shadow-2xl p-6 md:p-8 text-[#F7F6F2] space-y-6">
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#5B3DF5] flex items-center justify-center text-white font-heading font-black text-2xl shadow-lg shadow-[#5B3DF5]/30">
            Ω
          </div>
          <h2 className="font-heading font-extrabold text-xl text-white tracking-wide uppercase">
            Welcome to Omega Supermarket
          </h2>
          <p className="text-xs text-slate-300">
            A real-time walk-in 3D retail demo with shopping, physics add-to-cart, and inventory operations.
          </p>
        </div>

        {/* 3 Guide Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-[#182346] p-3.5 rounded-xl border border-slate-700/80 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <Compass className="w-4 h-4 text-[#5B3DF5]" />
              <span>Locomotion</span>
            </div>
            <p className="text-[11px] text-slate-300">
              <strong className="text-white">WASD</strong> or Arrows to walk. Hold <strong className="text-white">Shift</strong> to run. Drag mouse to look around.
            </p>
          </div>

          <div className="bg-[#182346] p-3.5 rounded-xl border border-slate-700/80 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <MousePointer className="w-4 h-4 text-[#19C39A]" />
              <span>Interact &amp; Fly</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Click any shelf item to inspect and add to cart. Search flies camera directly to matching shelves.
            </p>
          </div>

          <div className="bg-[#182346] p-3.5 rounded-xl border border-slate-700/80 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Manager Mode</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Toggle Manager Mode anytime with demo PIN <strong className="text-amber-300 font-mono-numbers">1234</strong> to edit stock and prices.
            </p>
          </div>
        </div>

        {/* Mobile controls note */}
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#182346]/60 border border-slate-800 text-[11px] text-slate-400">
          <Smartphone className="w-4 h-4 text-blue-400 shrink-0" />
          <span>Mobile: Use the left virtual touch joystick to move, and drag the right half of the screen to look.</span>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onDismiss}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#5B3DF5] hover:bg-[#6B4FF8] active:scale-98 text-white text-xs font-bold rounded-xl shadow-lg shadow-[#5B3DF5]/30 transition-all tracking-wide"
        >
          <span>Enter Omega Supermarket</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
