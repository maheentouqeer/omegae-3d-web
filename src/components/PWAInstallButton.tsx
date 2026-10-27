import React, { useState } from 'react';
import { Download, Check, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setJustInstalled(true);
      setTimeout(() => setJustInstalled(false), 3000);
    }
  };

  return (
    <>
      {isInstallable && (
        <button
          onClick={handleInstallClick}
          title="Install Omega 3D Supermarket as a native web app"
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#182346] hover:bg-[#223060] border border-slate-700/80 rounded-lg text-xs font-semibold text-slate-200 transition-colors shrink-0"
        >
          {justInstalled ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#19C39A]" />
              <span className="hidden xl:inline text-[#19C39A]">Installed!</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5 text-[#5B3DF5]" />
              <span className="hidden xl:inline">Install App</span>
            </>
          )}
        </button>
      )}

      {isIOS && !isInstallable && (
        <button
          onClick={() => setShowIOSGuide(true)}
          title="Install on iPhone / iPad"
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#182346] hover:bg-[#223060] border border-slate-700/80 rounded-lg text-xs font-semibold text-slate-200 transition-colors shrink-0"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#5B3DF5]" />
          <span className="hidden xl:inline">Install iOS</span>
        </button>
      )}

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-[#101A3A] border border-slate-700 p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-heading font-bold text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#5B3DF5]" />
                Install on iPhone / iPad
              </h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#5B3DF5] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  Tap the <strong>Share</strong> button at the bottom of Safari.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#5B3DF5] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#19C39A] text-[#101A3A] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  ✓
                </span>
                <span>Launch Omega directly from your home screen in standalone mode.</span>
              </div>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-6 w-full rounded-xl bg-[#5B3DF5] hover:bg-[#6B4FF8] py-2 text-xs font-bold text-white transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
