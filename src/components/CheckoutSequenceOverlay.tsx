import React from 'react';
import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { CartItem } from '../types';

interface CheckoutSequenceOverlayProps {
  isActive: boolean;
  stepMessage: string;
  scannedIndex: number;
  totalItems: number;
  currentItem?: CartItem;
  totalAmount: number;
  onSkip: () => void;
}

export const CheckoutSequenceOverlay: React.FC<CheckoutSequenceOverlayProps> = ({
  isActive,
  stepMessage,
  scannedIndex,
  totalItems,
  currentItem,
  totalAmount,
  onSkip,
}) => {
  if (!isActive) return null;

  const progressPercent = totalItems > 0 ? Math.min(100, Math.round((scannedIndex / totalItems) * 100)) : 0;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex flex-col justify-between p-4 sm:p-6 select-none animate-fade-in">
      {/* Top Banner: Cashier Speech & Status */}
      <div className="max-w-xl mx-auto w-full pointer-events-auto">
        <div className="bg-[#101A3A]/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 shadow-2xl flex items-center gap-3.5 sm:gap-4 animate-slide-down">
          {/* Cashier Avatar */}
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-full bg-[#5B3DF5] border-2 border-white/20 flex items-center justify-center text-white font-bold text-lg shadow-md">
              A
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#19C39A] border-2 border-[#101A3A] flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            </span>
          </div>

          {/* Cashier Speech Bubble */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white tracking-wide">Alex</span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-[#5B3DF5]/30 text-[#8B6DF8] border border-[#5B3DF5]/50">
                  Cashier · Lane 1
                </span>
              </div>
              <span className="text-xs font-mono-numbers text-slate-400 font-medium">
                {scannedIndex} / {totalItems} items
              </span>
            </div>

            <p className="text-sm font-medium text-slate-200 mt-1 truncate">
              {stepMessage || 'Scanning your items...'}
            </p>

            {/* Scanning Progress Bar */}
            <div className="w-full bg-slate-800/80 rounded-full h-1.5 mt-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#5B3DF5] to-[#19C39A] h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Scanned Item Card (Bottom Center) */}
      {currentItem && (
        <div className="max-w-sm mx-auto w-full pointer-events-auto">
          <div className="bg-[#101A3A]/95 border border-[#19C39A]/40 rounded-xl p-3 shadow-xl backdrop-blur-md flex items-center justify-between gap-3 animate-bounce-cart">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs shadow-xs"
                style={{
                  backgroundColor: currentItem.product.baseColor,
                  color: currentItem.product.accentColor || '#FFFFFF',
                }}
              >
                ✓
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-bold text-white truncate">
                  {currentItem.product.name}
                </h5>
                <span className="text-[11px] text-slate-400">
                  Qty: {currentItem.quantity} · {currentItem.product.brandName}
                </span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xs font-bold font-mono-numbers text-[#19C39A] block">
                ${(
                  (currentItem.product.isSale && currentItem.product.salePrice
                    ? currentItem.product.salePrice
                    : currentItem.product.price) * currentItem.quantity
                ).toFixed(2)}
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5 justify-end">
                <CheckCircle2 className="w-2.5 h-2.5" /> Scanned
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Controls: Skip to Payment */}
      <div className="flex items-center justify-between max-w-xl mx-auto w-full pointer-events-auto">
        <div className="text-xs text-slate-300 bg-[#101A3A]/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-700/60 font-medium">
          Estimated Total:{' '}
          <span className="font-mono-numbers font-bold text-[#19C39A] ml-1">
            ${totalAmount.toFixed(2)}
          </span>
        </div>

        <button
          onClick={onSkip}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white rounded-xl text-xs font-semibold shadow-lg backdrop-blur-sm transition-all active:scale-95 cursor-pointer"
        >
          <span>Skip to Payment</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    </div>
  );
};
