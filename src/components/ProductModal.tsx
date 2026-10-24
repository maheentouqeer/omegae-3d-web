import React, { useState } from 'react';
import { X, Plus, Minus, ShoppingBag, Eye, ShieldCheck, Tag } from 'lucide-react';
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
  const isLowStock = slot.currentStock <= slot.reorderThreshold;
  const isOutOfStock = slot.currentStock === 0;

  const currentPrice = product.isSale && product.salePrice ? product.salePrice : product.price;

  const handleAdd = () => {
    if (isOutOfStock) return;
    onAddToCart(product, quantity, slot.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Color Banner */}
        <div
          className="relative h-28 px-6 pt-5 pb-4 flex flex-col justify-between"
          style={{
            background: `linear-gradient(135deg, ${product.baseColor} 0%, #0f172a 100%)`,
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-900/60 hover:bg-slate-900 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-white/90 bg-black/30 px-2 py-0.5 rounded">
              Aisle {product.aisleNumber} · {product.category}
            </span>
            <span className="text-[11px] font-mono-numbers text-white/80">
              {product.sku}
            </span>
          </div>

          <div>
            <h2 className="font-heading font-bold text-xl text-white tracking-tight drop-shadow-sm truncate">
              {product.name}
            </h2>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Price & Stock Row */}
          <div className="flex items-baseline justify-between border-b border-slate-800 pb-3">
            <div className="flex items-baseline gap-2">
              <span className="font-heading font-extrabold text-2xl text-white font-mono-numbers">
                ${currentPrice.toFixed(2)}
              </span>
              {product.isSale && (
                <span className="text-sm text-slate-400 line-through font-mono-numbers">
                  ${product.price.toFixed(2)}
                </span>
              )}
              <span className="text-xs text-slate-400 font-medium">/ {product.unit}</span>
            </div>

            {/* Stock State */}
            <div>
              {isOutOfStock ? (
                <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-md">
                  Out of Stock
                </span>
              ) : isLowStock ? (
                <span className="text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-md">
                  Only {slot.currentStock} left!
                </span>
              ) : (
                <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-md">
                  In Stock ({slot.currentStock} units)
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-300 leading-relaxed">
            {product.description}
          </p>

          {/* Specifications Tag */}
          {product.caloriesOrSpec && (
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 p-2.5 rounded-lg border border-slate-800">
              <Tag className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>{product.caloriesOrSpec}</span>
            </div>
          )}

          {/* Quantity Stepper & Add to Cart */}
          <div className="pt-2 flex items-center gap-3">
            {/* Stepper */}
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-1">
              <button
                disabled={quantity <= 1 || isOutOfStock}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-8 text-center text-xs font-bold font-mono-numbers text-slate-100">
                {quantity}
              </span>
              <button
                disabled={quantity >= slot.currentStock || isOutOfStock}
                onClick={() => setQuantity((q) => Math.min(slot.currentStock, q + 1))}
                className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Add to Cart CTA */}
            <button
              disabled={isOutOfStock}
              onClick={handleAdd}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-semibold rounded-lg shadow-md shadow-blue-600/30 transition-all"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Add to Cart · ${(currentPrice * quantity).toFixed(2)}</span>
            </button>
          </div>

          {/* Fly to Shelf Button */}
          <div className="pt-1 text-center">
            <button
              onClick={() => {
                onFlyToShelf(product.id);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-blue-400 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Glide camera directly to this shelf</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
