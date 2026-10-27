import React, { useState, useEffect } from 'react';

interface LoadingScreenProps {
  isLoading: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ isLoading }) => {
  const [progress, setProgress] = useState(20);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(timer);
          return 100;
        }
        return p + Math.floor(Math.random() * 25) + 10;
      });
    }, 120);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isLoading && progress >= 100) {
      const fadeOutTimer = setTimeout(() => {
        setShouldRender(false);
      }, 400);
      return () => clearTimeout(fadeOutTimer);
    }
  }, [isLoading, progress]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#101A3A] flex flex-col items-center justify-center p-6 text-white transition-opacity duration-400 select-none ${
        !isLoading && progress >= 100 ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="w-16 h-16 rounded-2xl bg-[#5B3DF5] flex items-center justify-center font-black text-3xl font-heading shadow-2xl shadow-[#5B3DF5]/40 mb-5 animate-pulse-slow">
        Ω
      </div>

      <h1 className="font-heading font-extrabold text-2xl tracking-wider uppercase mb-1">
        OMEGA SUPERMARKET
      </h1>
      <p className="text-xs text-slate-400 mb-8 tracking-wide">
        Building 3D store environment &amp; shelf stock twin...
      </p>

      {/* Progress Bar */}
      <div className="w-64 h-2 bg-[#182346] rounded-full overflow-hidden border border-slate-700/80">
        <div
          className="h-full bg-gradient-to-r from-[#5B3DF5] to-[#19C39A] rounded-full transition-all duration-150 ease-out"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>

      <span className="text-[10px] font-mono-numbers text-slate-500 mt-2 font-bold">
        {Math.min(100, progress)}% READY
      </span>
    </div>
  );
};
