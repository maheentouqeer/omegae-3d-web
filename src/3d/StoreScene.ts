import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Product, ShelfSlot, AisleInfo } from '../types';
import { AISLE_CONFIG, INITIAL_PRODUCTS, INITIAL_SHELF_SLOTS } from '../data/catalog';
import { TextureFactory } from '../utils/textureAtlas';
import { sound } from '../utils/audio';

// Reusable scratch objects to eliminate render-loop GC
const _vec3 = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _lookDir = new THREE.Vector3();
const _matrix = new THREE.Matrix4();
const _color = new THREE.Color();

export interface StoreSceneCallbacks {
  onProductClick: (product: Product, slot: ShelfSlot) => void;
  onPlayerMove?: (x: number, z: number, angle: number) => void;
}

export class StoreScene {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private callbacks: StoreSceneCallbacks;

  // Animation & Loop
  private animFrameId: number = 0;
  private clock: THREE.Clock = new THREE.Clock();
  private isDestroyed: boolean = false;
  private isSoftwareGl: boolean = false;

  // Player State & Locomotion
  public playerPos: THREE.Vector3 = new THREE.Vector3(0, 1.65, 14); // Near entrance
  private playerVelocity: THREE.Vector3 = new THREE.Vector3();
  private pitch: number = 0;
  private yaw: number = Math.PI; // Face north toward aisles (negative Z)
  private walkBobTime: number = 0;
  private keysHeld: Record<string, boolean> = {};

  // Camera glide / transition target
  private isGliding: boolean = false;
  private glideStartPos = new THREE.Vector3();
  private glideTargetPos = new THREE.Vector3();
  private glideStartYaw: number = 0;
  private glideTargetYaw: number = 0;
  private glideProgress: number = 0;
  private glideDuration: number = 1.2;

  // Interactive 3D Objects
  private shelfBoundingBoxes: { box: THREE.Box3; slotId?: string }[] = [];
  private interactiveMeshes: THREE.Mesh[] = [];
  private slotMeshMap = new Map<string, THREE.Mesh>();
  private lowStockMarkers = new Map<string, THREE.Mesh>();
  private slidingDoorLeft: THREE.Mesh | null = null;
  private slidingDoorRight: THREE.Mesh | null = null;
  private cartGroup: THREE.Group | null = null;
  private conveyorBelts: THREE.Mesh[] = [];

  // Flying Add-to-Cart Projectiles
  private activeProjectiles: {
    mesh: THREE.Mesh;
    start: THREE.Vector3;
    control: THREE.Vector3;
    end: THREE.Vector3;
    progress: number;
    speed: number;
  }[] = [];

  // Raycasting
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private pointer: THREE.Vector2 = new THREE.Vector2(0, 0);
  private hoveredSlotId: string | null = null;

  // Store data caches
  private products: Product[] = INITIAL_PRODUCTS;
  private shelfSlots: ShelfSlot[] = INITIAL_SHELF_SLOTS;

  constructor(container: HTMLElement, callbacks: StoreSceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    // Detect software WebGL safely
    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // Initialize WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth, container.clientHeight);

    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    // Setup Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#e2e8f0');
    this.scene.fog = new THREE.FogExp2('#e2e8f0', 0.022);

    this.camera = new THREE.PerspectiveCamera(
      70,
      container.clientWidth / container.clientHeight,
      0.1,
      80
    );
    this.camera.position.copy(this.playerPos);

    // Environment PMREM Studio Lighting
    try {
      const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();
    } catch (e) {
      console.warn('RoomEnvironment fallback', e);
    }

    this.setupLighting();
    this.buildStoreArchitecture();
    this.buildCheckoutLanes();
    this.buildAisles();
    this.buildFirstPersonCart();
    this.setupEventListeners();

    this.startLoop();
  }

  // Studio Lighting Configuration
  private setupLighting() {
    const hemiLight = new THREE.HemisphereLight('#f8fafc', '#94a3b8', 1.0);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight('#fffbeb', 1.4);
    dirLight.position.set(10, 16, 8);
    dirLight.castShadow = !this.isSoftwareGl;
    if (dirLight.castShadow) {
      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;
      dirLight.shadow.camera.near = 1;
      dirLight.shadow.camera.far = 50;
      const d = 24;
      dirLight.shadow.camera.left = -d;
      dirLight.shadow.camera.right = d;
      dirLight.shadow.camera.top = d;
      dirLight.shadow.camera.bottom = -d;
      dirLight.shadow.bias = -0.0005;
    }
    this.scene.add(dirLight);

    // Subtle ceiling strip glow lights down each aisle corridor
    AISLE_CONFIG.forEach((aisle) => {
      const ceilingStrip = new THREE.PointLight('#f8fafc', 0.8, 12, 1.2);
      ceilingStrip.position.set(aisle.x, 5.2, -4);
      this.scene.add(ceilingStrip);
    });
  }

  // Store Enclosure, Floor, Ceiling, Entrance Doors
  private buildStoreArchitecture() {
    const storeW = 42;
    const storeD = 32;
    const storeH = 5.6;

    // Floor with glossy reflection and terrazzo tile texture
    const floorGeo = new THREE.PlaneGeometry(storeW, storeD);
    const floorMat = new THREE.MeshStandardMaterial({
      map: TextureFactory.getFloorTexture(),
      roughness: 0.18,
      metalness: 0.08,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = !this.isSoftwareGl;
    this.scene.add(floor);

    // Ceiling with industrial truss grid look
    const ceilingGeo = new THREE.PlaneGeometry(storeW, storeD);
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.9,
    });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = storeH;
    this.scene.add(ceiling);

    // Ceiling Light Fixtures
    for (let x = -16; x <= 16; x += 8) {
      for (let z = -12; z <= 12; z += 6) {
        const fixtureGeo = new THREE.BoxGeometry(4, 0.15, 0.4);
        const fixtureMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
        const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
        fixture.position.set(x, storeH - 0.1, z);
        this.scene.add(fixture);
      }
    }

    // Outer Walls (North, South, East, West)
    const wallMat = new THREE.MeshStandardMaterial({
      color: '#f1f5f9',
      roughness: 0.7,
    });

    // North wall (Back of store)
    const northWall = new THREE.Mesh(new THREE.BoxGeometry(storeW, storeH, 0.4), wallMat);
    northWall.position.set(0, storeH / 2, -storeD / 2);
    northWall.receiveShadow = !this.isSoftwareGl;
    this.scene.add(northWall);
    this.shelfBoundingBoxes.push({ box: new THREE.Box3().setFromObject(northWall) });

    // East & West walls
    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, storeH, storeD), wallMat);
    eastWall.position.set(storeW / 2, storeH / 2, 0);
    this.scene.add(eastWall);
    this.shelfBoundingBoxes.push({ box: new THREE.Box3().setFromObject(eastWall) });

    const westWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, storeH, storeD), wallMat);
    westWall.position.set(-storeW / 2, storeH / 2, 0);
    this.scene.add(westWall);
    this.shelfBoundingBoxes.push({ box: new THREE.Box3().setFromObject(westWall) });

    // South wall (Entrance Wall with glass portal)
    const southWallLeft = new THREE.Mesh(new THREE.BoxGeometry(16, storeH, 0.4), wallMat);
    southWallLeft.position.set(-13, storeH / 2, storeD / 2);
    this.scene.add(southWallLeft);
    this.shelfBoundingBoxes.push({ box: new THREE.Box3().setFromObject(southWallLeft) });

    const southWallRight = new THREE.Mesh(new THREE.BoxGeometry(16, storeH, 0.4), wallMat);
    southWallRight.position.set(13, storeH / 2, storeD / 2);
    this.scene.add(southWallRight);
    this.shelfBoundingBoxes.push({ box: new THREE.Box3().setFromObject(southWallRight) });

    // Glass Entrance Sliding Doors
    const doorGlassMat = new THREE.MeshPhysicalMaterial({
      color: '#93c5fd',
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
      metalness: 0.1,
      transmission: this.isSoftwareGl ? 0 : 0.8,
      ior: 1.5,
    });

    const doorGeo = new THREE.BoxGeometry(3.6, 3.4, 0.1);
    this.slidingDoorLeft = new THREE.Mesh(doorGeo, doorGlassMat);
    this.slidingDoorLeft.position.set(-1.8, 1.7, storeD / 2 - 0.2);
    this.scene.add(this.slidingDoorLeft);

    this.slidingDoorRight = new THREE.Mesh(doorGeo, doorGlassMat);
    this.slidingDoorRight.position.set(1.8, 1.7, storeD / 2 - 0.2);
    this.scene.add(this.slidingDoorRight);

    // Entrance Promo Billboard above doors
    const promoMat = new THREE.MeshBasicMaterial({
      map: TextureFactory.getEntranceBannerTexture(),
    });
    const promoMesh = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.2), promoMat);
    promoMesh.position.set(0, 4.2, storeD / 2 - 0.35);
    promoMesh.rotation.y = Math.PI;
    this.scene.add(promoMesh);
  }

  // Checkout Counters & Conveyor Lanes
  private buildCheckoutLanes() {
    const laneXPositions = [-9, -4, 1, 6];
    const laneZ = 9.5;

    laneXPositions.forEach((xPos, idx) => {
      const laneGroup = new THREE.Group();
      laneGroup.position.set(xPos, 0, laneZ);

      // Base counter cabinetry
      const baseMat = new THREE.MeshStandardMaterial({
        color: '#1e3a8a',
        roughness: 0.4,
        metalness: 0.2,
      });
      const counterBase = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 4.5), baseMat);
      counterBase.position.set(0, 0.45, 0);
      counterBase.castShadow = !this.isSoftwareGl;
      laneGroup.add(counterBase);

      // Conveyor Belt surface
      const beltGeo = new THREE.PlaneGeometry(1.0, 3.2);
      const beltMat = new THREE.MeshStandardMaterial({
        map: TextureFactory.getConveyorBeltTexture(),
        roughness: 0.6,
      });
      const belt = new THREE.Mesh(beltGeo, beltMat);
      belt.rotation.x = -Math.PI / 2;
      belt.position.set(-0.4, 0.91, -0.4);
      laneGroup.add(belt);
      this.conveyorBelts.push(belt);

      // Scanner window
      const scanner = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.05, 0.35),
        new THREE.MeshBasicMaterial({ color: '#dc2626' })
      );
      scanner.position.set(-0.4, 0.93, 1.2);
      laneGroup.add(scanner);

      // Cash Register & Touchscreen terminal
      const registerStand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.5),
        new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.8 })
      );
      registerStand.position.set(0.6, 1.15, 1.0);
      laneGroup.add(registerStand);

      const screenGeo = new THREE.BoxGeometry(0.45, 0.32, 0.05);
      const screenMat = new THREE.MeshBasicMaterial({ color: '#0ea5e9' });
      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.position.set(0.6, 1.45, 1.0);
      screen.rotation.y = -Math.PI / 6;
      laneGroup.add(screen);

      // Overhead Numbered Lane Sign
      const signCanvas = document.createElement('canvas');
      signCanvas.width = 256;
      signCanvas.height = 256;
      const sCtx = signCanvas.getContext('2d')!;
      sCtx.fillStyle = '#0B2A6F';
      sCtx.fillRect(0, 0, 256, 256);
      sCtx.strokeStyle = '#38bdf8';
      sCtx.lineWidth = 10;
      sCtx.strokeRect(10, 10, 236, 236);
      sCtx.fillStyle = '#ffffff';
      sCtx.font = 'bold 120px "Bricolage Grotesque", sans-serif';
      sCtx.textAlign = 'center';
      sCtx.textBaseline = 'middle';
      sCtx.fillText(String(idx + 1), 128, 110);
      sCtx.font = 'bold 28px "Inter", sans-serif';
      sCtx.fillStyle = '#4ade80';
      sCtx.fillText('OPEN', 128, 195);

      const signTex = new THREE.CanvasTexture(signCanvas);
      signTex.colorSpace = THREE.SRGBColorSpace;
      const laneSign = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.7, 0.08),
        new THREE.MeshBasicMaterial({ map: signTex })
      );
      laneSign.position.set(0, 3.4, 0);
      laneGroup.add(laneSign);

      // Suspension wire for sign
      const wire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 2.2),
        new THREE.MeshBasicMaterial({ color: '#64748b' })
      );
      wire.position.set(0, 4.5, 0);
      laneGroup.add(wire);

      this.scene.add(laneGroup);
      this.shelfBoundingBoxes.push({ box: new THREE.Box3().setFromObject(laneGroup) });
    });
  }

  // 8 Aisles with 6-part Shelving Racks and Instanced Products
  private buildAisles() {
    const shelfMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.35,
      metalness: 0.1,
    });
    const frameMat = new THREE.MeshStandardMaterial({
      color: '#334155',
      roughness: 0.3,
      metalness: 0.7,
    });
    const priceTicketMat = new THREE.MeshBasicMaterial({ color: '#0284c7' });

    AISLE_CONFIG.forEach((aisle) => {
      const aisleGroup = new THREE.Group();
      aisleGroup.position.set(aisle.x, 0, aisle.z);

      // Shelving Rack: 12m long along Z, 1.4m wide across X, 2.3m tall
      const rackLength = 12;
      const rackWidth = 1.3;
      const rackHeight = 2.2;

      // 1. Steel Upright Vertical Posts (4 corners + middle supports)
      for (const zOff of [-5.8, -2.9, 0, 2.9, 5.8]) {
        for (const xOff of [-rackWidth / 2, rackWidth / 2]) {
          const post = new THREE.Mesh(
            new THREE.BoxGeometry(0.07, rackHeight, 0.07),
            frameMat
          );
          post.position.set(xOff, rackHeight / 2, zOff);
          post.castShadow = !this.isSoftwareGl;
          aisleGroup.add(post);
        }
      }

      // 2. Shelf Trays (3 levels: bottom 0.45m, middle 1.0m, top 1.55m, canopy 2.15m)
      const shelfLevels = [0.45, 1.0, 1.55, 2.15];
      shelfLevels.forEach((yLevel) => {
        const tray = new THREE.Mesh(
          new THREE.BoxGeometry(rackWidth + 0.1, 0.04, rackLength),
          shelfMat
        );
        tray.position.set(0, yLevel, 0);
        tray.receiveShadow = !this.isSoftwareGl;
        aisleGroup.add(tray);

        // Price Ticket Molding on both outer edges
        for (const signSide of [-1, 1]) {
          const ticketStrip = new THREE.Mesh(
            new THREE.BoxGeometry(0.015, 0.04, rackLength),
            priceTicketMat
          );
          ticketStrip.position.set(signSide * (rackWidth / 2 + 0.055), yLevel - 0.01, 0);
          aisleGroup.add(ticketStrip);
        }
      });

      // 3. Hanging Double-Sided Category Sign overhead
      const signTex = TextureFactory.getAisleSignTexture(aisle);
      const signMat = new THREE.MeshBasicMaterial({ map: signTex });
      const signMesh = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.0, 0.08), signMat);
      signMesh.position.set(0, 3.4, 0);
      aisleGroup.add(signMesh);

      // Sign suspension cables
      for (const sx of [-1.1, 1.1]) {
        const cable = new THREE.Mesh(
          new THREE.CylinderGeometry(0.01, 0.01, 2.2),
          new THREE.MeshBasicMaterial({ color: '#64748b' })
        );
        cable.position.set(sx, 4.5, 0);
        aisleGroup.add(cable);
      }

      this.scene.add(aisleGroup);
      this.shelfBoundingBoxes.push({ box: new THREE.Box3().setFromObject(aisleGroup) });

      // Build product meshes for this aisle's slots
      this.populateAisleProducts(aisle);
    });
  }

  // Populate products onto shelves with visual slot fullness and clickable proxies
  private populateAisleProducts(aisle: AisleInfo) {
    const aisleSlots = this.shelfSlots.filter((s) => s.aisleNumber === aisle.number);

    aisleSlots.forEach((slot) => {
      const product = this.products.find((p) => p.id === slot.productId);
      if (!product) return;

      const slotGroup = new THREE.Group();
      slotGroup.position.set(slot.x, slot.y, slot.z);

      // Package dimensions
      let pW = 0.22;
      let pH = 0.28;
      let pD = 0.16;
      let geo: THREE.BufferGeometry = new THREE.BoxGeometry(pW, pH, pD);

      if (product.packageType === 'bottle') {
        pW = 0.14;
        pH = 0.32;
        pD = 0.14;
        geo = new THREE.CylinderGeometry(0.07, 0.07, pH, 12);
      } else if (product.packageType === 'can') {
        pW = 0.13;
        pH = 0.24;
        pD = 0.13;
        geo = new THREE.CylinderGeometry(0.065, 0.065, pH, 12);
      }

      const texture = TextureFactory.getProductTexture(product);
      const prodMat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.35,
        metalness: product.packageType === 'can' ? 0.6 : 0.1,
      });

      // Calculate number of visible physical boxes based on currentStock
      // maxCapacity is 16. Max rows = 2, cols = 4 (8 visible).
      const visibleCount = Math.max(0, Math.min(8, Math.ceil((slot.currentStock / slot.maxCapacity) * 8)));

      for (let i = 0; i < visibleCount; i++) {
        const row = Math.floor(i / 4); // 0 or 1
        const col = i % 4; // 0, 1, 2, 3
        const prodMesh = new THREE.Mesh(geo, prodMat);
        prodMesh.position.set(
          (col - 1.5) * (pW + 0.04),
          pH / 2,
          (row - 0.5) * (pD + 0.04)
        );
        prodMesh.castShadow = !this.isSoftwareGl;
        slotGroup.add(prodMesh);
      }

      // Invisible Click/Hover Raycast Proxy (larger bounding area)
      const proxyGeo = new THREE.BoxGeometry(1.1, 0.55, 0.5);
      const proxyMat = new THREE.MeshBasicMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.0,
      });
      const proxy = new THREE.Mesh(proxyGeo, proxyMat);
      proxy.position.set(0, 0.25, 0);
      proxy.userData = { slotId: slot.id, productId: product.id };
      slotGroup.add(proxy);
      this.interactiveMeshes.push(proxy);
      this.slotMeshMap.set(slot.id, proxy);

      // Low Stock Visual Tag (red indicator if stock <= threshold)
      if (slot.currentStock <= slot.reorderThreshold) {
        const markerGeo = new THREE.BoxGeometry(0.25, 0.08, 0.02);
        const markerMat = new THREE.MeshBasicMaterial({ color: '#e5322d' });
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.position.set(0, 0.52, 0.26);
        slotGroup.add(marker);
        this.lowStockMarkers.set(slot.id, marker);
      }

      this.scene.add(slotGroup);
    });
  }

  // First-Person Shopping Cart Model (pinned to camera viewport)
  private buildFirstPersonCart() {
    this.cartGroup = new THREE.Group();

    // Chrome wireframe basket & blue ergonomic handle
    const handleMat = new THREE.MeshStandardMaterial({
      color: '#0B2A6F',
      roughness: 0.3,
      metalness: 0.5,
    });
    const wireMat = new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      roughness: 0.2,
      metalness: 0.85,
    });

    // Horizontal handle bar
    const handleBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.85, 16),
      handleMat
    );
    handleBar.rotation.z = Math.PI / 2;
    handleBar.position.set(0, 0, 0);
    this.cartGroup.add(handleBar);

    // Two diagonal cart frame struts
    for (const sx of [-0.4, 0.4]) {
      const strut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.7, 12),
        wireMat
      );
      strut.rotation.x = Math.PI / 5;
      strut.position.set(sx, -0.22, -0.25);
      this.cartGroup.add(strut);
    }

    // Top rim wire frame of basket
    const rimFront = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.8, 12),
      wireMat
    );
    rimFront.rotation.z = Math.PI / 2;
    rimFront.position.set(0, -0.38, -0.55);
    this.cartGroup.add(rimFront);

    // Position cart relative to camera
    this.cartGroup.position.set(0, -0.45, -0.8);
    this.camera.add(this.cartGroup);
    this.scene.add(this.camera);
  }

  // Update Slot Inventory (called when item added to cart or restocked in Manager Mode)
  public updateSlotStock(slotId: string, newStock: number) {
    const slot = this.shelfSlots.find((s) => s.id === slotId);
    if (!slot) return;
    slot.currentStock = Math.max(0, newStock);

    // Update or toggle low-stock marker
    let marker = this.lowStockMarkers.get(slotId);
    if (slot.currentStock <= slot.reorderThreshold) {
      if (!marker) {
        const proxy = this.slotMeshMap.get(slotId);
        if (proxy && proxy.parent) {
          const markerGeo = new THREE.BoxGeometry(0.25, 0.08, 0.02);
          const markerMat = new THREE.MeshBasicMaterial({ color: '#e5322d' });
          marker = new THREE.Mesh(markerGeo, markerMat);
          marker.position.set(0, 0.52, 0.26);
          proxy.parent.add(marker);
          this.lowStockMarkers.set(slotId, marker);
        }
      }
    } else if (marker && marker.parent) {
      marker.parent.remove(marker);
      this.lowStockMarkers.delete(slotId);
    }
  }

  // 3D Parabolic Add-to-Cart Flight Arc Animation
  public spawnAddToCartFlight(slotId: string) {
    const slot = this.shelfSlots.find((s) => s.id === slotId);
    const product = this.products.find((p) => p.id === slot?.productId);
    if (!slot || !product) return;

    sound.playAddToCart();

    // Create miniature 3D box projectile
    const projGeo = new THREE.BoxGeometry(0.16, 0.2, 0.12);
    const projMat = new THREE.MeshStandardMaterial({
      color: product.baseColor,
      roughness: 0.3,
      metalness: 0.2,
    });
    const projMesh = new THREE.Mesh(projGeo, projMat);

    const start = new THREE.Vector3(slot.x, slot.y + 0.2, slot.z);
    // End near cart in front of player
    const end = this.camera.position.clone().add(
      this.camera.getWorldDirection(_vec3).multiplyScalar(0.7)
    );
    end.y -= 0.3;

    // Control point for smooth arching curve
    const control = new THREE.Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5);
    control.y += 1.8; // High apex arch

    this.scene.add(projMesh);
    this.activeProjectiles.push({
      mesh: projMesh,
      start,
      control,
      end,
      progress: 0,
      speed: 2.2, // ~0.45s flight
    });
  }

  // Smooth Camera Glide / Teleport to specific Aisle or Checkout Lane
  public glideTo(targetX: number, targetZ: number, targetYaw?: number) {
    this.isGliding = true;
    this.glideProgress = 0;
    this.glideStartPos.copy(this.playerPos);
    this.glideTargetPos.set(targetX, 1.65, targetZ);
    this.glideStartYaw = this.yaw;
    this.glideTargetYaw = targetYaw !== undefined ? targetYaw : this.yaw;
  }

  public glideToAisle(aisleNumber: number) {
    const aisle = AISLE_CONFIG.find((a) => a.number === aisleNumber);
    if (!aisle) return;
    // Position player at entrance of aisle looking north down the corridor
    this.glideTo(aisle.x, 3.2, Math.PI);
  }

  public glideToCheckout(laneNumber: number = 1) {
    const laneX = [-9, -4, 1, 6][laneNumber - 1] || -9;
    // Position player right before the conveyor belt
    this.glideTo(laneX, 11.8, Math.PI);
  }

  public glideToProduct(productId: string) {
    const slot = this.shelfSlots.find((s) => s.productId === productId);
    if (!slot) return;
    // Stand 1.5m away from the shelf slot facing it
    const standZ = slot.z;
    const standX = slot.x > 0 ? slot.x - 1.5 : slot.x + 1.5;
    const targetYaw = slot.x > 0 ? -Math.PI / 2 : Math.PI / 2;
    this.glideTo(standX, standZ, targetYaw);
  }

  // User Input & Event Listeners
  private isPointerLocked: boolean = false;
  private isDragging: boolean = false;
  private lastPointerX: number = 0;
  private lastPointerY: number = 0;

  private setupEventListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('resize', this.handleResize);

    const dom = this.renderer.domElement;
    dom.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);

    // Touch events for mobile
    dom.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    dom.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    dom.addEventListener('touchend', this.handleTouchEnd);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keysHeld[e.code] = true;
    this.keysHeld[e.key.toLowerCase()] = true;
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysHeld[e.code] = false;
    this.keysHeld[e.key.toLowerCase()] = false;
  };

  private handleMouseDown = (e: MouseEvent) => {
    // Left click
    if (e.button === 0) {
      this.isDragging = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;

      // Check product raycast on click
      this.checkRaycastClick(e);
    }
  };

  private handleMouseMove = (e: MouseEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.isDragging && !this.isGliding) {
      const deltaX = e.clientX - this.lastPointerX;
      const deltaY = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;

      const sens = 0.0035;
      this.yaw -= deltaX * sens;
      this.pitch -= deltaY * sens;
      this.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.pitch));
    }
  };

  private handleMouseUp = () => {
    this.isDragging = false;
  };

  // Touch controls for mobile
  private touchStartX: number = 0;
  private touchStartY: number = 0;

  private handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.touchStartX = touch.clientX;
      this.touchStartY = touch.clientY;
      this.isDragging = true;
      this.lastPointerX = touch.clientX;
      this.lastPointerY = touch.clientY;

      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    if (this.isDragging && e.touches.length === 1 && !this.isGliding) {
      e.preventDefault();
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.lastPointerX;
      const deltaY = touch.clientY - this.lastPointerY;
      this.lastPointerX = touch.clientX;
      this.lastPointerY = touch.clientY;

      const sens = 0.005;
      this.yaw -= deltaX * sens;
      this.pitch -= deltaY * sens;
      this.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.pitch));
    }
  };

  private handleTouchEnd = (e: TouchEvent) => {
    this.isDragging = false;
    if (e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      const dist = Math.hypot(touch.clientX - this.touchStartX, touch.clientY - this.touchStartY);
      if (dist < 10) {
        // Tap as click
        this.checkRaycastClick(touch as any);
      }
    }
  };

  private checkRaycastClick(e: { clientX: number; clientY: number }) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const py = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(px, py), this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveMeshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;
      const slotId = hit.userData.slotId;
      const productId = hit.userData.productId;
      if (slotId && productId) {
        const slot = this.shelfSlots.find((s) => s.id === slotId);
        const product = this.products.find((p) => p.id === productId);
        if (slot && product) {
          sound.playScanBeep();
          this.callbacks.onProductClick(product, slot);
        }
      }
    }
  }

  private handleResize = () => {
    if (!this.container || this.isDestroyed) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  // Virtual Joystick input for mobile
  public setJoystickInput(x: number, y: number) {
    if (Math.abs(x) > 0.1 || Math.abs(y) > 0.1) {
      this.keysHeld['KeyA'] = x < -0.25;
      this.keysHeld['KeyD'] = x > 0.25;
      this.keysHeld['KeyW'] = y < -0.25;
      this.keysHeld['KeyS'] = y > 0.25;
    } else {
      this.keysHeld['KeyA'] = false;
      this.keysHeld['KeyD'] = false;
      this.keysHeld['KeyW'] = false;
      this.keysHeld['KeyS'] = false;
    }
  }

  // Physics, Locomotion & Collision Detection
  private updatePlayer(dt: number) {
    if (this.isGliding) {
      this.glideProgress += dt / this.glideDuration;
      const t = Math.min(1, this.glideProgress);
      // Smooth cubic ease out
      const ease = 1 - Math.pow(1 - t, 3);

      this.playerPos.lerpVectors(this.glideStartPos, this.glideTargetPos, ease);
      this.yaw = THREE.MathUtils.lerp(this.glideStartYaw, this.glideTargetYaw, ease);

      if (t >= 1) {
        this.isGliding = false;
      }
      this.camera.position.copy(this.playerPos);
      this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
      return;
    }

    // Standard Walking Input
    const moveX = (this.keysHeld['KeyD'] || this.keysHeld['ArrowRight'] ? 1 : 0) -
                  (this.keysHeld['KeyA'] || this.keysHeld['ArrowLeft'] ? 1 : 0);
    const moveZ = (this.keysHeld['KeyS'] || this.keysHeld['ArrowDown'] ? 1 : 0) -
                  (this.keysHeld['KeyW'] || this.keysHeld['ArrowUp'] ? 1 : 0);

    const speed = 4.8; // m/s
    const moveVec = _vec3.set(moveX, 0, moveZ);

    let isMoving = false;
    if (moveVec.lengthSq() > 0) {
      isMoving = true;
      moveVec.normalize();
      // Rotate by camera yaw
      moveVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

      this.playerVelocity.x = THREE.MathUtils.damp(this.playerVelocity.x, moveVec.x * speed, 12, dt);
      this.playerVelocity.z = THREE.MathUtils.damp(this.playerVelocity.z, moveVec.z * speed, 12, dt);

      // Walking Bob & Sound
      this.walkBobTime += dt * 9.5;
      if (Math.sin(this.walkBobTime) > 0.95 && Math.sin(this.walkBobTime - dt * 9.5) <= 0.95) {
        sound.playFootstep();
      }
    } else {
      this.playerVelocity.x = THREE.MathUtils.damp(this.playerVelocity.x, 0, 14, dt);
      this.playerVelocity.z = THREE.MathUtils.damp(this.playerVelocity.z, 0, 14, dt);
    }

    // Tentative next position
    const nextX = this.playerPos.x + this.playerVelocity.x * dt;
    const nextZ = this.playerPos.z + this.playerVelocity.z * dt;

    // Collision Detection against shelves and walls
    const playerRadius = 0.55;
    let allowedX = nextX;
    let allowedZ = nextZ;

    // Store Perimeter Bounds
    const minX = -19.5 + playerRadius;
    const maxX = 19.5 - playerRadius;
    const minZ = -14.5 + playerRadius;
    const maxZ = 14.5 - playerRadius;

    allowedX = Math.max(minX, Math.min(maxX, allowedX));
    allowedZ = Math.max(minZ, Math.min(maxZ, allowedZ));

    // AABB check against shelf units
    const testBox = new THREE.Box3();
    for (const shelf of this.shelfBoundingBoxes) {
      testBox.copy(shelf.box);
      testBox.expandByScalar(playerRadius);
      if (testBox.containsPoint(new THREE.Vector3(allowedX, 1.0, this.playerPos.z))) {
        allowedX = this.playerPos.x;
      }
      if (testBox.containsPoint(new THREE.Vector3(this.playerPos.x, 1.0, allowedZ))) {
        allowedZ = this.playerPos.z;
      }
    }

    this.playerPos.x = allowedX;
    this.playerPos.z = allowedZ;

    // Apply head bob
    const bobOffset = isMoving ? Math.sin(this.walkBobTime) * 0.045 : 0;
    this.camera.position.set(this.playerPos.x, 1.65 + bobOffset, this.playerPos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');

    // Cart bob follow
    if (this.cartGroup) {
      this.cartGroup.position.y = -0.45 + (isMoving ? Math.cos(this.walkBobTime) * 0.015 : 0);
    }

    // Sliding Entrance Doors Animation (Open when player is near Z = 14, X between -5 and 5)
    if (this.slidingDoorLeft && this.slidingDoorRight) {
      const distToDoor = Math.hypot(this.playerPos.x, this.playerPos.z - 14.5);
      const isDoorOpen = distToDoor < 4.5;
      const targetLeftX = isDoorOpen ? -3.4 : -1.8;
      const targetRightX = isDoorOpen ? 3.4 : 1.8;
      this.slidingDoorLeft.position.x = THREE.MathUtils.damp(this.slidingDoorLeft.position.x, targetLeftX, 5, dt);
      this.slidingDoorRight.position.x = THREE.MathUtils.damp(this.slidingDoorRight.position.x, targetRightX, 5, dt);
    }

    // Conveyor belt texture animation
    for (const belt of this.conveyorBelts) {
      if (belt.material && (belt.material as any).map) {
        (belt.material as any).map.offset.y += dt * 0.2;
      }
    }

    // Notify position callback for Minimap
    if (this.callbacks.onPlayerMove) {
      this.callbacks.onPlayerMove(this.playerPos.x, this.playerPos.z, this.yaw);
    }
  }

  // Update projectile flights
  private updateProjectiles(dt: number) {
    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
      const p = this.activeProjectiles[i];
      p.progress += dt * p.speed;
      const t = Math.min(1, p.progress);

      // Quadratic Bezier Curve: B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
      const invT = 1 - t;
      p.mesh.position.x = invT * invT * p.start.x + 2 * invT * t * p.control.x + t * t * p.end.x;
      p.mesh.position.y = invT * invT * p.start.y + 2 * invT * t * p.control.y + t * t * p.end.y;
      p.mesh.position.z = invT * invT * p.start.z + 2 * invT * t * p.control.z + t * t * p.end.z;

      // Spin projectile during flight
      p.mesh.rotation.x += dt * 8;
      p.mesh.rotation.y += dt * 6;

      if (t >= 1) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        if (Array.isArray(p.mesh.material)) {
          p.mesh.material.forEach((m) => m.dispose());
        } else {
          p.mesh.material.dispose();
        }
        this.activeProjectiles.splice(i, 1);
      }
    }
  }

  // Render Loop
  private startLoop() {
    const tick = () => {
      if (this.isDestroyed) return;
      const dt = Math.min(this.clock.getDelta(), 0.05);

      this.updatePlayer(dt);
      this.updateProjectiles(dt);

      this.renderer.render(this.scene, this.camera);
      this.animFrameId = requestAnimationFrame(tick);
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  // Cleanup Resources
  public dispose() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);

    this.renderer.dispose();
    if (this.container && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
