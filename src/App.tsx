/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StoreScene } from './3d/StoreScene';
import { Product, ShelfSlot, CartItem, OrderRecord, AuditEntry, AppMode, QualityLevel, CartToast } from './types';
import { dataLayer } from './data/dataLayer';
import { sound } from './utils/audio';

import { TopBar } from './components/TopBar';
import { ProductModal } from './components/ProductModal';
import { ProductListDrawer } from './components/ProductListDrawer';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { PinModal } from './components/PinModal';
import { ManagerDashboard } from './components/ManagerDashboard';
import { Minimap } from './components/Minimap';
import { ControlsDock } from './components/ControlsDock';
import { CartToastNotification } from './components/CartToast';
import { LoadingScreen } from './components/LoadingScreen';
import { HelpOverlay } from './components/HelpOverlay';
import { VirtualJoystick } from './components/VirtualJoystick';
import { AiAssistantModal } from './components/AiAssistantModal';
import { CheckoutSequenceOverlay } from './components/CheckoutSequenceOverlay';

export default function App() {
  // Store Data backed by DataLayer
  const [products, setProducts] = useState<Product[]>(() => dataLayer.getProducts());
  const [shelfSlots, setShelfSlots] = useState<ShelfSlot[]>(() => dataLayer.getShelfSlots());
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderHistory, setOrderHistory] = useState<OrderRecord[]>(() => dataLayer.getOrders());
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(() => dataLayer.getAuditLog());

  // Navigation & UI States
  const [appMode, setAppMode] = useState<AppMode>('shopper');
  const [quality, setQuality] = useState<QualityLevel>('high');
  const [isMuted, setIsMuted] = useState(true); // Default muted as specified
  const [effectsEnabled, setEffectsEnabled] = useState(true);
  const [isSceneLoading, setIsSceneLoading] = useState(true);
  const [showHelpOverlay, setShowHelpOverlay] = useState(true);
  const [showPinModal, setShowPinModal] = useState(false);
  const [isListDrawerOpen, setIsListDrawerOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [initialHistoryView, setInitialHistoryView] = useState(false);
  const [isManagerDashboardOpen, setIsManagerDashboardOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isCartBouncing, setIsCartBouncing] = useState(false);
  const [cartToast, setCartToast] = useState<CartToast | null>(null);

  // 3D Checkout Conveyor Animation State
  const [checkoutSequenceState, setCheckoutSequenceState] = useState<{
    active: boolean;
    stepMessage: string;
    scannedIndex: number;
    totalItems: number;
    currentItem?: CartItem;
  }>({
    active: false,
    stepMessage: '',
    scannedIndex: 0,
    totalItems: 0,
  });
  const cancelCheckoutSequenceRef = useRef<(() => void) | null>(null);

  // Hover price tooltip in 3D
  const [hoveredProductInfo, setHoveredProductInfo] = useState<{
    product: Product;
    slot: ShelfSlot;
    pos: { x: number; y: number };
  } | null>(null);

  // Inspection modal
  const [inspectingProduct, setInspectingProduct] = useState<{
    product: Product;
    slot: ShelfSlot;
  } | null>(null);

  // Player coordinates for minimap
  const [playerCoords, setPlayerCoords] = useState<{ x: number; z: number; angle: number }>({
    x: 0,
    z: 13.5,
    angle: 0,
  });

  // 6-second inactivity idle state (fades controls dock & minimap)
  const [isIdle, setIsIdle] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Three.js Canvas container ref & StoreScene instance
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const storeSceneRef = useRef<StoreScene | null>(null);

  // Synchronize dataLayer updates
  useEffect(() => {
    const unsubscribe = dataLayer.subscribe(() => {
      setProducts(dataLayer.getProducts());
      setShelfSlots(dataLayer.getShelfSlots());
      setOrderHistory(dataLayer.getOrders());
      setAuditLog(dataLayer.getAuditLog());
    });
    return unsubscribe;
  }, []);

  // Initialize StoreScene
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const scene = new StoreScene(canvasMountRef.current, {
      onProductClick: (product, slot) => {
        setInspectingProduct({ product, slot });
      },
      onProductHover: (product, slot, screenPos) => {
        if (product && slot && screenPos) {
          setHoveredProductInfo({ product, slot, pos: screenPos });
        } else {
          setHoveredProductInfo(null);
        }
      },
      onPlayerMove: (x, z, angle) => {
        setPlayerCoords({ x, z, angle });
      },
      onSceneReady: () => {
        setIsSceneLoading(false);
      },
    });

    storeSceneRef.current = scene;

    return () => {
      scene.dispose();
      storeSceneRef.current = null;
    };
  }, []);

  // 6-Second Inactivity Listener (Auto-fades dock & minimap)
  const resetIdleTimer = useCallback(() => {
    setIsIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, 6000); // 6 seconds as specified
  }, []);

  useEffect(() => {
    resetIdleTimer();
    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);
    window.addEventListener('touchstart', resetIdleTimer);

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      window.removeEventListener('touchstart', resetIdleTimer);
    };
  }, [resetIdleTimer]);

  // Audio Mute Toggle
  const handleToggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
  };

  // Quality Toggle
  const handleSetQuality = (q: QualityLevel) => {
    setQuality(q);
    storeSceneRef.current?.setQuality(q);
  };

  // Visual Effects Toggle
  const handleToggleEffects = () => {
    const next = !effectsEnabled;
    setEffectsEnabled(next);
    storeSceneRef.current?.toggleEffects(next);
  };

  // Manager Mode Authorization (PIN 1234 from Bolt/Base44)
  const handleRequestManagerMode = () => {
    if (appMode === 'manager') {
      setAppMode('shopper');
      setIsManagerDashboardOpen(false);
      storeSceneRef.current?.setManagerMode(false);
    } else {
      setShowPinModal(true);
    }
  };

  const handlePinSuccess = () => {
    setShowPinModal(false);
    setAppMode('manager');
    setIsManagerDashboardOpen(true);
    storeSceneRef.current?.setManagerMode(true);
  };

  // Add to Cart (with 600ms flight arc, bouncing count, and Undo Toast)
  const handleAddToCart = (product: Product, quantity: number, slotId: string) => {
    // 1. Update shelf stock in dataLayer & 3D InstancedMesh
    const currentSlot = dataLayer.getShelfSlotById(slotId);
    if (currentSlot) {
      const newStock = Math.max(0, currentSlot.currentStock - quantity);
      dataLayer.updateSlotStock(slotId, newStock);
      storeSceneRef.current?.updateSlotStock(slotId, newStock);
    }

    // 2. Add to cart state
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

    // 3. Trigger 600ms 3D flight projectile
    storeSceneRef.current?.spawnAddToCartFlight(slotId);

    // 4. Cart icon bounce
    setIsCartBouncing(true);
    setTimeout(() => setIsCartBouncing(false), 500);

    // 5. Toast with Undo
    setCartToast({
      id: `toast-${Date.now()}`,
      message: `Added ${quantity}x ${product.name} to cart`,
      productId: product.id,
      quantity,
      slotId,
    });
  };

  // Undo Cart Action
  const handleUndoCart = (toast: CartToast) => {
    const slot = dataLayer.getShelfSlotById(toast.slotId);
    if (slot) {
      const restored = Math.min(slot.maxCapacity, slot.currentStock + toast.quantity);
      dataLayer.updateSlotStock(toast.slotId, restored);
      storeSceneRef.current?.updateSlotStock(toast.slotId, restored);
    }

    setCart((prev) => {
      const item = prev.find((it) => it.product.id === toast.productId);
      if (!item) return prev;
      if (item.quantity <= toast.quantity) {
        return prev.filter((it) => it.product.id !== toast.productId);
      }
      return prev.map((it) =>
        it.product.id === toast.productId
          ? { ...it, quantity: item.quantity - toast.quantity }
          : it
      );
    });

    setCartToast(null);
  };

  // Cart Drawer operations
  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity } : item))
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
    setIsListDrawerOpen(false);
    setInspectingProduct(null);
    setInitialHistoryView(false);

    if (cart.length === 0) {
      setCartToast({
        id: 'empty_cart_' + Date.now(),
        message: 'Your cart is empty! Browse the aisles and pick some products first.',
        timestamp: Date.now(),
      });
      return;
    }

    // Calculate unrolled product total count (capped at 8 for snappy animation)
    const unrolledTotal = cart.reduce((acc, item) => acc + Math.min(item.quantity, 3), 0);
    const cappedTotal = Math.min(unrolledTotal, 8);

    setCheckoutSequenceState({
      active: true,
      stepMessage: 'Heading to Checkout Lane 1 counter...',
      scannedIndex: 0,
      totalItems: cappedTotal,
      currentItem: undefined,
    });

    const cancelFn = storeSceneRef.current?.startCheckoutSequence(
      cart,
      (stepMsg, scannedCount, currentItem) => {
        setCheckoutSequenceState((prev) => ({
          ...prev,
          stepMessage: stepMsg,
          scannedIndex: scannedCount,
          currentItem,
        }));
      },
      () => {
        setCheckoutSequenceState({
          active: false,
          stepMessage: '',
          scannedIndex: 0,
          totalItems: 0,
        });
        setIsCheckoutOpen(true);
      }
    );

    cancelCheckoutSequenceRef.current = cancelFn || null;
  };

  const handleSkipCheckoutSequence = () => {
    if (cancelCheckoutSequenceRef.current) {
      cancelCheckoutSequenceRef.current();
      cancelCheckoutSequenceRef.current = null;
    }
  };

  const handleCompleteOrder = (order: OrderRecord) => {
    dataLayer.recordOrder(order);
    setCart([]);
  };

  // Manager Mode stock & price updates
  const handleRestockSlot = (slotId: string, amount: number) => {
    dataLayer.restockSlot(slotId, amount);
    const updatedSlot = dataLayer.getShelfSlotById(slotId);
    if (updatedSlot) {
      storeSceneRef.current?.updateSlotStock(slotId, updatedSlot.currentStock);
    }
  };

  const handleRestockAllLow = () => {
    dataLayer.restockAllLow();
    dataLayer.getShelfSlots().forEach((slot) => {
      storeSceneRef.current?.updateSlotStock(slot.id, slot.currentStock);
    });
  };

  const handleUpdatePrice = (productId: string, newPrice: number) => {
    dataLayer.updateProductPrice(productId, newPrice);
  };

  const handleUpdateQuantityDirect = (slotId: string, newQty: number) => {
    dataLayer.updateSlotStock(slotId, newQty);
    storeSceneRef.current?.updateSlotStock(slotId, newQty);
  };

  // Camera Glide Navigation
  const handleFlyToAisle = (aisleNum: number) => {
    storeSceneRef.current?.glideToAisle(aisleNum);
  };

  const handleFlyToProduct = (productId: string) => {
    storeSceneRef.current?.glideToProduct(productId);
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartAmount = cart.reduce((sum, item) => {
    const price = item.product.isSale && item.product.salePrice ? item.product.salePrice : item.product.price;
    return sum + price * item.quantity;
  }, 0) * 1.08;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#101A3A] font-sans select-none">
      {/* Loading Screen (from Bolt) */}
      <LoadingScreen isLoading={isSceneLoading} />

      {/* First-Visit Help Guide (from Bolt) */}
      <HelpOverlay
        isOpen={showHelpOverlay && !isSceneLoading}
        onDismiss={() => setShowHelpOverlay(false)}
      />

      {/* Slim Top Bar (Merged groups, Zen Mode, Effects, PWA install, Shelves live) */}
      <TopBar
        cartCount={totalCartCount}
        isCartBouncing={isCartBouncing}
        appMode={appMode}
        isMuted={isMuted}
        effectsEnabled={effectsEnabled}
        isIdle={isIdle}
        products={products}
        onToggleCart={() => setIsCartOpen((o) => !o)}
        onToggleSound={handleToggleSound}
        onToggleEffects={handleToggleEffects}
        onOpenListDrawer={() => setIsListDrawerOpen(true)}
        onOpenOrderHistory={() => {
          setInitialHistoryView(true);
          setIsCheckoutOpen(true);
        }}
        onRequestManagerMode={handleRequestManagerMode}
        onSelectProduct={(p) => {
          handleFlyToProduct(p.id);
          const slot = shelfSlots.find((s) => s.productId === p.id);
          if (slot) setInspectingProduct({ product: p, slot });
        }}
        onSelectAisle={handleFlyToAisle}
        onOpenAi={() => setIsAiOpen(true)}
      />

      {/* 3D WebGL Canvas Viewport */}
      <div className="absolute inset-0 w-full h-full">
        <div ref={canvasMountRef} className="w-full h-full" />

        {/* First-Person Reticle */}
        {!checkoutSequenceState.active && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/70 pointer-events-none shadow-sm" />
        )}

        {/* Hovered Product Tooltip (Price & Name) */}
        {!checkoutSequenceState.active && hoveredProductInfo && (
          <div
            className="fixed pointer-events-none z-30 -translate-x-1/2 -translate-y-12 bg-[#101A3A]/90 border border-slate-700 px-3 py-1.5 rounded-xl shadow-xl text-white text-xs flex items-center gap-2 animate-fade-in"
            style={{
              left: hoveredProductInfo.pos.x,
              top: hoveredProductInfo.pos.y,
            }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: hoveredProductInfo.product.baseColor }}
            />
            <span className="font-bold">{hoveredProductInfo.product.name}</span>
            <span className="font-mono-numbers text-[#19C39A] font-extrabold">
              ${(hoveredProductInfo.product.isSale && hoveredProductInfo.product.salePrice
                ? hoveredProductInfo.product.salePrice
                : hoveredProductInfo.product.price
              ).toFixed(2)}
            </span>
          </div>
        )}

        {/* Collapsible Minimap with 6s Idle Fade & Mobile Icon Mode */}
        {!checkoutSequenceState.active && (
          <Minimap
            playerX={playerCoords.x}
            playerZ={playerCoords.z}
            playerYaw={playerCoords.angle}
            shelfSlots={shelfSlots}
            isIdle={isIdle}
            onTeleportAisle={handleFlyToAisle}
            onTeleportCheckout={handleGoToCheckout}
          />
        )}

        {/* Collapsible Controls Dock (default collapsed into a small chip) */}
        {!checkoutSequenceState.active && (
          <ControlsDock
            isIdle={isIdle}
            quality={quality}
            onSetQuality={handleSetQuality}
            onSelectAisle={handleFlyToAisle}
            onGoToCheckout={handleGoToCheckout}
          />
        )}

        {/* Mobile Virtual Joystick */}
        {!checkoutSequenceState.active && (
          <VirtualJoystick
            onMove={(x, y) => {
              storeSceneRef.current?.setJoystickInput(x, y);
            }}
          />
        )}

        {/* 3D Checkout Conveyor & Cashier Animation HUD */}
        <CheckoutSequenceOverlay
          isActive={checkoutSequenceState.active}
          stepMessage={checkoutSequenceState.stepMessage}
          scannedIndex={checkoutSequenceState.scannedIndex}
          totalItems={checkoutSequenceState.totalItems}
          currentItem={checkoutSequenceState.currentItem}
          totalAmount={totalCartAmount}
          onSkip={handleSkipCheckoutSequence}
        />
      </div>

      {/* Product Detail Modal */}
      {inspectingProduct && (
        <ProductModal
          product={inspectingProduct.product}
          slot={inspectingProduct.slot}
          onClose={() => setInspectingProduct(null)}
          onAddToCart={handleAddToCart}
          onFlyToShelf={handleFlyToProduct}
        />
      )}

      {/* Right-Side Product List Drawer (from Replit) */}
      <ProductListDrawer
        isOpen={isListDrawerOpen}
        products={products}
        shelfSlots={shelfSlots}
        onClose={() => setIsListDrawerOpen(false)}
        onAddToCart={handleAddToCart}
        onFlyToProduct={handleFlyToProduct}
      />

      {/* Shopping Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        items={cart}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onGoToCheckout={handleGoToCheckout}
      />

      {/* Simulated Checkout & Order History Modal (from Base44) */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        items={cart}
        orderHistory={orderHistory}
        initialViewHistory={initialHistoryView}
        onClose={() => setIsCheckoutOpen(false)}
        onCompleteOrder={handleCompleteOrder}
      />

      {/* Manager PIN Modal (1234 from Bolt) */}
      <PinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={handlePinSuccess}
      />

      {/* Manager Inventory Operations Dashboard */}
      {appMode === 'manager' && isManagerDashboardOpen && (
        <ManagerDashboard
          products={products}
          shelfSlots={shelfSlots}
          auditLog={auditLog}
          onRestockSlot={handleRestockSlot}
          onRestockAllLow={handleRestockAllLow}
          onUpdatePrice={handleUpdatePrice}
          onUpdateQuantity={handleUpdateQuantityDirect}
          onOpenAiAnalyst={() => setIsAiOpen(true)}
          onClose={() => setIsManagerDashboardOpen(false)}
        />
      )}

      {/* Gemini AI Assistant Drawer */}
      <AiAssistantModal
        isOpen={isAiOpen}
        appMode={appMode}
        products={products}
        shelfSlots={shelfSlots}
        onClose={() => setIsAiOpen(false)}
        onAddToCart={handleAddToCart}
        onFlyToProduct={handleFlyToProduct}
      />

      {/* Cart Toast Notification with Undo */}
      <CartToastNotification
        toast={cartToast}
        onUndo={handleUndoCart}
        onDismiss={() => setCartToast(null)}
      />
    </div>
  );
}
