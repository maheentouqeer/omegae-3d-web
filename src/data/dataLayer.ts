import { Product, ShelfSlot, OrderRecord, AuditEntry } from '../types';
import { INITIAL_PRODUCTS, INITIAL_SHELF_SLOTS } from './catalog';

const STORAGE_KEYS = {
  PRODUCTS: 'omega_products_v3',
  SLOTS: 'omega_shelf_slots_v3',
  ORDERS: 'omega_order_history_v3',
  AUDIT: 'omega_audit_log_v3',
};

class StoreDataLayer {
  private products: Product[];
  private shelfSlots: ShelfSlot[];
  private orders: OrderRecord[];
  private auditLog: AuditEntry[];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.products = this.load(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    this.shelfSlots = this.load(STORAGE_KEYS.SLOTS, INITIAL_SHELF_SLOTS);
    this.orders = this.load(STORAGE_KEYS.ORDERS, []);
    this.auditLog = this.load(STORAGE_KEYS.AUDIT, []);
  }

  private load<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  private save<T>(key: string, value: T) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in DataLayer listener:', err);
      }
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Products
  public getProducts(): Product[] {
    return [...this.products];
  }

  public getProductById(id: string): Product | undefined {
    return this.products.find((p) => p.id === id);
  }

  public updateProductPrice(productId: string, newPrice: number): void {
    const prod = this.getProductById(productId);
    if (!prod) return;

    this.products = this.products.map((p) =>
      p.id === productId ? { ...p, price: newPrice } : p
    );
    this.save(STORAGE_KEYS.PRODUCTS, this.products);

    this.addAuditEntry({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      action: 'price_change',
      productId,
      productName: prod.name,
      details: `Price changed to $${newPrice.toFixed(2)}`,
    });

    this.notify();
  }

  // Shelf Slots
  public getShelfSlots(): ShelfSlot[] {
    return [...this.shelfSlots];
  }

  public getShelfSlotById(id: string): ShelfSlot | undefined {
    return this.shelfSlots.find((s) => s.id === id);
  }

  public updateSlotStock(slotId: string, newStock: number): void {
    this.shelfSlots = this.shelfSlots.map((s) =>
      s.id === slotId ? { ...s, currentStock: Math.max(0, Math.min(s.maxCapacity, newStock)) } : s
    );
    this.save(STORAGE_KEYS.SLOTS, this.shelfSlots);
    this.notify();
  }

  public restockSlot(slotId: string, amount: number): void {
    const slot = this.getShelfSlotById(slotId);
    if (!slot) return;

    const prod = this.getProductById(slot.productId);
    const newStock = Math.min(slot.maxCapacity, slot.currentStock + amount);

    this.shelfSlots = this.shelfSlots.map((s) =>
      s.id === slotId ? { ...s, currentStock: newStock } : s
    );
    this.save(STORAGE_KEYS.SLOTS, this.shelfSlots);

    this.addAuditEntry({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      action: 'restock',
      productId: slot.productId,
      productName: prod?.name || 'Item',
      details: `Restocked +${amount} units (Now ${newStock}/${slot.maxCapacity})`,
    });

    this.notify();
  }

  public restockAllLow(): void {
    const lowSlots = this.shelfSlots.filter((s) => s.currentStock <= s.reorderThreshold);
    lowSlots.forEach((slot) => {
      this.restockSlot(slot.id, 10);
    });
  }

  // Orders
  public getOrders(): OrderRecord[] {
    return [...this.orders];
  }

  public recordOrder(order: OrderRecord): void {
    this.orders = [order, ...this.orders];
    this.save(STORAGE_KEYS.ORDERS, this.orders);
    this.notify();
  }

  // Audit Log
  public getAuditLog(): AuditEntry[] {
    return [...this.auditLog];
  }

  public addAuditEntry(entry: AuditEntry): void {
    this.auditLog = [entry, ...this.auditLog];
    this.save(STORAGE_KEYS.AUDIT, this.auditLog);
    this.notify();
  }

  // Reset demo store
  public resetToCatalog(): void {
    this.products = [...INITIAL_PRODUCTS];
    this.shelfSlots = [...INITIAL_SHELF_SLOTS];
    this.orders = [];
    this.auditLog = [];
    this.save(STORAGE_KEYS.PRODUCTS, this.products);
    this.save(STORAGE_KEYS.SLOTS, this.shelfSlots);
    this.save(STORAGE_KEYS.ORDERS, this.orders);
    this.save(STORAGE_KEYS.AUDIT, this.auditLog);
    this.notify();
  }
}

export const dataLayer = new StoreDataLayer();
