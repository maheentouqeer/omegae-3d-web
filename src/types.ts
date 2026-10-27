export type ProductCategory =
  | 'food'
  | 'drinks'
  | 'beauty'
  | 'pharmacy'
  | 'apparel'
  | 'electronics'
  | 'home'
  | 'kids';

export type PackageType =
  | 'box'
  | 'bottle'
  | 'can'
  | 'tube'
  | 'bag'
  | 'jar'
  | 'folded_clothes';

export interface Product {
  id: string;
  sku: string;
  name: string;
  brandName: string;
  category: ProductCategory;
  price: number;
  description: string;
  unit: string;
  aisleNumber: number;
  shelfSlotId: string;
  packageType: PackageType;
  baseColor: string;
  accentColor: string;
  caloriesOrSpec?: string;
  isSale?: boolean;
  salePrice?: number;
  rating?: number;
}

export interface ShelfSlot {
  id: string;
  aisleNumber: number;
  shelfLevel: number; // 0 (bottom: 0.35m) to 4 (top: 1.95m)
  positionIndex: number;
  x: number;
  y: number;
  z: number;
  productId: string;
  maxCapacity: number;
  currentStock: number;
  reorderThreshold: number;
  salesCount: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderRecord {
  orderId: string;
  timestamp: number;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'card' | 'wallet' | 'cash';
}

export interface AuditEntry {
  id: string;
  timestamp: number;
  action: 'restock' | 'price_change' | 'threshold_update';
  productId: string;
  productName: string;
  details: string;
}

export type ViewMode = '3d' | 'list';
export type AppMode = 'shopper' | 'manager';
export type QualityLevel = 'low' | 'medium' | 'high';

export interface AisleInfo {
  number: number;
  name: string;
  subLabel: string;
  category: ProductCategory;
  signTitle: string;
  accentColor: string;
  x: number;
  z: number;
}

export interface CartToast {
  id: string;
  message: string;
  productId?: string;
  quantity?: number;
  slotId?: string;
}
