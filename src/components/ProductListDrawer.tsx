import React, { useState, useEffect } from 'react';
import { X, Search, ShoppingBag, Eye, Plus, Check } from 'lucide-react';
import { Product, ShelfSlot, ProductCategory } from '../types';
import { AISLE_CONFIG } from '../data/catalog';

interface ProductListDrawerProps {
  isOpen: boolean;
  products: Product[];
  shelfSlots: ShelfSlot[];
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, slotId: string) => void;
  onFlyToProduct: (productId: string) => void;
}

export const ProductListDrawer: React.FC<ProductListDrawerProps> = ({
  isOpen,
  products,
  shelfSlots,
  onClose,
  onAddToCart,
  onFlyToProduct,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Close on Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All (104)' },
    { id: 'food', label: '01 Fresh' },
    { id: 'drinks', label: '02 Drinks' },
    { id: 'beauty', label: '03 Beauty' },
    { id: 'pharmacy', label: '04 Pharmacy' },
    { id: 'apparel', label: '05 Apparel' },
    { id: 'electronics', label: '06 Tech' },
    { id: 'home', label: '07 Home' },
    { id: 'kids', label: '08 Kids' },
  ];

  const filtered = products.filter((p) => {
    const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brandName.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleAdd = (p: Product) => {
    const slot = shelfSlots.find((s) => s.productId === p.id);
    if (!slot || slot.currentStock === 0) return;
    onAddToCart(p, 1, slot.id);
    setAddedIds((prev) => new Set(prev).add(p.id));
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(p.id);
        return next;
      });
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-fade-in">
      <div
        className="w-full max-w-lg bg-[#101A3A] border-l border-slate-800 text-[#F7F6F2] flex flex-col h-full shadow-2xl transition-transform duration-300 ease-out"
        role="dialog"
        aria-label="Product Catalog Drawer"
      >
        {/* Drawer Header */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#5B3DF5] flex items-center justify-center font-bold text-white text-sm">
              Ω
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-bold text-base text-white">Store Product Directory</h2>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#19C39A]/15 border border-[#19C39A]/30 text-[10px] font-bold text-[#19C39A]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#19C39A] animate-pulse" />
                  <span>Shelves live</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                104 verified items · Click any row to glide camera to its shelf
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 px-6 border-b border-slate-800/80 space-y-3 bg-[#0D1530]">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by name, brand, or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#182346] border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#5B3DF5]"
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-[#5B3DF5] text-white'
                    : 'bg-[#182346] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product Rows List */}
        <div className="flex-1 overflow-y-auto p-4 px-6 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs">
              No matching products found. Try another search query.
            </div>
          ) : (
            filtered.map((product) => {
              const slot = shelfSlots.find((s) => s.productId === product.id);
              const isLowStock = slot && slot.currentStock <= slot.reorderThreshold;
              const isOutOfStock = slot && slot.currentStock === 0;
              const price = product.isSale && product.salePrice ? product.salePrice : product.price;
              const isAdded = addedIds.has(product.id);

              return (
                <div
                  key={product.id}
                  className="bg-[#182346]/80 hover:bg-[#1C2852] border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 transition-colors group cursor-pointer"
                  onClick={() => {
                    onFlyToProduct(product.id);
                    onClose();
                  }}
                >
                  {/* Thumbnail & Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-bold text-white shadow-inner"
                      style={{ backgroundColor: product.baseColor }}
                    >
                      A0{product.aisleNumber}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">
                          {product.brandName}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono-numbers">· {product.sku}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-100 group-hover:text-white truncate">
                        {product.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                        <span className="font-mono-numbers font-bold text-white">
                          ${price.toFixed(2)}
                        </span>
                        {product.isSale && (
                          <span className="text-[10px] text-[#FF5A4D] font-bold line-through">
                            ${product.price.toFixed(2)}
                          </span>
                        )}
                        <span className="text-slate-500 text-[10px]">/ {product.unit}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stock State & Quick Add CTA */}
                  <div
                    className="flex items-center gap-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>
                      {isOutOfStock ? (
                        <span className="text-[10px] font-bold text-[#FF5A4D] bg-[#FF5A4D]/10 px-2 py-0.5 rounded border border-[#FF5A4D]/30">
                          Empty
                        </span>
                      ) : isLowStock ? (
                        <span className="text-[10px] font-bold text-[#FF5A4D] bg-[#FF5A4D]/10 px-2 py-0.5 rounded border border-[#FF5A4D]/30">
                          {slot?.currentStock} left
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#19C39A] bg-[#19C39A]/10 px-2 py-0.5 rounded border border-[#19C39A]/30">
                          {slot?.currentStock} in stock
                        </span>
                      )}
                    </div>

                    <button
                      disabled={isOutOfStock}
                      onClick={() => handleAdd(product)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isAdded
                          ? 'bg-[#19C39A] text-[#101A3A]'
                          : 'bg-[#5B3DF5] hover:bg-[#6B4FF8] active:scale-95 text-white shadow-sm'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
