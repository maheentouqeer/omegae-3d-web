import React, { useState } from 'react';
import { X, Sparkles, Send, Loader2, Plus, Eye, Check } from 'lucide-react';
import { Product, ShelfSlot, AppMode } from '../types';

interface AiAssistantModalProps {
  isOpen: boolean;
  appMode: AppMode;
  products: Product[];
  shelfSlots: ShelfSlot[];
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, slotId: string) => void;
  onFlyToProduct: (productId: string) => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  appMode,
  products,
  shelfSlots,
  onClose,
  onAddToCart,
  onFlyToProduct,
}) => {
  if (!isOpen) return null;

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const shopperPresets = [
    'Quick healthy dinner for two under $20',
    'Post-workout energy & hydration kit',
    'Flu season recovery care bundle',
    'Italian pasta & cheese date night',
  ];

  const managerPresets = [
    'Generate urgent restock replenishment list',
    'Evaluate slow-moving inventory markdown ideas',
    'Analyze shelf capacity bottlenecks across 8 aisles',
  ];

  const handleSend = async (queryText?: string) => {
    const text = queryText || inputPrompt;
    if (!text.trim() || isLoading) return;

    setIsLoading(true);
    setResponseMessage(null);
    setRecommendedProducts([]);

    try {
      if (appMode === 'shopper') {
        const res = await fetch('/api/ai/concierge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: text,
            availableProducts: products,
          }),
        });
        const data = await res.json();
        setResponseMessage(data.reply || 'Here are my recommendations for your store visit!');

        if (Array.isArray(data.recommendedProductIds)) {
          const recs = products.filter((p) => data.recommendedProductIds.includes(p.id));
          setRecommendedProducts(recs);
        }
      } else {
        // Manager Mode
        const inventorySummary = shelfSlots.map((s) => {
          const prod = products.find((p) => p.id === s.productId);
          return {
            slotId: s.id,
            productName: prod?.name,
            aisle: s.aisleNumber,
            stock: s.currentStock,
            max: s.maxCapacity,
            isLowStock: s.currentStock <= s.reorderThreshold,
          };
        });

        const res = await fetch('/api/ai/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: text,
            inventoryData: inventorySummary,
          }),
        });
        const data = await res.json();
        setResponseMessage(data.analysis || 'Analysis complete for your store floor.');

        if (Array.isArray(data.priorityRestockIds)) {
          const recs = products.filter((p) => data.priorityRestockIds.includes(p.id));
          setRecommendedProducts(recs);
        }
      }
    } catch (err: any) {
      console.error(err);
      setResponseMessage('Unable to reach the AI service right now. Please try again.');
    } finally {
      setIsLoading(false);
      setInputPrompt('');
    }
  };

  const handleAddRec = (p: Product) => {
    const slot = shelfSlots.find((s) => s.productId === p.id);
    if (slot) {
      onAddToCart(p, 1, slot.id);
      setAddedIds((prev) => new Set(prev).add(p.id));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl text-slate-100 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 px-6 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-base text-white">
                {appMode === 'manager' ? 'Omega AI Inventory Analyst' : 'Omega AI Shopping Concierge'}
              </h2>
              <p className="text-[10px] text-slate-400">
                {appMode === 'manager'
                  ? 'Powered by Gemini · Store intelligence & replenishment forecasting'
                  : 'Powered by Gemini · Recipes, diet planning, and shelf suggestions'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conversation Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Preset Prompts */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Suggested Questions
            </span>
            <div className="flex flex-wrap gap-2">
              {(appMode === 'shopper' ? shopperPresets : managerPresets).map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(preset)}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 rounded-lg text-xs text-slate-200 transition-colors text-left"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* AI Response Card */}
          {isLoading ? (
            <div className="p-8 text-center space-y-3 bg-slate-800/30 rounded-xl border border-slate-800">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto" />
              <p className="text-xs text-slate-400">Gemini is analyzing the store catalog...</p>
            </div>
          ) : responseMessage ? (
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/60 border border-slate-700/80 rounded-xl text-xs text-slate-200 leading-relaxed whitespace-pre-line shadow-inner">
                {responseMessage}
              </div>

              {/* Recommended Products Bundle */}
              {recommendedProducts.length > 0 && (
                <div className="space-y-2 pt-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Recommended Store Items
                  </h4>
                  <div className="space-y-2">
                    {recommendedProducts.map((p) => {
                      const isAdded = addedIds.has(p.id);
                      return (
                        <div
                          key={p.id}
                          className="bg-slate-800/40 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: p.baseColor }}
                            />
                            <div className="truncate">
                              <span className="text-xs font-semibold text-slate-200 block truncate">
                                {p.name}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Aisle {p.aisleNumber} · ${p.price.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => {
                                onFlyToProduct(p.id);
                                onClose();
                              }}
                              title="Fly camera to this shelf"
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-md transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              disabled={isAdded}
                              onClick={() => handleAddRec(p)}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                isAdded
                                  ? 'bg-emerald-600/30 text-emerald-300'
                                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                              }`}
                            >
                              {isAdded ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Added</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  <span>Add</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={
                appMode === 'manager'
                  ? 'Ask about restock forecasting, pricing, or sales...'
                  : 'Ask for recipes, dietary advice, or meal bundles...'
              }
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!inputPrompt.trim() || isLoading}
              className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg shadow-md transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
