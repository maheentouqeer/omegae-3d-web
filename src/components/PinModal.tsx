import React, { useState } from 'react';
import { Shield, X, AlertCircle } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '1234') {
      setError(false);
      setPin('');
      onSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fade-in select-none">
      <div className="relative w-full max-w-sm bg-[#101A3A] border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-[#F7F6F2] space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="font-heading font-bold text-sm text-white">Manager Security PIN</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300">
          Enter the manager authorization code to access real-time inventory and pricing controls.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <input
              type="password"
              maxLength={4}
              autoFocus
              placeholder="Enter PIN (Demo: 1234)"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError(false);
              }}
              className="w-full text-center text-lg tracking-widest bg-[#182346] border border-slate-700 rounded-xl py-2.5 font-mono-numbers text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#5B3DF5]"
            />
            {error && (
              <span className="text-[11px] text-[#FF5A4D] flex items-center gap-1 mt-1.5 justify-center">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Incorrect PIN. Hint: Use demo PIN 1234</span>
              </span>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-[#5B3DF5] hover:bg-[#6B4FF8] text-white text-xs font-bold rounded-xl shadow-md transition-all"
          >
            Authorize Access
          </button>
        </form>
      </div>
    </div>
  );
};
