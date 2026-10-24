export type ProductCategory =
  | 'food'
  | 'drinks'
  | 'beauty'
  | 'pharmacy'
  | 'apparel'
  | 'electronics'
  | 'home'
  | 'kids';

export type PackageType = 'box' | 'bottle' | 'can' | 'bag';

export interface Product {
  id: string;
  sku: string;
  name: string;
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
}

export interface ShelfSlot {
  id: string;
  aisleNumber: number;
  shelfLevel: number; // 0: bottom, 1: middle, 2: top
  positionIndex: number; // position along the aisle shelf
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

export interface AisleInfo {
  number: number;
  name: string;
  category: ProductCategory;
  signTitle: string;
  color: string;
  x: number;
  z: number;
}
