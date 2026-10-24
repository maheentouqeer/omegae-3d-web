import React from 'react';
import { X, Trash2, ArrowRight, ShoppingBag, Plus, Minus } from 'lucide-react';
import { CartItem } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  items: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onGoToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  items,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onGoToCheckout,
}) => {
  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => {
    const price = item.product.isSale && item.product.salePrice ? item.product.salePrice : item.product.price;
    return sum + price * item.quantity;
  }, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 text-slate-100 flex flex-col h-full shadow-2xl">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-blue-400" />
            <h2 className="font-heading font-bold text-lg text-white">Your Shopping Cart</h2>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono-numbers">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="font-heading font-semibold text-slate-300 text-base">Your cart is empty</h3>
              <p className="text-xs text-slate-500 max-w-xs">
                Walk down any of the 8 aisles, click on a shelf product, and add fresh items to your cart!
              </p>
            </div>
          ) : (
            items.map((item) => {
              const currentPrice =
                item.product.isSale && item.product.salePrice
                  ? item.product.salePrice
                  : item.product.price;
              return (
                <div
                  key={item.product.id}
                  className="bg-slate-800/60 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3.5 hover:border-slate-700 transition-colors"
                >
                  {/* Color Thumbnail Pill */}
                  <div
                    className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-bold text-white shadow-inner"
                    style={{ backgroundColor: item.product.baseColor }}
                  >
                    A{item.product.aisleNumber}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-slate-200 truncate">
                      {item.product.name}
                    </h4>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <span className="font-mono-numbers">${currentPrice.toFixed(2)}</span>
                      <span>·</span>
                      <span>{item.product.unit}</span>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5">
                    <button
                      onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                      className="p-1 text-slate-400 hover:text-white transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold font-mono-numbers text-slate-200">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                      className="p-1 text-slate-400 hover:text-white transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Total item price & delete */}
                  <div className="text-right flex items-center gap-2">
                    <span className="text-xs font-bold font-mono-numbers text-white">
                      ${(currentPrice * item.quantity).toFixed(2)}
                    </span>
                    <button
                      onClick={() => onRemoveItem(item.product.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Totals and Checkout Button */}
        {items.length > 0 && (
          <div className="p-6 border-t border-slate-800 bg-slate-950/60 space-y-4">
            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono-numbers text-slate-200">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Sales Tax (8%)</span>
                <span className="font-mono-numbers text-slate-200">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                <span>Estimated Total</span>
                <span className="font-mono-numbers text-emerald-400 font-extrabold text-base">
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  onGoToCheckout();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all tracking-wide"
              >
                <span>Proceed to Checkout Counter</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onClearCart}
                className="w-full text-center text-[11px] text-slate-500 hover:text-rose-400 transition-colors py-1"
              >
                Clear all items from cart
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
