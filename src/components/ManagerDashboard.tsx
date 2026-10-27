import React, { useState } from 'react';
import { ShieldAlert, RefreshCw, Sparkles, TrendingUp, DollarSign, PackageCheck, AlertTriangle, X, Search, Edit3, Check } from 'lucide-react';
import { Product, ShelfSlot, AuditEntry } from '../types';
import { AISLE_CONFIG } from '../data/catalog';

interface ManagerDashboardProps {
  products: Product[];
  shelfSlots: ShelfSlot[];
  auditLog: AuditEntry[];
  onRestockSlot: (slotId: string, amount: number) => void;
  onRestockAllLow: () => void;
  onUpdatePrice: (productId: string, newPrice: number) => void;
  onUpdateQuantity: (slotId: string, newQty: number) => void;
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
  onUpdateQuantity,
  onOpenAiAnalyst,
  onClose,
}) => {
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingQtySlotId, setEditingQtySlotId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState<string>('');
  const [qtyInput, setQtyInput] = useState<string>('');
  const [filterLowStock, setFilterLowStock] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAisle, setSelectedAisle] = useState<number | 'all'>('all');

  // Compute Store Metrics
  const totalItems = products.length;
  const totalStockUnits = shelfSlots.reduce((sum, s) => sum + s.currentStock, 0);
  const totalCapacity = shelfSlots.reduce((sum, s) => sum + s.maxCapacity, 0);
  const lowStockSlots = shelfSlots.filter((s) => s.currentStock <= s.reorderThreshold);

  const inventoryValue = shelfSlots.reduce((sum, slot) => {
    const p = products.find((prod) => prod.id === slot.productId);
    return sum + (p ? p.price * slot.currentStock : 0);
  }, 0);

  const totalSalesEstimated = shelfSlots.reduce((sum, slot) => {
    const p = products.find((prod) => prod.id === slot.productId);
    return sum + (p ? p.price * slot.salesCount : 0);
  }, 0);

  // Sales by Aisle for mini bar chart
  const aisleSales = AISLE_CONFIG.map((a) => {
    const aSlots = shelfSlots.filter((s) => s.aisleNumber === a.number);
    const rev = aSlots.reduce((sum, s) => {
      const p = products.find((prod) => prod.id === s.productId);
      return sum + (p ? p.price * s.salesCount : 0);
    }, 0);
    return { aisle: a, revenue: rev };
  });
  const maxAisleRev = Math.max(...aisleSales.map((x) => x.revenue), 1);

  // Filtered Slots
  const displayedSlots = shelfSlots.filter((slot) => {
    const prod = products.find((p) => p.id === slot.productId);
    if (!prod) return false;

    if (filterLowStock && slot.currentStock > slot.reorderThreshold) return false;
    if (selectedAisle !== 'all' && slot.aisleNumber !== selectedAisle) return false;
    if (
      searchQuery &&
      !prod.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !prod.sku.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleSavePrice = (productId: string) => {
    const val = parseFloat(priceInput);
    if (!isNaN(val) && val > 0) {
      onUpdatePrice(productId, val);
    }
    setEditingPriceId(null);
  };

  const handleSaveQty = (slotId: string) => {
    const val = parseInt(qtyInput, 10);
    if (!isNaN(val) && val >= 0) {
      onUpdateQuantity(slotId, val);
    }
    setEditingQtySlotId(null);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 max-h-[85vh] bg-[#101A3A] border-t border-slate-700 shadow-2xl text-[#F7F6F2] flex flex-col animate-slide-up select-none">
      {/* Top Header */}
      <div className="p-3.5 px-6 bg-[#0D1530] border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-sm text-white flex items-center gap-2">
              <span>Omega Store Manager Dashboard</span>
              <span className="text-[10px] font-mono-numbers bg-emerald-500/20 text-[#19C39A] px-2 py-0.5 rounded font-bold">
                LIVE 3D TWIN SYNC
              </span>
            </h2>
            <p className="text-[10px] text-slate-400">
              Authorized session · Real-time shelf inventory, price adjustment, and audit log
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAiAnalyst}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-[#5B3DF5] hover:from-amber-500 hover:to-[#6B4FF8] text-white rounded-lg text-xs font-bold shadow-md transition-all active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>AI Inventory Analyst</span>
          </button>

          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 px-6 bg-[#101A3A] border-b border-slate-800 text-xs">
        <div className="bg-[#182346] border border-slate-700/80 rounded-xl p-3">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Products / Units</span>
          <span className="font-heading font-extrabold text-lg text-white font-mono-numbers">
            {totalItems} items · {totalStockUnits} units
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Store Capacity: {Math.round((totalStockUnits / totalCapacity) * 100)}% filled
          </span>
        </div>

        <div className="bg-[#182346] border border-slate-700/80 rounded-xl p-3">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Inventory Value</span>
          <span className="font-heading font-extrabold text-lg text-[#19C39A] font-mono-numbers">
            ${inventoryValue.toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Total retail on shelf</span>
        </div>

        <div className="bg-[#182346] border border-slate-700/80 rounded-xl p-3">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Critical Stock Alerts</span>
          <span className="font-heading font-extrabold text-lg text-[#FF5A4D] font-mono-numbers">
            {lowStockSlots.length} low stock items
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Below reorder threshold</span>
        </div>

        <div className="bg-[#182346] border border-slate-700/80 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Quick Actions</span>
          <button
            disabled={lowStockSlots.length === 0}
            onClick={onRestockAllLow}
            className="mt-1 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#19C39A] hover:bg-[#16A34A] disabled:opacity-40 text-[#101A3A] rounded-lg text-xs font-bold transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Restock All ({lowStockSlots.length})</span>
          </button>
        </div>
      </div>

      {/* Main Body: Table & Analytics */}
      <div className="flex-1 overflow-y-auto p-4 px-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Search, Filter & Inventory Table */}
        <div className="lg:col-span-2 space-y-3">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#182346] p-2.5 rounded-xl border border-slate-700/80">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search inventory by name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none flex-1"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedAisle}
                onChange={(e) => setSelectedAisle(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
                className="bg-[#101A3A] border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200"
              >
                <option value="all">All Aisles</option>
                {AISLE_CONFIG.map((a) => (
                  <option key={a.number} value={a.number}>
                    Aisle 0{a.number} · {a.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setFilterLowStock(!filterLowStock)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                  filterLowStock
                    ? 'bg-[#FF5A4D]/20 border-[#FF5A4D] text-[#FF5A4D]'
                    : 'bg-[#101A3A] border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {filterLowStock ? 'Low Stock Only' : 'Show All'}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0D1530] text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Product / SKU</th>
                  <th className="py-2.5 px-3">Aisle</th>
                  <th className="py-2.5 px-3">Shelf Quantity</th>
                  <th className="py-2.5 px-3">Price</th>
                  <th className="py-2.5 px-3 text-right">Restock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-[#141E3C]">
                {displayedSlots.map((slot) => {
                  const prod = products.find((p) => p.id === slot.productId);
                  if (!prod) return null;
                  const isLow = slot.currentStock <= slot.reorderThreshold;
                  const isCritical = slot.currentStock <= 2;
                  const pct = Math.round((slot.currentStock / slot.maxCapacity) * 100);

                  return (
                    <tr key={slot.id} className="hover:bg-[#1C2852] transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-white">{prod.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono-numbers">
                          {prod.brandName} · {prod.sku}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="text-slate-300">A0{slot.aisleNumber}</span>
                      </td>
                      <td className="py-2.5 px-3 min-w-[140px]">
                        {editingQtySlotId === slot.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="16"
                              value={qtyInput}
                              onChange={(e) => setQtyInput(e.target.value)}
                              className="w-14 bg-[#101A3A] border border-[#5B3DF5] rounded px-1.5 py-0.5 text-xs text-white"
                            />
                            <button
                              onClick={() => handleSaveQty(slot.id)}
                              className="px-2 py-0.5 bg-[#5B3DF5] text-[10px] rounded text-white"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <div
                            className="flex items-center gap-2 cursor-pointer group"
                            onClick={() => {
                              setEditingQtySlotId(slot.id);
                              setQtyInput(slot.currentStock.toString());
                            }}
                            title="Click to edit quantity"
                          >
                            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isCritical
                                    ? 'bg-[#FF5A4D]'
                                    : isLow
                                    ? 'bg-amber-400'
                                    : 'bg-[#19C39A]'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span
                              className={`font-mono-numbers text-[11px] font-bold ${
                                isCritical
                                  ? 'text-[#FF5A4D]'
                                  : isLow
                                  ? 'text-amber-400'
                                  : 'text-slate-300'
                              }`}
                            >
                              {slot.currentStock}/{slot.maxCapacity}
                            </span>
                            <Edit3 className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100" />
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {editingPriceId === prod.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.10"
                              value={priceInput}
                              onChange={(e) => setPriceInput(e.target.value)}
                              className="w-16 bg-[#101A3A] border border-[#5B3DF5] rounded px-1.5 py-0.5 text-xs text-white"
                            />
                            <button
                              onClick={() => handleSavePrice(prod.id)}
                              className="px-2 py-0.5 bg-[#5B3DF5] text-[10px] rounded text-white"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingPriceId(prod.id);
                              setPriceInput(prod.price.toString());
                            }}
                            className="font-mono-numbers font-bold text-white hover:text-[#5B3DF5] transition-colors flex items-center gap-1"
                          >
                            <span>${prod.price.toFixed(2)}</span>
                            <Edit3 className="w-3 h-3 text-slate-500 opacity-40 hover:opacity-100" />
                          </button>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => onRestockSlot(slot.id, 6)}
                          className="px-2.5 py-1 bg-[#182346] hover:bg-[#202E5C] text-slate-200 text-[11px] font-semibold rounded-md border border-slate-700 transition-colors"
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

        {/* Right Col: Mini Sales Chart & Live Audit Trail */}
        <div className="space-y-4">
          {/* Mini Sales Chart by Aisle */}
          <div className="bg-[#182346] border border-slate-700/80 rounded-xl p-4 space-y-3">
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#5B3DF5]" />
              <span>Sales Velocity by Aisle</span>
            </h3>

            <div className="space-y-2 pt-1">
              {aisleSales.map(({ aisle, revenue }) => {
                const pct = Math.round((revenue / maxAisleRev) * 100);
                return (
                  <div key={aisle.number} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-300 font-semibold truncate">
                        0{aisle.number}. {aisle.name}
                      </span>
                      <span className="font-mono-numbers font-bold text-white">${revenue.toFixed(0)}</span>
                    </div>
                    <div className="h-1.5 bg-[#101A3A] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: aisle.accentColor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audit Log */}
          <div className="bg-[#182346] border border-slate-700/80 rounded-xl p-4 space-y-3">
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <PackageCheck className="w-3.5 h-3.5 text-[#19C39A]" />
              <span>Session Audit Trail</span>
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {auditLog.length === 0 ? (
                <p className="text-[11px] text-slate-400">No restock or price actions yet.</p>
              ) : (
                auditLog.map((log) => (
                  <div key={log.id} className="text-[11px] border-b border-slate-700/50 pb-1.5">
                    <div className="flex justify-between text-slate-300 font-semibold">
                      <span>{log.productName}</span>
                      <span className="text-[10px] text-slate-500 font-mono-numbers">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <span className="text-slate-400 block text-[10px] mt-0.5">{log.details}</span>
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
