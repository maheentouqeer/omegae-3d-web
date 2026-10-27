import React, { useState } from 'react';
import {
  ShoppingCart,
  Volume2,
  VolumeX,
  LayoutList,
  Search,
  Compass,
  ShieldAlert,
  Sparkles,
  ChevronDown,
  Sliders,
  History,
} from 'lucide-react';
import { Product, AppMode } from '../types';
import { AISLE_CONFIG } from '../data/catalog';
import { sound } from '../utils/audio';
import { PWAInstallButton } from './PWAInstallButton';

interface TopBarProps {
  cartCount: number;
  isCartBouncing: boolean;
  appMode: AppMode;
  isMuted: boolean;
  effectsEnabled: boolean;
  isIdle: boolean;
  products: Product[];
  onToggleCart: () => void;
  onToggleSound: () => void;
  onToggleEffects: () => void;
  onOpenListDrawer: () => void;
  onOpenOrderHistory: () => void;
  onRequestManagerMode: () => void;
  onSelectProduct: (product: Product) => void;
  onSelectAisle: (aisleNum: number) => void;
  onOpenAi: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  cartCount,
  isCartBouncing,
  appMode,
  isMuted,
  effectsEnabled,
  isIdle,
  products,
  onToggleCart,
  onToggleSound,
  onToggleEffects,
  onOpenListDrawer,
  onOpenOrderHistory,
  onRequestManagerMode,
  onSelectProduct,
  onSelectAisle,
  onOpenAi,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showAisleMenu, setShowAisleMenu] = useState(false);
  const [showVolumePopup, setShowVolumePopup] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(sound.getVolume());

  const filteredProducts = searchQuery.trim()
    ? products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 6)
    : [];

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentVolume(val);
    sound.setVolume(val);
    if (isMuted && val > 0) {
      onToggleSound();
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 bg-[#101A3A]/95 border-b border-slate-800/80 text-[#F7F6F2] px-3 sm:px-5 py-2 flex items-center justify-between gap-3 shadow-xl backdrop-blur-md select-none transition-all duration-500 ${
        isIdle ? 'opacity-35 hover:opacity-100' : 'opacity-100'
      }`}
    >
      {/* Zone 1: Logo & 'Shelves live' Badge */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-[#5B3DF5] flex items-center justify-center font-bold text-white text-base font-heading shadow-md shadow-[#5B3DF5]/30">
          Ω
        </div>
        <div className="flex items-center gap-2">
          <span className="font-heading font-extrabold text-sm tracking-wider text-white uppercase whitespace-nowrap">
            OMEGA
          </span>
          {/* 'Shelves live' badge from Replit */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#19C39A]/15 border border-[#19C39A]/30 text-[10px] font-bold text-[#19C39A]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#19C39A] animate-pulse" />
            <span>Shelves live</span>
          </div>
        </div>
      </div>

      {/* Zone 2: Merged Navigation & Search (Slim, no clutter) */}
      <div className="flex-1 max-w-lg hidden md:flex items-center gap-2">
        {/* Search Input with Auto-Suggest */}
        <div className="relative flex-1">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search 104 products, brands, or aisles..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              className="w-full bg-[#182346] border border-slate-700/70 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#5B3DF5] focus:border-[#5B3DF5] transition-all"
            />
          </div>

          {showSearchResults && filteredProducts.length > 0 && (
            <div
              className="absolute left-0 right-0 top-full mt-1.5 bg-[#101A3A] border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 divide-y divide-slate-800/80"
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
                  className="w-full text-left px-3.5 py-2 hover:bg-[#1C2852] flex items-center justify-between text-xs transition-colors group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: p.baseColor }}
                    />
                    <div className="truncate">
                      <span className="font-semibold text-slate-200 group-hover:text-white block truncate">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {p.brandName} · Aisle {p.aisleNumber}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono-numbers text-slate-200 font-bold ml-2 shrink-0">
                    ${p.price.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Aisles 1-8 Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowAisleMenu(!showAisleMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#182346] hover:bg-[#202E5C] border border-slate-700/70 rounded-lg text-xs font-semibold text-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            <Compass className="w-3.5 h-3.5 text-[#5B3DF5]" />
            <span>Aisles 1-8</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showAisleMenu && (
            <div
              className="absolute left-0 top-full mt-1.5 w-60 bg-[#101A3A] border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 divide-y divide-slate-800/60 animate-fade-in"
              onMouseLeave={() => setShowAisleMenu(false)}
            >
              {AISLE_CONFIG.map((a) => (
                <button
                  key={a.number}
                  onClick={() => {
                    onSelectAisle(a.number);
                    setShowAisleMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#1C2852] flex items-center justify-between text-xs transition-colors"
                >
                  <div>
                    <span className="font-bold text-white block">
                      Aisle 0{a.number} · {a.name}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate max-w-[180px]">
                      {a.subLabel}
                    </span>
                  </div>
                  <span
                    className="w-2 h-2 rounded-full shrink-0 ml-2"
                    style={{ backgroundColor: a.accentColor }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Drawer Toggle */}
        <button
          onClick={onOpenListDrawer}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#182346] hover:bg-[#202E5C] border border-slate-700/70 rounded-lg text-xs font-semibold text-slate-200 transition-colors whitespace-nowrap shrink-0"
        >
          <LayoutList className="w-3.5 h-3.5 text-[#19C39A]" />
          <span>Catalog</span>
        </button>
      </div>

      {/* Zone 3: Shopper & Manager Switch (from Bolt) */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onRequestManagerMode}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
            appMode === 'manager'
              ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
              : 'bg-[#182346] border-slate-700/70 text-slate-300 hover:text-white hover:bg-[#202E5C]'
          }`}
          title={appMode === 'manager' ? 'Exit Manager Mode' : 'Manager Mode (PIN: 1234)'}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">
            {appMode === 'manager' ? 'Manager Active' : 'Manager (1234)'}
          </span>
          <span className="sm:hidden">{appMode === 'manager' ? 'Mgr' : 'Shop'}</span>
        </button>

        {/* PWA In-App Install Button (from Base44) */}
        <PWAInstallButton />

        {/* Order History */}
        <button
          onClick={onOpenOrderHistory}
          title="View Past Receipts & Order History"
          className="p-1.5 bg-[#182346] hover:bg-[#202E5C] border border-slate-700/70 rounded-lg text-slate-300 transition-colors hidden sm:block"
        >
          <History className="w-4 h-4 text-slate-300" />
        </button>

        {/* Effects Toggle (Bloom, Vignette, Contact Shadows) */}
        <button
          onClick={onToggleEffects}
          title={effectsEnabled ? 'Disable Visual Effects' : 'Enable Visual Effects'}
          className="p-1.5 bg-[#182346] hover:bg-[#202E5C] border border-slate-700/70 rounded-lg text-slate-300 transition-colors hidden lg:block"
        >
          <Sliders
            className={`w-4 h-4 ${effectsEnabled ? 'text-[#5B3DF5]' : 'text-slate-500'}`}
          />
        </button>


        {/* Sound Toggle + Slider */}
        <div className="relative">
          <button
            onClick={onToggleSound}
            onMouseEnter={() => setShowVolumePopup(true)}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="p-1.5 bg-[#182346] hover:bg-[#202E5C] border border-slate-700/70 rounded-lg text-slate-300 transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-slate-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#19C39A]" />
            )}
          </button>

          {showVolumePopup && (
            <div
              className="absolute right-0 top-full mt-2 bg-[#101A3A] border border-slate-700 rounded-xl p-2.5 shadow-xl z-50 w-32 space-y-1"
              onMouseLeave={() => setShowVolumePopup(false)}
            >
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                <span>VOL</span>
                <span className="font-mono-numbers">{Math.round(currentVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={currentVolume}
                onChange={handleVolumeChange}
                className="w-full accent-[#5B3DF5] cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* AI Assistant */}
        <button
          onClick={onOpenAi}
          className="flex items-center gap-1 px-2 py-1.5 bg-gradient-to-r from-[#5B3DF5] to-indigo-600 hover:from-[#6B4FF8] hover:to-indigo-500 text-white rounded-lg text-xs font-bold shadow-md shadow-[#5B3DF5]/20 transition-all active:scale-95 whitespace-nowrap"
          title="Open Gemini AI Store Concierge"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-200" />
          <span className="hidden xl:inline">
            {appMode === 'manager' ? 'Stock AI' : 'Concierge'}
          </span>
        </button>

        {/* Cart Button */}
        <button
          onClick={onToggleCart}
          className={`relative flex items-center gap-1.5 px-3 py-1.5 bg-[#5B3DF5] hover:bg-[#6B4FF8] active:scale-95 text-white rounded-lg text-xs font-bold shadow-md shadow-[#5B3DF5]/30 transition-all whitespace-nowrap shrink-0 ${
            isCartBouncing ? 'animate-bounce-cart' : ''
          }`}
        >
          <ShoppingCart className="w-4 h-4 text-white" />
          <span className="hidden sm:inline">Cart</span>
          <span className="px-1.5 py-0.2 bg-white text-[#101A3A] rounded-full text-[11px] font-bold font-mono-numbers shadow-xs">
            {cartCount}
          </span>
        </button>
      </div>
    </header>
  );
};
