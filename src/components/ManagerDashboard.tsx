import React, { useState } from 'react';
import { ShieldAlert, RefreshCw, Sparkles, TrendingUp, DollarSign, PackageCheck, AlertTriangle, X } from 'lucide-react';
import { Product, ShelfSlot, AuditEntry } from '../types';

interface ManagerDashboardProps {
  products: Product[];
  shelfSlots: ShelfSlot[];
  auditLog: AuditEntry[];
  onRestockSlot: (slotId: string, amount: number) => void;
  onRestockAllLow: () => void;
  onUpdatePrice: (productId: string, newPrice: number) => void;
  onOpenAiAnalyst: () => void;
  onClose: () => void;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  products,
  shelfSlots,
  auditLog,
  onRestockSlot,
  onRestockAllLow,
  onUpdatePrice,
  onOpenAiAnalyst,
  onClose,
}) => {
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [newPriceInput, setNewPriceInput] = useState<string>('');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState<boolean>(false);

  // Compute metrics
  const totalStockUnits = shelfSlots.reduce((sum, s) => sum + s.currentStock, 0);
  const totalCapacity = shelfSlots.reduce((sum, s) => sum + s.maxCapacity, 0);
  const lowStockSlots = shelfSlots.filter((s) => s.currentStock <= s.reorderThreshold);
  const stockFullnessPercent = Math.round((totalStockUnits / totalCapacity) * 100);

  const displayedSlots = filterLowStockOnly
    ? shelfSlots.filter((s) => s.currentStock <= s.reorderThreshold)
    : shelfSlots;

  const handleStartEditPrice = (product: Product) => {
    setEditingPriceId(product.id);
    setNewPriceInput(product.price.toString());
  };

  const handleSavePrice = (productId: string) => {
    const val = parseFloat(newPriceInput);
    if (!isNaN(val) && val > 0) {
      onUpdatePrice(productId, val);
    }
    setEditingPriceId(null);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 max-h-[85vh] bg-slate-900 border-t border-slate-700 shadow-2xl text-slate-100 flex flex-col animate-slide-up">
      {/* Top Bar of Manager Console */}
      <div className="p-3.5 px-6 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-sm text-white">
              Omega Manager &amp; Inventory Operations
            </h2>
            <p className="text-[10px] text-slate-400">
              Live shelf capacity twin, restock control, and dynamic pricing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Analyst Trigger */}
          <button
            onClick={onOpenAiAnalyst}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>AI Stock Analyst</span>
          </button>

          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 px-6 bg-slate-900/60 border-b border-slate-800 text-xs">
        <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Store Fullness</span>
          <span className="font-heading font-extrabold text-lg text-white font-mono-numbers">
            {stockFullnessPercent}%
          </span>
          <span className="text-[10px] text-slate-500 block">
            {totalStockUnits} / {totalCapacity} units on shelves
          </span>
        </div>

        <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Critical Alerts</span>
          <span className="font-heading font-extrabold text-lg text-rose-400 font-mono-numbers">
            {lowStockSlots.length} items
          </span>
          <span className="text-[10px] text-slate-500 block">Stock &le; Reorder Threshold</span>
        </div>

        <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Restock Audit Log</span>
          <span className="font-heading font-extrabold text-lg text-emerald-400 font-mono-numbers">
            {auditLog.length} events
          </span>
          <span className="text-[10px] text-slate-500 block">Logged during session</span>
        </div>

        <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Quick Restock</span>
          <button
            disabled={lowStockSlots.length === 0}
            onClick={onRestockAllLow}
            className="w-full mt-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition-all"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Restock All ({lowStockSlots.length})</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Split between Inventory Grid and Audit Log */}
      <div className="flex-1 overflow-y-auto p-4 px-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Inventory List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-xs uppercase tracking-wide text-slate-300">
              Shelf Slot Inventory Status
            </h3>
            <button
              onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                filterLowStockOnly
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {filterLowStockOnly ? 'Showing Low Stock Only' : 'Filter Low Stock'}
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Product / SKU</th>
                  <th className="py-2.5 px-3">Aisle</th>
                  <th className="py-2.5 px-3">Stock Fullness</th>
                  <th className="py-2.5 px-3">Price</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
                {displayedSlots.map((slot) => {
                  const prod = products.find((p) => p.id === slot.productId);
                  if (!prod) return null;
                  const isLow = slot.currentStock <= slot.reorderThreshold;
                  const pct = Math.round((slot.currentStock / slot.maxCapacity) * 100);

                  return (
                    <tr key={slot.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-200">{prod.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono-numbers">{prod.sku}</div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="text-slate-300">Aisle {slot.aisleNumber}</span>
                      </td>
                      <td className="py-2.5 px-3 min-w-[130px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isLow ? 'bg-rose-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span
                            className={`font-mono-numbers text-[11px] font-semibold ${
                              isLow ? 'text-rose-400' : 'text-slate-300'
                            }`}
                          >
                            {slot.currentStock}/{slot.maxCapacity}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {editingPriceId === prod.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.10"
                              value={newPriceInput}
                              onChange={(e) => setNewPriceInput(e.target.value)}
                              className="w-16 bg-slate-950 border border-blue-500 rounded px-1.5 py-0.5 text-xs text-white"
                            />
                            <button
                              onClick={() => handleSavePrice(prod.id)}
                              className="px-2 py-0.5 bg-blue-600 text-[10px] rounded text-white"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEditPrice(prod)}
                            className="font-mono-numbers font-medium text-slate-200 hover:text-blue-400 transition-colors"
                          >
                            ${prod.price.toFixed(2)}
                          </button>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => onRestockSlot(slot.id, 6)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold rounded-md border border-slate-700 transition-colors"
                        >
                          +6 Restock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Audit Log & Heatmap Insights */}
        <div className="space-y-4">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="font-heading font-bold text-xs uppercase tracking-wide text-slate-300 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              <span>Top Selling Velocity</span>
            </h3>
            <div className="space-y-2">
              {products.slice(0, 4).map((p, idx) => (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 truncate max-w-[140px]">
                    {idx + 1}. {p.name}
                  </span>
                  <span className="font-mono-numbers text-emerald-400 font-semibold">
                    ${(p.price * 24).toFixed(0)} vol
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="font-heading font-bold text-xs uppercase tracking-wide text-slate-300 flex items-center gap-1.5">
              <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Live Audit Trail</span>
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {auditLog.length === 0 ? (
                <p className="text-[11px] text-slate-500">No restock actions recorded yet.</p>
              ) : (
                auditLog.map((log) => (
                  <div key={log.id} className="text-[11px] border-b border-slate-800/60 pb-1.5">
                    <span className="text-slate-200 font-medium">{log.productName}</span>
                    <span className="text-slate-400 block text-[10px]">{log.details}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
