import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, ShoppingBag, Eye, Star, Tag, AlertCircle } from 'lucide-react';
import { Product, ShelfSlot } from '../types';

interface ProductModalProps {
  product: Product;
  slot: ShelfSlot;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, slotId: string) => void;
  onFlyToShelf: (productId: string) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  slot,
  onClose,
  onAddToCart,
  onFlyToShelf,
}) => {
  const [quantity, setQuantity] = useState(1);

  // Esc closes as specified
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isLowStock = slot.currentStock <= slot.reorderThreshold;
  const isOutOfStock = slot.currentStock === 0;
  const currentPrice = product.isSale && product.salePrice ? product.salePrice : product.price;

  const handleAdd = () => {
    if (isOutOfStock) return;
    onAddToCart(product, quantity, slot.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fade-in select-none">
      <div
        className="relative w-full max-w-lg bg-[#101A3A] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-[#F7F6F2] transition-all"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-title"
      >
        {/* Large Product Render Banner */}
        <div
          className="relative h-44 px-6 pt-5 pb-4 flex flex-col justify-between overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${product.baseColor} 0%, #101A3A 100%)`,
          }}
        >
          {/* Subtle geometric packaging silhouette in background */}
          <div className="absolute right-4 bottom-2 opacity-20 pointer-events-none text-white font-heading text-8xl font-black">
            Ω
          </div>

          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest uppercase text-white bg-black/40 px-2 py-0.5 rounded">
                Aisle 0{product.aisleNumber} · {product.category.toUpperCase()}
              </span>
              <span className="text-[10px] font-mono-numbers text-white/80">
                {product.sku}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
              aria-label="Close product view (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-white/80 block">
              {product.brandName}
            </span>
            <h2 id="product-title" className="font-heading font-extrabold text-2xl text-white tracking-tight drop-shadow-sm truncate">
              {product.name}
            </h2>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Price & Stock Row */}
          <div className="flex items-baseline justify-between border-b border-slate-800 pb-3">
            <div className="flex items-baseline gap-2.5">
              <span className="font-heading font-extrabold text-3xl text-white font-mono-numbers">
                ${currentPrice.toFixed(2)}
              </span>
              {product.isSale && (
                <span className="text-sm text-[#FF5A4D] line-through font-mono-numbers font-bold">
                  ${product.price.toFixed(2)}
                </span>
              )}
              <span className="text-xs text-slate-400 font-medium">/ {product.unit}</span>
            </div>

            {/* Stock status (Coral #FF5A4D for low stock only!) */}
            <div>
              {isOutOfStock ? (
                <span className="text-xs font-bold text-[#FF5A4D] bg-[#FF5A4D]/15 border border-[#FF5A4D]/40 px-2.5 py-1 rounded-md flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Out of Stock</span>
                </span>
              ) : isLowStock ? (
                <span className="text-xs font-bold text-[#FF5A4D] bg-[#FF5A4D]/15 border border-[#FF5A4D]/40 px-2.5 py-1 rounded-md flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Only {slot.currentStock} left on shelf</span>
                </span>
              ) : (
                <span className="text-xs font-bold text-[#19C39A] bg-[#19C39A]/15 border border-[#19C39A]/40 px-2.5 py-1 rounded-md">
                  In Stock ({slot.currentStock} available)
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-300 leading-relaxed">
            {product.description}
          </p>

          {/* Specs / Details */}
          {product.caloriesOrSpec && (
            <div className="flex items-center gap-2 text-xs text-slate-300 bg-[#182346] p-2.5 rounded-lg border border-slate-800">
              <Tag className="w-3.5 h-3.5 text-[#5B3DF5] shrink-0" />
              <span>{product.caloriesOrSpec}</span>
            </div>
          )}

          {/* Quantity Stepper & Add to Cart */}
          <div className="pt-2 flex items-center gap-3">
            {/* Stepper */}
            <div className="flex items-center bg-[#182346] border border-slate-700 rounded-lg p-1">
              <button
                disabled={quantity <= 1 || isOutOfStock}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center text-xs font-bold font-mono-numbers text-white">
                {quantity}
              </span>
              <button
                disabled={quantity >= slot.currentStock || isOutOfStock}
                onClick={() => setQuantity((q) => Math.min(slot.currentStock, q + 1))}
                className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Add to Cart CTA */}
            <button
              disabled={isOutOfStock}
              onClick={handleAdd}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#5B3DF5] hover:bg-[#6B4FF8] active:scale-98 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold rounded-xl shadow-lg shadow-[#5B3DF5]/30 transition-all tracking-wide"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Add to Cart · ${(currentPrice * quantity).toFixed(2)}</span>
            </button>
          </div>

          {/* Fly to Shelf shortcut */}
          <div className="pt-1 text-center">
            <button
              onClick={() => {
                onFlyToShelf(product.id);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-[#5B3DF5] transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Fly camera directly to this shelf</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
