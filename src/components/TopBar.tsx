import React, { useState } from 'react';
import { ShoppingCart, Volume2, VolumeX, Sparkles, LayoutList, Box, Search, Compass, ShieldAlert } from 'lucide-react';
import { Product, ViewMode, AppMode } from '../types';
import { AISLE_CONFIG } from '../data/catalog';

interface TopBarProps {
  cartCount: number;
  viewMode: ViewMode;
  appMode: AppMode;
  isMuted: boolean;
  products: Product[];
  onToggleCart: () => void;
  onToggleSound: () => void;
  onToggleViewMode: () => void;
  onToggleAppMode: () => void;
  onOpenAi: () => void;
  onSelectProduct: (product: Product) => void;
  onSelectAisle: (aisleNum: number) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  cartCount,
  viewMode,
  appMode,
  isMuted,
  products,
  onToggleCart,
  onToggleSound,
  onToggleViewMode,
  onToggleAppMode,
  onOpenAi,
  onSelectProduct,
  onSelectAisle,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showAisleMenu, setShowAisleMenu] = useState(false);

  const filteredProducts = searchQuery.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-slate-900/90 border-b border-slate-800 text-white px-4 lg:px-6 py-2.5 flex items-center justify-between gap-4 md:gap-8 shadow-lg">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-extrabold text-white text-lg tracking-wider font-heading shadow-md shadow-blue-500/20">
          Ω
        </div>
        <div className="flex flex-col">
          <span className="font-heading font-extrabold text-base tracking-wide text-white uppercase whitespace-nowrap">
            OMEGA SUPERMARKET
          </span>
          <span className="text-[10px] text-blue-300 font-medium tracking-wider uppercase -mt-0.5">
            {appMode === 'manager' ? 'Store Manager Console' : '3D Walk-in Grocery'}
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation & Search */}
      <div className="flex-1 max-w-xl hidden md:flex items-center gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search 64+ items or aisles..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Search Dropdown Results */}
          {showSearchResults && filteredProducts.length > 0 && (
            <div
              className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden z-50 divide-y divide-slate-800"
              onMouseLeave={() => setShowSearchResults(false)}
            >
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectProduct(p);
                    setShowSearchResults(false);
                    setSearchQuery('');
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center justify-between text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: p.baseColor }}
                    />
                    <span className="font-medium text-slate-200 truncate">{p.name}</span>
                    <span className="text-[10px] text-slate-400">Aisle {p.aisleNumber}</span>
                  </div>
                  <span className="font-mono-numbers text-slate-300 font-semibold">
                    ${p.price.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Aisle Quick Jump Menu */}
        <div className="relative">
          <button
            onClick={() => setShowAisleMenu(!showAisleMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 rounded-lg text-xs font-medium text-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            <Compass className="w-3.5 h-3.5 text-blue-400" />
            <span>Aisles (1-8)</span>
          </button>

          {showAisleMenu && (
            <div
              className="absolute left-0 top-full mt-1.5 w-56 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 z-50 divide-y divide-slate-800/60"
              onMouseLeave={() => setShowAisleMenu(false)}
            >
              {AISLE_CONFIG.map((a) => (
                <button
                  key={a.number}
                  onClick={() => {
                    onSelectAisle(a.number);
                    setShowAisleMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-xs transition-colors"
                >
                  <span className="font-medium text-slate-200">
                    Aisle {a.number} · {a.name}
                  </span>
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: a.color }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View Mode Toggle: 3D vs List */}
        <button
          onClick={onToggleViewMode}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 rounded-lg text-xs font-medium text-slate-200 transition-colors whitespace-nowrap shrink-0"
        >
          {viewMode === '3d' ? (
            <>
              <LayoutList className="w-3.5 h-3.5 text-emerald-400" />
              <span>Catalog List</span>
            </>
          ) : (
            <>
              <Box className="w-3.5 h-3.5 text-blue-400" />
              <span>3D Walk-in</span>
            </>
          )}
        </button>

        {/* Mode Toggle: Shopper vs Manager */}
        <button
          onClick={onToggleAppMode}
          className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            appMode === 'manager'
              ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 hover:bg-amber-500/30'
              : 'bg-slate-800/80 border-slate-700/80 text-slate-200 hover:bg-slate-700'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>{appMode === 'manager' ? 'Exit Manager' : 'Manager Mode'}</span>
        </button>
      </div>

      {/* Zone 3: Actions & Cart CTA */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Gemini AI Assistant Button */}
        <button
          onClick={onOpenAi}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all active:scale-95 whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-200 animate-spin-slow" />
          <span>{appMode === 'manager' ? 'Stock AI' : 'AI Concierge'}</span>
        </button>

        {/* Audio Mute Toggle */}
        <button
          onClick={onToggleSound}
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          className="p-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 rounded-lg text-slate-300 transition-colors"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>

        {/* Cart Drawer Trigger */}
        <button
          onClick={onToggleCart}
          className="relative flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-600/30 transition-all whitespace-nowrap shrink-0"
        >
          <ShoppingCart className="w-4 h-4 text-white" />
          <span className="hidden sm:inline">Cart</span>
          <span className="px-1.5 py-0.2 bg-white text-blue-900 rounded-full text-[11px] font-bold font-mono-numbers">
            {cartCount}
          </span>
        </button>
      </div>
    </header>
  );
};
