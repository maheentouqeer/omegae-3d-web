import React from 'react';
import { ShoppingBag, RotateCcw, X } from 'lucide-react';
import { CartToast } from '../types';

interface CartToastProps {
  toast: CartToast | null;
  onUndo: (toast: CartToast) => void;
  onDismiss: () => void;
}

export const CartToastNotification: React.FC<CartToastProps> = ({
  toast,
  onUndo,
  onDismiss,
}) => {
  if (!toast) return null;

  return (
    <div
      className="fixed bottom-20 right-6 z-50 flex items-center gap-3 bg-[#101A3A] border border-[#5B3DF5] text-white px-4 py-3 rounded-xl shadow-2xl animate-slide-up"
      role="status"
      aria-live="polite"
    >
      <div className="w-7 h-7 rounded-lg bg-[#19C39A]/20 text-[#19C39A] flex items-center justify-center shrink-0">
        <ShoppingBag className="w-4 h-4" />
      </div>

      <div className="text-xs">
        <span className="font-semibold">{toast.message}</span>
      </div>

      <div className="flex items-center gap-1.5 ml-2 border-l border-slate-700 pl-2.5">
        {toast.productId && (
          <button
            onClick={() => onUndo(toast)}
            className="flex items-center gap-1 text-xs font-bold text-[#5B3DF5] hover:text-[#7C5FFC] px-2 py-1 rounded bg-[#182346] hover:bg-[#202E5C] transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Undo</span>
          </button>
        )}

        <button
          onClick={onDismiss}
          className="p-1 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
