import React, { useState } from 'react';
import { Search, ShoppingBag, Eye, ArrowUpDown, Box, Check } from 'lucide-react';
import { Product, ShelfSlot, ProductCategory } from '../types';

interface AccessibleListViewProps {
  products: Product[];
  shelfSlots: ShelfSlot[];
  onAddToCart: (product: Product, quantity: number, slotId: string) => void;
  onFlyToProduct: (productId: string) => void;
  onSwitchTo3D: () => void;
}

export const AccessibleListView: React.FC<AccessibleListViewProps> = ({
  products,
  shelfSlots,
  onAddToCart,
  onFlyToProduct,
  onSwitchTo3D,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc'>('name');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const categories = [
    { id: 'all', label: 'All Aisles (64)' },
    { id: 'food', label: 'Food & Bakery' },
    { id: 'drinks', label: 'Cold Drinks' },
    { id: 'beauty', label: 'Beauty & Skincare' },
    { id: 'pharmacy', label: 'Pharmacy & Wellness' },
    { id: 'apparel', label: 'Apparel & Basics' },
    { id: 'electronics', label: 'Tech & Electronics' },
    { id: 'home', label: 'Home & Kitchen' },
    { id: 'kids', label: 'Kids & Toys' },
  ];

  const filtered = products
    .filter((p) => {
      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchesSearch =
        p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        p.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchFilter.toLowerCase());
      return matchesCat && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      return a.name.localeCompare(b.name);
    });

  const handleAdd = (p: Product) => {
    const slot = shelfSlots.find((s) => s.productId === p.id);
    if (slot) {
      onAddToCart(p, 1, slot.id);
      setAddedIds((prev) => new Set(prev).add(p.id));
      setTimeout(() => {
        setAddedIds((prev) => {
          const next = new Set(prev);
          next.delete(p.id);
          return next;
        });
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-20 pb-16 px-4 md:px-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="font-heading font-extrabold text-2xl md:text-3xl text-white">
            Omega Store Catalog
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete inventory list of 64 products across 8 aisles. Accessible, responsive, and direct checkout ready.
          </p>
        </div>

        <button
          onClick={onSwitchTo3D}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all self-start md:self-auto"
        >
          <Box className="w-4 h-4" />
          <span>Switch to 3D Walk-in Mode</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="py-6 space-y-4">
        {/* Category Filter Pills (Functional Buttons) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search & Sort Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search products by name, ingredient, or SKU..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-400">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="name">Name (A-Z)</option>
              <option value="price-asc">Price (Low to High)</option>
              <option value="price-desc">Price (High to Low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filtered.map((product) => {
          const slot = shelfSlots.find((s) => s.productId === product.id);
          const isLowStock = slot && slot.currentStock <= slot.reorderThreshold;
          const currentPrice =
            product.isSale && product.salePrice ? product.salePrice : product.price;
          const isAdded = addedIds.has(product.id);

          return (
            <div
              key={product.id}
              className="bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between transition-all group"
            >
              <div className="space-y-3">
                {/* Header Badge */}
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: product.baseColor }}
                    />
                    <span className="font-medium text-slate-300 capitalize">
                      Aisle {product.aisleNumber} · {product.category}
                    </span>
                  </div>
                  <span className="font-mono-numbers text-[10px]">{product.sku}</span>
                </div>

                {/* Title */}
                <h3 className="font-heading font-bold text-sm text-white group-hover:text-blue-300 transition-colors line-clamp-1">
                  {product.name}
                </h3>

                {/* Description */}
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {product.description}
                </p>

                {/* Spec */}
                {product.caloriesOrSpec && (
                  <span className="inline-block text-[10px] text-slate-400 bg-slate-850 px-2 py-0.5 rounded border border-slate-800">
                    {product.caloriesOrSpec}
                  </span>
                )}
              </div>

              {/* Price, Stock and Action */}
              <div className="pt-4 mt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-heading font-extrabold text-base text-white font-mono-numbers">
                      ${currentPrice.toFixed(2)}
                    </span>
                    {product.isSale && (
                      <span className="text-[11px] text-slate-500 line-through font-mono-numbers">
                        ${product.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    {slot ? `${slot.currentStock} in stock` : 'Available'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      onFlyToProduct(product.id);
                      onSwitchTo3D();
                    }}
                    title="View this product in 3D walkthrough"
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  <button
                    disabled={slot?.currentStock === 0}
                    onClick={() => handleAdd(product)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isAdded
                        ? 'bg-emerald-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Added</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
