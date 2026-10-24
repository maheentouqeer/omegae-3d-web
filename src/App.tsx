/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { StoreScene } from './3d/StoreScene';
import { Product, ShelfSlot, CartItem, OrderRecord, AuditEntry, ViewMode, AppMode } from './types';
import { INITIAL_PRODUCTS, INITIAL_SHELF_SLOTS } from './data/catalog';
import { sound } from './utils/audio';
import { TopBar } from './components/TopBar';
import { ProductModal } from './components/ProductModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { ManagerDashboard } from './components/ManagerDashboard';
import { Minimap } from './components/Minimap';
import { AiAssistantModal } from './components/AiAssistantModal';
import { AccessibleListView } from './components/AccessibleListView';
import { ControlsDock } from './components/ControlsDock';

export default function App() {
  // Store Data States
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [shelfSlots, setShelfSlots] = useState<ShelfSlot[]>(INITIAL_SHELF_SLOTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  // UI Modes & Modals
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [appMode, setAppMode] = useState<AppMode>('shopper');
  const [isMuted, setIsMuted] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isManagerDashboardOpen, setIsManagerDashboardOpen] = useState(false);
  const [inspectingProduct, setInspectingProduct] = useState<{
    product: Product;
    slot: ShelfSlot;
  } | null>(null);

  // Player position tracker for Minimap
  const [playerCoords, setPlayerCoords] = useState<{ x: number; z: number; angle: number }>({
    x: 0,
    z: 14,
    angle: 0,
  });

  // Canvas ref & Three.js instance
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const storeSceneRef = useRef<StoreScene | null>(null);

  // Initialize Three.js WebGL Scene
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const scene = new StoreScene(canvasMountRef.current, {
      onProductClick: (product, slot) => {
        setInspectingProduct({ product, slot });
      },
      onPlayerMove: (x, z, angle) => {
        setPlayerCoords({ x, z, angle });
      },
    });

    storeSceneRef.current = scene;

    return () => {
      scene.dispose();
      storeSceneRef.current = null;
    };
  }, []);

  // Handlers
  const handleToggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
  };

  const handleToggleViewMode = () => {
    setViewMode((prev) => (prev === '3d' ? 'list' : '3d'));
  };

  const handleToggleAppMode = () => {
    setAppMode((prev) => {
      const next = prev === 'shopper' ? 'manager' : 'shopper';
      if (next === 'manager') {
        setIsManagerDashboardOpen(true);
      } else {
        setIsManagerDashboardOpen(false);
      }
      return next;
    });
  };

  // Add item to cart with 3D projectile flight
  const handleAddToCart = (product: Product, quantity: number, slotId: string) => {
    // Deduct stock from shelf slot
    setShelfSlots((prev) =>
      prev.map((s) => {
        if (s.id === slotId) {
          const newStock = Math.max(0, s.currentStock - quantity);
          storeSceneRef.current?.updateSlotStock(slotId, newStock);
          return { ...s, currentStock: newStock };
        }
        return s;
      })
    );

    // Update cart
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });

    // Launch 3D parabolic particle flight arc
    storeSceneRef.current?.spawnAddToCartFlight(slotId);
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveCartItem(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveCartItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleGoToCheckout = () => {
    setIsCartOpen(false);
    storeSceneRef.current?.glideToCheckout(1);
    setIsCheckoutOpen(true);
  };

  const handleCompleteOrder = (order: OrderRecord) => {
    setOrders((prev) => [order, ...prev]);
    setCart([]);
  };

  // Manager Actions: Restock
  const handleRestockSlot = (slotId: string, amount: number) => {
    setShelfSlots((prev) =>
      prev.map((s) => {
        if (s.id === slotId) {
          const newStock = Math.min(s.maxCapacity, s.currentStock + amount);
          storeSceneRef.current?.updateSlotStock(slotId, newStock);

          const prod = products.find((p) => p.id === s.productId);
          const entry: AuditEntry = {
            id: `audit-${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            action: 'restock',
            productId: s.productId,
            productName: prod?.name || 'Item',
            details: `Replenished +${amount} units (Stock now ${newStock}/${s.maxCapacity})`,
          };
          setAuditLog((logs) => [entry, ...logs]);

          return { ...s, currentStock: newStock };
        }
        return s;
      })
    );
  };

  const handleRestockAllLow = () => {
    const lowSlots = shelfSlots.filter((s) => s.currentStock <= s.reorderThreshold);
    lowSlots.forEach((slot) => {
      handleRestockSlot(slot.id, 10);
    });
  };

  const handleUpdatePrice = (productId: string, newPrice: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, price: newPrice } : p))
    );
    const prod = products.find((p) => p.id === productId);
    const entry: AuditEntry = {
      id: `audit-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      action: 'price_change',
      productId,
      productName: prod?.name || 'Item',
      details: `Price adjusted to $${newPrice.toFixed(2)}`,
    };
    setAuditLog((logs) => [entry, ...logs]);
  };

  // Camera glide triggers
  const handleFlyToAisle = (aisleNum: number) => {
    if (viewMode === 'list') setViewMode('3d');
    storeSceneRef.current?.glideToAisle(aisleNum);
  };

  const handleFlyToProduct = (productId: string) => {
    if (viewMode === 'list') setViewMode('3d');
    storeSceneRef.current?.glideToProduct(productId);
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* Top Navigation Bar */}
      <TopBar
        cartCount={totalCartCount}
        viewMode={viewMode}
        appMode={appMode}
        isMuted={isMuted}
        products={products}
        onToggleCart={() => setIsCartOpen((o) => !o)}
        onToggleSound={handleToggleSound}
        onToggleViewMode={handleToggleViewMode}
        onToggleAppMode={handleToggleAppMode}
        onOpenAi={() => setIsAiOpen(true)}
        onSelectProduct={(p) => {
          handleFlyToProduct(p.id);
          const slot = shelfSlots.find((s) => s.productId === p.id);
          if (slot) {
            setInspectingProduct({ product: p, slot });
          }
        }}
        onSelectAisle={handleFlyToAisle}
      />

      {/* 3D WebGL Canvas Viewport */}
      <div
        className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${
          viewMode === '3d' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div ref={canvasMountRef} className="w-full h-full" />

        {/* Subtle First-Person Reticle / Center Aim Dot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/70 pointer-events-none shadow-sm" />

        {/* 2D Minimap Floorplan */}
        <Minimap
          playerX={playerCoords.x}
          playerZ={playerCoords.z}
          playerYaw={playerCoords.angle}
          shelfSlots={shelfSlots}
          onTeleportAisle={handleFlyToAisle}
          onTeleportCheckout={() => storeSceneRef.current?.glideToCheckout(1)}
        />

        {/* Collapsible Bottom Controls Dock */}
        <ControlsDock
          onSelectAisle={handleFlyToAisle}
          onGoToCheckout={() => {
            storeSceneRef.current?.glideToCheckout(1);
            setIsCheckoutOpen(true);
          }}
        />
      </div>

      {/* 2D Accessible List Mode Viewport */}
      {viewMode === 'list' && (
        <div className="absolute inset-0 w-full h-full overflow-y-auto z-10">
          <AccessibleListView
            products={products}
            shelfSlots={shelfSlots}
            onAddToCart={handleAddToCart}
            onFlyToProduct={handleFlyToProduct}
            onSwitchTo3D={() => setViewMode('3d')}
          />
        </div>
      )}

      {/* Floating Product Detail Inspection Modal */}
      {inspectingProduct && (
        <ProductModal
          product={inspectingProduct.product}
          slot={inspectingProduct.slot}
          onClose={() => setInspectingProduct(null)}
          onAddToCart={handleAddToCart}
          onFlyToShelf={handleFlyToProduct}
        />
      )}

      {/* Slide-out Shopping Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        items={cart}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onGoToCheckout={handleGoToCheckout}
      />

      {/* Checkout Lane Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        items={cart}
        onClose={() => setIsCheckoutOpen(false)}
        onCompleteOrder={handleCompleteOrder}
      />

      {/* Manager Mode Inventory Console */}
      {appMode === 'manager' && isManagerDashboardOpen && (
        <ManagerDashboard
          products={products}
          shelfSlots={shelfSlots}
          auditLog={auditLog}
          onRestockSlot={handleRestockSlot}
          onRestockAllLow={handleRestockAllLow}
          onUpdatePrice={handleUpdatePrice}
          onOpenAiAnalyst={() => setIsAiOpen(true)}
          onClose={() => setIsManagerDashboardOpen(false)}
        />
      )}

      {/* Gemini AI Assistant Modal (Concierge & Analyst) */}
      <AiAssistantModal
        isOpen={isAiOpen}
        appMode={appMode}
        products={products}
        shelfSlots={shelfSlots}
        onClose={() => setIsAiOpen(false)}
        onAddToCart={handleAddToCart}
        onFlyToProduct={handleFlyToProduct}
      />
    </div>
  );
}
