# Omega 3D Interactive Supermarket & Store Management

A real-time first-person 3D WebGL supermarket experience featuring 8 aisles, procedural instanced products, a complete shopping workflow with 3D add-to-cart projectile arcs, automated checkout lanes with conveyor animation, and a comprehensive Manager Inventory Mode paired with Gemini AI shopping and stock analysis.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and design decisions reflect your confirmed choices from Phase 1 and established blueprint specifications:

- **Confirmed Decision 1: Store Branding & Theme**  
  Omega Supermarket — Modern low-poly retail grocery with 8 curated aisles (*Beauty, Pharmacy, Food, Drinks, Apparel, Electronics, Home, Kids*), blue hanging category signage, realistic shelf spacing, and entrance glass sliding doors.
- **Confirmed Decision 2: Gemini AI Integration**  
  Dual server-side Gemini intelligence:
  1. *AI Shopping Concierge*: Recipe builder, dietary basket planner, and in-store aisle/shelf finder.
  2. *AI Inventory Analyst*: Manager-mode stock velocity predictor, restock prioritization, and pricing suggestions.
- **Confirmed Decision 3: Navigation & Camera Choreography**  
  First-person WASD/Arrow keys locomotion with smoothed mouse look (and touch joystick on mobile devices), collision avoidance against shelves and perimeter walls, plus camera gliding/teleporting directly to target shelf locations on search or aisle selection.
- **Recommended Default 1: Zero External 404 Asset Pipeline**  
  100% procedural 3D models (shelves, signage, carts, checkouts, product boxes, bottles, bags) with dynamic HTML5 Canvas texture atlases for crisp product labels and SKUs, guaranteeing zero broken 404 image or GLB downloads.
- **Recommended Default 2: Procedural Web Audio Sound Engine**  
  Synthesized sound effects (footsteps, scanner beeps, entrance door whoosh, cash register chime) with a top-bar mute toggle, defaulting to on.
- **Recommended Default 3: Accessible 2D List Mode & Dual Quality Toggle**  
  A single-click switch between the immersive 3D store view and a WCAG-compliant responsive product catalog table, accompanied by a High/Low graphics toggle for 60 FPS performance on all hardware.

---

## 1. Overview & Core Concept

### What It Does
Omega transforms traditional e-commerce into an interactive first-person 3D supermarket. Shoppers walk the aisles with a 3D shopping cart pinned at the bottom of their view, discover products on instanced shelves, click items to view nutrition and pricing, add items with parabolic flight animations into the cart, and proceed to interactive checkout lanes where items unload onto an animated conveyor belt. Store managers can switch to **Manager Mode** at any moment to view live shelf stock fullness, identify low-stock items via visual markers, adjust pricing, trigger restocks, examine sales heatmaps, and consult the Gemini AI Inventory Analyst.

### Target Audience & Persona
- **Shoppers**: Users seeking an engaging, lifelike spatial shopping journey with smart recipe planning and instant shelf navigation.
- **Store Managers & Merchandisers**: Retail operators who need an intuitive digital-twin overview of shelf capacity, SKU velocity, low-stock alerts, and restocking logistics.

### Key Value
Bridges the physical presence and discovery serendipity of a walk-in grocery store with the speed, intelligence, and frictionless search of modern web applications.

---

## 2. User Experience & Visual Design

### Key User Flows

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             USER JOURNEY MAP                                │
└─────────────────────────────────────────────────────────────────────────────┘
  Shopper Mode:
  [Entrance / Doors] ──> [Aisle Walk & Search] ──> [Shelf Product Inspection]
                                                          │
                                                          ▼
  [Receipt & Summary] <── [Checkout Lane & Belt] <── [Add to Cart (Flight Arc)]

  Manager Mode:
  [Toggle Manager Mode] ──> [Stock Fullness View] ──> [Shelf Slot Click]
                                                          │
                                                          ▼
  [AI Restock Forecast] <── [Minimap Heatmap]    <── [Update Price / Restock]
```

1. **Store Arrival & Entrance**: The user starts in front of the Omega entrance with sliding glass doors, overhead promo screens, and an unobstructed view down the central concourse. A low-poly shopping cart is fixed at the lower edge of the first-person perspective.
2. **Aisle Navigation & Product Discovery**: Walking between 8 distinct aisles with overhead category signs. As the player approaches a shelf, individual product boxes highlight on hover.
3. **Product Inspection & Add-to-Cart**: Clicking a product opens a clean, floating 2D modal with high-res procedural badge, price, stock status, and quantity stepper. Clicking "Add to Cart" launches an animated 3D projectile curve from the shelf directly into the cart counter.
4. **Instant Search & Camera Gliding**: Typing in the search bar or clicking any aisle name in the navigation bar smoothly glides the camera through the store directly to that product's shelf slot.
5. **Interactive Checkout**: Clicking "Go to Checkout" transports the shopper to one of 4 numbered checkout counters. Items unload onto the motorized conveyor belt, a barcode scanner beeps, and the user selects payment (Simulated Credit Card, Mobile Pay, Cash) with receipt generation and order reset.
6. **Manager & Inventory Mode**: Switching to Manager Mode turns shelf slots into visual stock meters (shelf fullness represents inventory level). Low-stock slots show a red indicator; clicking a slot opens quick restock, reorder thresholds, price adjustment, and audit log tracking.
7. **AI Concierge & Inventory Analyst**: A floating Gemini assistant drawer accessible in both modes to suggest meal ingredients, create instant shopping bundles, or analyze stock velocity.

### Visual Identity & Theme Tokens
- **Color Discipline (60-30-10)**:
  - *Dominant Canvas (60%)*: Paper Light `#F6F4EE` for UI overlays, Clean Neutral Tile `#E5E7EB` / Polished Concrete floor in 3D.
  - *Structural Surfaces (30%)*: Deep Navy `#0B2A6F` for store branding, steel aisle structures, dark checkout counter belts `#1F2937`, shelf white `#FFFFFF`.
  - *Accent Budget (10%)*: Signal Red `#E5322D` strictly reserved for sale tags and low-stock alerts; Mint `#10B981` for in-stock and success states; Warm Amber `#F59E0B` for aisle waypoints.
- **Typography & Scale**:
  - *Signs & Headings*: Bricolage Grotesque / Sora (clean, modern geometric grotesk).
  - *UI Body*: Inter / Plus Jakarta Sans (high legibility at 14–16px, 1.5 line height).
  - *Prices, SKUs & Metrics*: JetBrains Mono with `tabular-nums` for crisp number alignment.
- **3D Atmospheric Realism**:
  - PBR standard materials with subtle roughness.
  - Studio `RoomEnvironment` PMREM reflection mapping on glossy floor tiles and metal checkout rails.
  - Soft directional sunlight through clerestory windows paired with cool `HemisphereLight` ambient fill and subtle distance fog matching store wall color (`#F0F2F5`).
- **Ergonomic HUD Architecture**:
  - Top Bar: Brand wordmark, search input with auto-suggest, category quick-jump menu, mode toggle (Shopper/Manager), cart count badge, sound toggle, and list-mode switch.
  - Minimap: Pinned interactive 2D floorplan showing player position, view frustum, 8 aisles, and low-stock pins.
  - Collapsible Bottom Dock: View mode quick actions, movement help hints (`WASD Move · Click to Inspect · Esc Unlock`), and cinema mode toggle.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Procedural Generation vs. External 3D Models (.glb / .gltf)
- **Chosen Approach**: 100% procedural Three.js geometry (`THREE.Group` composite structures) and procedural HTML5 Canvas dynamic texture atlases for all products, shelves, signs, and carts.
- **Why**: Eliminates external asset loading failures, CORS issues, missing CDN files, and heavy multi-megabyte bundle downloads. Loads instantly (<1s) and runs reliably in sandbox environments.
- **Alternatives Considered**: Fetching third-party GLB models was rejected due to network fragility and risk of 404 errors.

### Decision 2: High-Performance Instanced Rendering for Products
- **Chosen Approach**: Group products by category and render them using `THREE.InstancedMesh` with dynamic transform matrices and custom color/atlas offsets.
- **Why**: Keeps WebGL draw calls under 120 across all 8 aisles with 96+ product instances on shelves, ensuring smooth 60 FPS on desktop and 30+ FPS on mobile devices.
- **Alternatives Considered**: Individual `Mesh` objects per product would produce 500+ draw calls and cause frame stuttering.

### Decision 3: Server-Side Gemini Intelligence via Express Proxy
- **Chosen Approach**: Implement dedicated Express backend endpoints (`/api/ai/concierge` and `/api/ai/inventory`) utilizing `@google/genai` with `gemini-3.8-flash` for rich multi-turn responses and `gemini-3.1-flash-lite` for fast grocery queries.
- **Why**: Protects the API key on the server, adheres strictly to system security guidelines, and enables seamless streaming and structured JSON responses.

### Decision 4: Decoupled Dual-Mode State Engine
- **Chosen Approach**: Centralized store state managing Cart, Inventory Stock, Manager Audits, Navigation Waypoints, and UI Mode.
- **Why**: Synchronizes live stock adjustments between the 3D scene (updating `InstancedMesh` transforms and shelf fullness gaps) and the 2D manager dashboard in real-time.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OMEGA APPLICATION ARCHITECTURE                      │
└─────────────────────────────────────────────────────────────────────────────┘

                  ┌──────────────────────────────────────────┐
                  │          Browser Window / DOM            │
                  └────────────────────┬─────────────────────┘
                                       │
         ┌─────────────────────────────┴─────────────────────────────┐
         ▼                                                           ▼
┌───────────────────────────────────┐               ┌───────────────────────────────────┐
│        2D Overlay Layer           │               │       3D WebGL Canvas Layer       │
│  - Top Navigation & Search        │               │  - Three.js WebGLRenderer         │
│  - Product Modal & Cart Drawer    │               │  - Perspective Camera & FPS Look  │
│  - Manager Dashboard & Heatmap    │               │  - 8 Aisle Shelving & Instancing  │
│  - Minimap & Audio Controls       │               │  - Collision AABB Detection       │
│  - Gemini AI Assistant Drawer     │               │  - Procedural Texture Atlases     │
│  - Accessible List-Mode Catalog   │               │  - Conveyor Belt & 3D Cart Handle │
└─────────────────┬─────────────────┘               └─────────────────┬─────────────────┘
                  │                                                   │
                  └─────────────────────┬─────────────────────────────┘
                                        │
                                        ▼
                  ┌──────────────────────────────────────────┐
                  │         Application State Store          │
                  │  - Cart items, totals, tax (8%)          │
                  │  - Shelf inventory & stock thresholds    │
                  │  - Active mode: Shopper vs Manager       │
                  │  - Player position & camera tween target │
                  │  - Audio settings & quality settings     │
                  └─────────────────────┬────────────────────┘
                                        │ (Fetch API)
                                        ▼
                  ┌──────────────────────────────────────────┐
                  │       Server-Side Express Proxy          │
                  │  - /api/ai/concierge (Shopping queries)  │
                  │  - /api/ai/inventory (Manager analytics) │
                  │  - User-Agent: aistudio-build            │
                  │  - @google/genai SDK (gemini-3.8-flash)  │
                  └──────────────────────────────────────────┘
```

### Data Models

```typescript
// Core Product Definition
interface Product {
  id: string;
  sku: string;
  name: string;
  category: 'beauty' | 'pharmacy' | 'food' | 'drinks' | 'apparel' | 'electronics' | 'home' | 'kids';
  price: number;
  description: string;
  unit: string;
  aisleNumber: number;
  shelfSlotId: string;
  packageType: 'box' | 'bottle' | 'can' | 'bag';
  baseColor: string;
  accentColor: string;
  isSale?: boolean;
  salePrice?: number;
}

// Shelf Slot & Stock Representation
interface ShelfSlot {
  id: string;
  aisleNumber: number;
  shelfLevel: number; // 0 (bottom), 1 (middle), 2 (top)
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

// Cart Item & Order
interface CartItem {
  product: Product;
  quantity: number;
}

interface OrderRecord {
  orderId: string;
  timestamp: number;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'card' | 'wallet' | 'cash';
}

// Manager Audit Log
interface AuditEntry {
  id: string;
  timestamp: number;
  action: 'restock' | 'price_change' | 'threshold_update';
  productId: string;
  productName: string;
  details: string;
}
```

### Interactive Component & State Mapping

| Component | Trigger / User Interaction | State Mutation & Visual Response |
| :--- | :--- | :--- |
| **3D Scene Viewport** | Pointer drag / WASD movement | Updates camera translation with damping and collision bounds check against shelf bounding boxes. |
| **Product Raycaster** | Hovering over shelf items | Scales target instance slightly (`1.05x`) and shows subtle 3D highlight cursor. |
| **Shelf Product Click** | Clicking on highlighted product | Opens floating `ProductModal` with item details, pricing, and stock status. |
| **Add to Cart CTA** | Clicking "Add to Cart" | Spawns a 3D parabolic particle arc flying to the top-bar cart badge; updates cart state. |
| **Top Bar Search** | Typing query in search field | Filters product index; selecting an item triggers camera tween flight to the shelf slot. |
| **Mode Switcher** | Toggling Shopper ↔ Manager | Toggles visual stock overlays, fullness gaps, low-stock flags, and manager toolbar. |
| **Stock Adjuster** | Restocking in Manager Mode | Immediately updates `ShelfSlot.currentStock`, recalculates instance counts on shelf, logs audit entry. |
| **Checkout Counter** | Clicking "Go to Checkout" | Glides camera to Checkout Lane 1; items spawn on conveyor belt with scanner audio and checkout dialog. |
| **Simulated Payment** | Submitting card/wallet payment | Plays payment processing state, generates receipt with print/reset action, resets cart. |
| **Gemini Concierge** | Asking for recipe or gift ideas | Calls `/api/ai/concierge`, renders markdown recipe with a single-click "Add All Ingredients to Cart". |
| **Gemini Stock Analyst**| Asking for restock forecast | Calls `/api/ai/inventory`, analyzes low-stock slots and generates ordered restock checklist. |
| **Audio Toggle** | Clicking Sound button | Enables/mutes procedural Web Audio API footsteps, chimes, and scanner beeps. |
| **List Mode Switch** | Toggling 3D / List Mode | Toggles between 3D WebGL viewport and full-page accessible product catalog table. |

---

## 5. Step-by-Step Implementation Strategy

1. **Phase 1: Environment & Full-Stack Server Setup**  
   - Install `three` and `@types/three`.
   - Configure full-stack server script in `server.ts` with Express and Vite middleware.
   - Configure server proxy endpoints for Gemini AI Concierge and Inventory Analyst (`@google/genai`).
   - Sync `metadata.json` and `index.html` title and metadata.

2. **Phase 2: Product Catalog & Procedural Asset Atlas**  
   - Create catalog dataset containing 64+ realistic grocery products distributed across 8 aisles.
   - Implement procedural HTML5 Canvas texture generator for product labels, packaging artwork, and hanging aisle signs.
   - Implement procedural Web Audio synthesizer for footsteps, beeps, door swooshes, and chimes.

3. **Phase 3: 3D Store Architecture & Instanced Shelves**  
   - Build 3D store perimeter: walls, glossy floor with reflections, ceiling truss grid, hanging lights, entrance sliding doors.
   - Construct modular 6-8 part shelf units (`THREE.Group`) across 8 numbered aisles.
   - Implement `InstancedMesh` product positioning system where slot fullness directly dictates rendered box count.
   - Implement checkout area with 4 numbered counter lanes, conveyor belts, scanner terminals, and divider bars.
   - Add first-person shopping cart model pinned to player camera view.

4. **Phase 4: Navigation, Collisions & Camera Tweening**  
   - Implement first-person controls with mouse look / touch drag, WASD locomotion, and walking head-bob.
   - Implement Axis-Aligned Bounding Box (AABB) collision checks against shelves and walls.
   - Implement smooth camera glide transitions (`gsap` / damp lerping) for shelf teleportation and checkout navigation.

5. **Phase 5: Shopping Overlay UI & Checkout Flow**  
   - Build glassmorphic Top Bar with logo, search with auto-suggest, category quick-jump, and cart counter.
   - Build Product Modal, Add-to-Cart 3D flight arc, and sliding Cart Drawer with tax calculations.
   - Build multi-step Checkout Experience with conveyor item movement, scanner sound, simulated card/wallet payment, and receipt generation.

6. **Phase 6: Manager Inventory Mode & Minimap**  
   - Implement visual stock fullness meters, pulsing low-stock indicators, and stock editor.
   - Implement interactive 2D Minimap with player marker, aisle labels, and low-stock pins.
   - Build Sales Heatmap and Restock Audit Log.

7. **Phase 7: Gemini AI Integration & Accessibility Polish**  
   - Connect AI Shopping Concierge drawer with recipe bundle builder.
   - Connect AI Inventory Analyst with restock prioritization.
   - Implement accessible WCAG List Mode catalog view and Quality Toggle (High/Low).
   - Verify compilation and zero console warnings.
