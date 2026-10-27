import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Product, ShelfSlot, AisleInfo, QualityLevel, CartItem } from '../types';
import { AISLE_CONFIG, INITIAL_PRODUCTS, INITIAL_SHELF_SLOTS } from '../data/catalog';
import { TextureFactory } from '../utils/textureAtlas';
import { sound } from '../utils/audio';
import { CashierNPC } from './CashierNPC';

// Reusable scratch objects
const _vec3 = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _camDir = new THREE.Vector3();

export interface StoreSceneCallbacks {
  onProductClick: (product: Product, slot: ShelfSlot) => void;
  onProductHover?: (product: Product | null, slot: ShelfSlot | null, screenPos?: { x: number; y: number }) => void;
  onPlayerMove?: (x: number, z: number, angle: number) => void;
  onSceneReady?: () => void;
}

export class StoreScene {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private callbacks: StoreSceneCallbacks;

  // Configuration & Flags
  public isManagerMode: boolean = false;
  public quality: QualityLevel = 'high';
  public prefersReducedMotion: boolean = false;
  private isSoftwareGl: boolean = false;
  private isDestroyed: boolean = false;
  private animFrameId: number = 0;
  private clock: THREE.Clock = new THREE.Clock();

  // Locomotion & Camera
  public playerPos: THREE.Vector3 = new THREE.Vector3(0, 1.65, 13.5); // Entrance
  private playerVelocity: THREE.Vector3 = new THREE.Vector3();
  private pitch: number = 0;
  private yaw: number = Math.PI; // North facing
  private walkBobTime: number = 0;
  private baseFov: number = 70;
  private currentFov: number = 70;
  private keysHeld: Record<string, boolean> = {};

  // Camera Glide (900ms ease in-out)
  private isGliding: boolean = false;
  private glideStartPos = new THREE.Vector3();
  private glideTargetPos = new THREE.Vector3();
  private glideStartYaw: number = 0;
  private glideTargetYaw: number = 0;
  private glideStartPitch: number = 0;
  private glideTargetPitch: number = 0;
  private glideTime: number = 0;
  private glideDuration: number = 0.9;
  private glideCallback: (() => void) | null = null;

  // Cashier NPC & Checkout Conveyor Flight Sequence
  private cashierNPC: CashierNPC | null = null;
  private checkoutSequenceActive: boolean = false;
  private checkoutSequenceMeshes: THREE.Mesh[] = [];
  private checkoutSequenceTimers: (NodeJS.Timeout | number)[] = [];
  private checkoutConveyorFlightItems: {
    mesh: THREE.Mesh;
    start: THREE.Vector3;
    control: THREE.Vector3;
    end: THREE.Vector3;
    progress: number;
    duration: number;
    onLand?: () => void;
  }[] = [];

  // Pulsing Shelf Slot Beacon (from Search)
  private pulsedSlotMesh: THREE.Mesh | null = null;
  private pulseBeaconMesh: THREE.Mesh | null = null;
  private pulseTime: number = 0;

  // Collision & Raycast
  private collisionBoxes: THREE.Box3[] = [];
  private interactiveMeshes: THREE.Mesh[] = [];
  private slotMeshMap = new Map<string, THREE.Mesh>();
  private instancedMeshMap = new Map<string, THREE.InstancedMesh>();
  private stockRingMap = new Map<string, THREE.Mesh>();
  private lowStockBeaconMap = new Map<string, THREE.Mesh>();
  public effectsEnabled: boolean = true;

  // Scene Entities
  private slidingDoorLeft: THREE.Mesh | null = null;
  private slidingDoorRight: THREE.Mesh | null = null;
  private cartGroup: THREE.Group | null = null;
  private conveyorBelts: THREE.Mesh[] = [];
  private promoScreens: THREE.Mesh[] = [];
  private promoTimer: number = 0;
  private promoSlideIndex: number = 0;
  private promoTextures: THREE.CanvasTexture[] = [];
  private dustParticles: THREE.Points | null = null;

  // Flying Add-to-Cart Projectiles (600ms flight arc)
  private activeProjectiles: {
    mesh: THREE.Mesh;
    start: THREE.Vector3;
    control: THREE.Vector3;
    end: THREE.Vector3;
    progress: number;
    duration: number;
  }[] = [];

  // Raycasting & Hover State
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private pointer: THREE.Vector2 = new THREE.Vector2(0, 0);
  private hoveredSlotId: string | null = null;
  private isPointerDown: boolean = false;
  private lastPointerX: number = 0;
  private lastPointerY: number = 0;

  // Store data
  private products: Product[] = INITIAL_PRODUCTS;
  private shelfSlots: ShelfSlot[] = INITIAL_SHELF_SLOTS;

  constructor(container: HTMLElement, callbacks: StoreSceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    // Detect reduced motion preference
    if (typeof window !== 'undefined') {
      this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

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

    if (this.isSoftwareGl) {
      this.quality = 'low';
    }

    // Initialize WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.88; // Balanced warm exposure (anti-overexposure)
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = this.quality !== 'low' && !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth, container.clientHeight);

    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    // Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#DFDACF');
    this.scene.fog = new THREE.FogExp2('#DFDACF', 0.015); // Soft warm depth fog

    this.camera = new THREE.PerspectiveCamera(
      this.baseFov,
      container.clientWidth / container.clientHeight,
      0.1,
      90
    );
    this.camera.position.copy(this.playerPos);

    // Studio Reflection Mapping
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    } catch (e) {
      console.warn('RoomEnvironment fallback', e);
    }

    this.setupLighting();
    this.buildStoreShell();
    this.buildCeilingTrussesAndScreens();
    this.buildAislesWith5LevelShelves();
    this.buildCheckoutCounters();
    this.buildDecorAndProps();
    this.buildDustParticles();
    this.buildFirstPersonCart();
    this.setupBeaconMesh();
    this.setupEventListeners();

    this.startLoop();

    if (this.callbacks.onSceneReady) {
      this.callbacks.onSceneReady();
    }
  }

  // 1. Studio Lighting Rig
  private setupLighting() {
    // Cool sky / warm ground fill
    const hemiLight = new THREE.HemisphereLight('#FFFFFF', '#CBD5E1', 1.05);
    this.scene.add(hemiLight);

    // Directional Key Light with soft shadows
    const dirLight = new THREE.DirectionalLight('#FFFBEB', 1.35);
    dirLight.position.set(12, 16, 10);
    dirLight.castShadow = this.quality !== 'low' && !this.isSoftwareGl;
    if (dirLight.castShadow) {
      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;
      dirLight.shadow.camera.near = 1;
      dirLight.shadow.camera.far = 50;
      const d = 22;
      dirLight.shadow.camera.left = -d;
      dirLight.shadow.camera.right = d;
      dirLight.shadow.camera.top = d;
      dirLight.shadow.camera.bottom = -d;
      dirLight.shadow.bias = -0.0004;
    }
    this.scene.add(dirLight);

    // Glowing Ceiling Light Panels down each aisle
    AISLE_CONFIG.forEach((aisle) => {
      const pointLight = new THREE.PointLight('#F8FAFC', 0.75, 14, 1.2);
      pointLight.position.set(aisle.x, 5.2, -4);
      this.scene.add(pointLight);
    });
  }

  // 2. Store Perimeter, Warm Floor & Entrance Doors
  private buildStoreShell() {
    const storeW = 40;
    const storeD = 30;
    const storeH = 5.6;

    // Warm light grey floor with faint reflection
    const floorGeo = new THREE.PlaneGeometry(storeW, storeD);
    const floorMat = new THREE.MeshStandardMaterial({
      map: TextureFactory.getFloorTexture(),
      roughness: 0.38, // Warm faint reflection (not harsh or mirror-like)
      metalness: 0.04,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = this.quality !== 'low';
    this.scene.add(floor);

    // Floor decals on central walk paths
    const decalTex = TextureFactory.getFloorDecalTexture();
    const decalMat = new THREE.MeshBasicMaterial({
      map: decalTex,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    for (const dz of [-4, 5]) {
      for (const dx of [-8, 0, 8]) {
        const decal = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), decalMat);
        decal.rotation.x = -Math.PI / 2;
        decal.position.set(dx, 0.015, dz);
        this.scene.add(decal);
      }
    }

    // Ceiling: Dark industrial navy #101A3A
    const ceilingGeo = new THREE.PlaneGeometry(storeW, storeD);
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: '#101A3A',
      roughness: 0.85,
    });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = storeH;
    this.scene.add(ceiling);

    // Ceiling Light Panels (Warm Glowing Panels #FFFDF8)
    const panelGeo = new THREE.BoxGeometry(4.2, 0.1, 0.6);
    const panelMat = new THREE.MeshBasicMaterial({ color: '#FFFDF8' });
    for (let x = -15; x <= 15; x += 6) {
      for (let z = -11; z <= 11; z += 5.5) {
        const panel = new THREE.Mesh(panelGeo, panelMat);
        panel.position.set(x, storeH - 0.06, z);
        this.scene.add(panel);
      }
    }

    // Outer Walls: Architectural Paper-coloured #EAE6DD with navy baseboard
    const wallMat = new THREE.MeshStandardMaterial({
      color: '#EAE6DD',
      roughness: 0.85,
    });
    const baseboardMat = new THREE.MeshStandardMaterial({
      color: '#101A3A',
      roughness: 0.5,
    });

    // North Wall (Back)
    const northWall = new THREE.Mesh(new THREE.BoxGeometry(storeW, storeH, 0.4), wallMat);
    northWall.position.set(0, storeH / 2, -storeD / 2);
    northWall.receiveShadow = this.quality !== 'low';
    this.scene.add(northWall);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(northWall));

    // East & West Walls
    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, storeH, storeD), wallMat);
    eastWall.position.set(storeW / 2, storeH / 2, 0);
    this.scene.add(eastWall);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(eastWall));

    const westWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, storeH, storeD), wallMat);
    westWall.position.set(-storeW / 2, storeH / 2, 0);
    this.scene.add(westWall);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(westWall));

    // South Entrance Wall (left and right portal wings)
    const southLeft = new THREE.Mesh(new THREE.BoxGeometry(15, storeH, 0.4), wallMat);
    southLeft.position.set(-12.5, storeH / 2, storeD / 2);
    this.scene.add(southLeft);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(southLeft));

    const southRight = new THREE.Mesh(new THREE.BoxGeometry(15, storeH, 0.4), wallMat);
    southRight.position.set(12.5, storeH / 2, storeD / 2);
    this.scene.add(southRight);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(southRight));

    // Sliding Glass Doors (Automatic 500ms glide)
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#93C5FD',
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
      metalness: 0.1,
      transmission: this.quality === 'low' ? 0 : 0.85,
      ior: 1.5,
    });

    const doorGeo = new THREE.BoxGeometry(3.2, 3.2, 0.08);
    this.slidingDoorLeft = new THREE.Mesh(doorGeo, glassMat);
    this.slidingDoorLeft.position.set(-1.6, 1.6, storeD / 2 - 0.2);
    this.scene.add(this.slidingDoorLeft);

    this.slidingDoorRight = new THREE.Mesh(doorGeo, glassMat);
    this.slidingDoorRight.position.set(1.6, 1.6, storeD / 2 - 0.2);
    this.scene.add(this.slidingDoorRight);
  }

  // 3. Ceiling Trusses, Promo Screens & Overhead Signage
  private buildCeilingTrussesAndScreens() {
    this.promoTextures = TextureFactory.getPromoScreenTextures();

    // Overhead truss steel beams
    const trussMat = new THREE.MeshStandardMaterial({
      color: '#1E293B',
      metalness: 0.75,
      roughness: 0.3,
    });

    for (const tz of [-9, -2, 5, 12]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(39, 0.15, 0.15), trussMat);
      beam.position.set(0, 5.0, tz);
      this.scene.add(beam);
    }

    // Welcome Screen above Entrance
    const welcomeGeo = new THREE.PlaneGeometry(8.5, 2.3);
    const welcomeMat = new THREE.MeshBasicMaterial({ map: this.promoTextures[0] });
    const welcomeScreen = new THREE.Mesh(welcomeGeo, welcomeMat);
    welcomeScreen.position.set(0, 4.1, 14.75);
    welcomeScreen.rotation.y = Math.PI; // Faces inwards to store
    this.scene.add(welcomeScreen);
    this.promoScreens.push(welcomeScreen);

    // Concourse Promo Billboard
    const promoGeo = new THREE.BoxGeometry(5.5, 1.8, 0.1);
    const promoMat = new THREE.MeshBasicMaterial({ map: this.promoTextures[1] });
    const promoMesh = new THREE.Mesh(promoGeo, promoMat);
    promoMesh.position.set(0, 4.2, 5.5);
    this.scene.add(promoMesh);
    this.promoScreens.push(promoMesh);
  }

  // 4. 8 Aisles with 5-Level 2.2m Shelves & End-Cap Displays
  private buildAislesWith5LevelShelves() {
    const uprightMat = new THREE.MeshStandardMaterial({
      color: '#101A3A', // Substantial matte navy upright columns
      roughness: 0.35,
      metalness: 0.65,
    });
    const shelfBoardMat = new THREE.MeshStandardMaterial({
      color: '#FAF9F6', // Solid paper-white shelf boards
      roughness: 0.3,
      metalness: 0.05,
    });
    const backPanelMat = new THREE.MeshStandardMaterial({
      color: '#ECE9E2', // Thick architectural back acoustic panel
      roughness: 0.7,
    });

    const rackLength = 12.0;
    const rackWidth = 1.45;
    const rackHeight = 2.2;
    const shelfLevels = [0.35, 0.75, 1.15, 1.55, 1.95]; // 5 levels!

    AISLE_CONFIG.forEach((aisle) => {
      const aisleGroup = new THREE.Group();
      aisleGroup.position.set(aisle.x, 0, aisle.z);

      // (a) Substantial Navy Vertical Uprights (0.09m thick structural posts)
      for (const zOff of [-5.8, -2.9, 0, 2.9, 5.8]) {
        for (const xOff of [-rackWidth / 2, rackWidth / 2]) {
          const post = new THREE.Mesh(
            new THREE.BoxGeometry(0.09, rackHeight, 0.09),
            uprightMat
          );
          post.position.set(xOff, rackHeight / 2, zOff);
          post.castShadow = this.quality !== 'low';
          aisleGroup.add(post);

          // Footing plate for realistic industrial weight
          const foot = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.04, 0.16),
            uprightMat
          );
          foot.position.set(xOff, 0.02, zOff);
          aisleGroup.add(foot);
        }
      }

      // (b) Solid Architectural Back Divider Panel (0.06m thick)
      const backPanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, rackHeight - 0.15, rackLength),
        backPanelMat
      );
      backPanel.position.set(0, rackHeight / 2, 0);
      aisleGroup.add(backPanel);

      // (c) 5 Horizontal Heavy-Duty Shelf Boards (0.05m thick)
      shelfLevels.forEach((yLevel) => {
        const board = new THREE.Mesh(
          new THREE.BoxGeometry(rackWidth + 0.1, 0.05, rackLength),
          shelfBoardMat
        );
        board.position.set(0, yLevel, 0);
        board.receiveShadow = this.quality !== 'low';
        aisleGroup.add(board);

        // Price ticket molding strip along outer shelf edges
        for (const side of [-1, 1]) {
          const ticketStrip = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.045, rackLength),
            new THREE.MeshBasicMaterial({ color: aisle.accentColor })
          );
          ticketStrip.position.set(side * (rackWidth / 2 + 0.05), yLevel - 0.005, 0);
          aisleGroup.add(ticketStrip);
        }
      });

      // (d) Top Canopy Trim Rail (at 2.2m)
      const canopy = new THREE.Mesh(
        new THREE.BoxGeometry(rackWidth + 0.14, 0.08, rackLength),
        uprightMat
      );
      canopy.position.set(0, 2.2, 0);
      aisleGroup.add(canopy);

      // (e) End-Cap Displays at both ends of each aisle (Z = -6.1 and +6.1)
      for (const endZ of [-6.1, 6.1]) {
        const endCapGroup = new THREE.Group();
        endCapGroup.position.set(0, 0, endZ);

        // End-cap shelf tray
        const endShelf = new THREE.Mesh(
          new THREE.BoxGeometry(rackWidth, 0.04, 0.7),
          shelfBoardMat
        );
        endShelf.position.set(0, 0.95, 0);
        endCapGroup.add(endShelf);

        // End-cap featured accent sign
        const endSignTex = TextureFactory.getEndCapSignTexture(aisle);
        const endSignMat = new THREE.MeshBasicMaterial({ map: endSignTex });
        const endSign = new THREE.Mesh(new THREE.BoxGeometry(rackWidth, 0.65, 0.05), endSignMat);
        endSign.position.set(0, 1.85, 0);
        if (endZ > 0) endSign.rotation.y = Math.PI;
        endCapGroup.add(endSign);

        aisleGroup.add(endCapGroup);
      }

      // (f) Hanging Double-Sided Category Sign (Readable from 15m)
      const signTex = TextureFactory.getAisleSignTexture(aisle);
      const signMat = new THREE.MeshBasicMaterial({ map: signTex });
      const signMesh = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.05, 0.08), signMat);
      signMesh.position.set(0, 3.45, 0);
      aisleGroup.add(signMesh);

      // Suspension cables
      for (const sx of [-1.2, 1.2]) {
        const cable = new THREE.Mesh(
          new THREE.CylinderGeometry(0.008, 0.008, 1.8),
          new THREE.MeshBasicMaterial({ color: '#64748B' })
        );
        cable.position.set(sx, 4.4, 0);
        aisleGroup.add(cable);
      }

      this.scene.add(aisleGroup);
      // Precise shelf rack collision box (0.9m wide x 11.6m long), leaving 3.1m wide open walkways between aisles
      const shelfCollisionBox = new THREE.Box3(
        new THREE.Vector3(aisle.x - 0.45, 0, aisle.z - 5.8),
        new THREE.Vector3(aisle.x + 0.45, 2.2, aisle.z + 5.8)
      );
      this.collisionBoxes.push(shelfCollisionBox);

      // Populate products on shelves
      this.populateProductsForAisle(aisle);
    });
  }

  // Populate product geometries according to packaging shapes using InstancedMesh
  private populateProductsForAisle(aisle: AisleInfo) {
    const slots = this.shelfSlots.filter((s) => s.aisleNumber === aisle.number);

    slots.forEach((slot) => {
      const prod = this.products.find((p) => p.id === slot.productId);
      if (!prod) return;

      const slotGroup = new THREE.Group();
      slotGroup.position.set(slot.x, slot.y, slot.z);

      // Substantial procedural packaging geometry matching prod.packageType
      const { geo, width, height, depth } = this.createPackageGeometry(prod.packageType);
      const tex = TextureFactory.getProductTexture(prod);

      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: prod.packageType === 'can' ? 0.25 : 0.45,
        metalness: prod.packageType === 'can' ? 0.7 : 0.05,
      });

      // InstancedMesh implementation: 6 physical facings per shelf slot (2 rows x 3 cols)
      const maxSlots = 6;
      const count = Math.max(0, Math.min(maxSlots, Math.ceil((slot.currentStock / slot.maxCapacity) * maxSlots)));

      const instancedMesh = new THREE.InstancedMesh(geo, mat, maxSlots);
      instancedMesh.castShadow = false;
      instancedMesh.receiveShadow = false;

      const dummy = new THREE.Object3D();
      for (let i = 0; i < maxSlots; i++) {
        const row = Math.floor(i / 3);
        const col = i % 3;
        dummy.position.set(
          (col - 1) * (width + 0.04),
          height / 2,
          (row - 0.5) * (depth + 0.04)
        );
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
      }
      instancedMesh.count = count;
      instancedMesh.instanceMatrix.needsUpdate = true;
      slotGroup.add(instancedMesh);
      this.instancedMeshMap.set(slot.id, instancedMesh);

      // Invisible Raycast Proxy
      const proxyGeo = new THREE.BoxGeometry(1.05, height + 0.1, 0.6);
      const proxyMat = new THREE.MeshBasicMaterial({
        color: '#5B3DF5',
        transparent: true,
        opacity: 0.0,
      });
      const proxy = new THREE.Mesh(proxyGeo, proxyMat);
      proxy.position.set(0, height / 2 + 0.05, 0);
      proxy.userData = { slotId: slot.id, productId: prod.id };
      slotGroup.add(proxy);
      this.interactiveMeshes.push(proxy);
      this.slotMeshMap.set(slot.id, proxy);

      // Stock Ring Indicator (for Manager Mode)
      const ringGeo = new THREE.RingGeometry(0.14, 0.18, 24);
      const ringColor = slot.currentStock <= 2 ? '#FF5A4D' : slot.currentStock <= slot.reorderThreshold ? '#F59E0B' : '#19C39A';
      const ringMat = new THREE.MeshBasicMaterial({
        color: ringColor,
        side: THREE.DoubleSide,
      });
      const stockRing = new THREE.Mesh(ringGeo, ringMat);
      stockRing.rotation.x = -Math.PI / 2;
      stockRing.position.set(0, 0.02, 0.34);
      stockRing.visible = this.isManagerMode;
      slotGroup.add(stockRing);
      this.stockRingMap.set(slot.id, stockRing);

      // Low Stock Pulsing Coral Marker (if stock <= 2)
      if (slot.currentStock <= 2) {
        const markerGeo = new THREE.BoxGeometry(0.24, 0.07, 0.02);
        const markerMat = new THREE.MeshBasicMaterial({ color: '#FF5A4D' }); // Coral
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.position.set(0, height + 0.12, 0.3);
        slotGroup.add(marker);
        this.lowStockBeaconMap.set(slot.id, marker);
      }

      this.scene.add(slotGroup);
    });
  }

  // 7 Substantial Packaging Geometries (~35% larger, fully filling shelves)
  private createPackageGeometry(type: string): { geo: THREE.BufferGeometry; width: number; height: number; depth: number } {
    switch (type) {
      case 'bottle':
        return { geo: new THREE.CylinderGeometry(0.095, 0.1, 0.44, 16), width: 0.2, height: 0.44, depth: 0.2 };
      case 'can':
        return { geo: new THREE.CylinderGeometry(0.085, 0.085, 0.34, 16), width: 0.17, height: 0.34, depth: 0.17 };
      case 'tube':
        return { geo: new THREE.CylinderGeometry(0.065, 0.09, 0.32, 12), width: 0.18, height: 0.32, depth: 0.14 };
      case 'bag':
        return { geo: new THREE.BoxGeometry(0.28, 0.42, 0.16), width: 0.28, height: 0.42, depth: 0.16 };
      case 'jar':
        return { geo: new THREE.CylinderGeometry(0.115, 0.115, 0.24, 16), width: 0.23, height: 0.24, depth: 0.23 };
      case 'folded_clothes':
        return { geo: new THREE.BoxGeometry(0.34, 0.15, 0.28), width: 0.34, height: 0.15, depth: 0.28 };
      case 'box':
      default:
        return { geo: new THREE.BoxGeometry(0.28, 0.38, 0.2), width: 0.28, height: 0.38, depth: 0.2 };
    }
  }

  // 5. 4 Numbered Checkout Lanes (Matte navy with light fronts, compact scale)
  private buildCheckoutCounters() {
    const laneXPositions = [-9.5, -3.2, 3.2, 9.5];
    const laneZ = 9.8;

    // Matte navy base #101A3A with light front panel #F7F6F2
    const counterBodyMat = new THREE.MeshStandardMaterial({
      color: '#101A3A',
      roughness: 0.75, // Deep matte navy (not shiny or saturated)
      metalness: 0.05,
    });
    const frontPanelMat = new THREE.MeshStandardMaterial({
      color: '#F7F6F2',
      roughness: 0.45,
      metalness: 0.02,
    });

    laneXPositions.forEach((xPos, idx) => {
      const laneGroup = new THREE.Group();
      laneGroup.position.set(xPos, 0, laneZ);

      // Matte Navy Counter Body (Compact & refined: 1.85m wide x 0.86m tall x 3.4m long)
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.86, 3.4), counterBodyMat);
      body.position.set(0, 0.43, 0);
      body.castShadow = this.quality !== 'low';
      laneGroup.add(body);

      // Light Front Kickplate (#F7F6F2)
      const frontPlate = new THREE.Mesh(new THREE.BoxGeometry(1.87, 0.82, 0.04), frontPanelMat);
      frontPlate.position.set(0, 0.43, 1.7);
      laneGroup.add(frontPlate);

      // Motorized Conveyor Belt (Ribbed matte rubber)
      const beltGeo = new THREE.PlaneGeometry(0.85, 2.4);
      const beltMat = new THREE.MeshStandardMaterial({
        map: TextureFactory.getConveyorBeltTexture(),
        roughness: 0.8,
      });
      const belt = new THREE.Mesh(beltGeo, beltMat);
      belt.rotation.x = -Math.PI / 2;
      belt.position.set(-0.35, 0.87, -0.2);
      laneGroup.add(belt);
      this.conveyorBelts.push(belt);

      // Conveyor Side Rails
      for (const rx of [-0.8, 0.1]) {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.08, 2.4),
          new THREE.MeshStandardMaterial({ color: '#64748B', metalness: 0.7 })
        );
        rail.position.set(rx, 0.89, -0.2);
        laneGroup.add(rail);
      }

      // Scanner Glass & Red Laser Bar
      const scanner = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.03, 0.34),
        new THREE.MeshBasicMaterial({ color: '#E11D48' })
      );
      scanner.position.set(-0.35, 0.88, 1.05);
      laneGroup.add(scanner);

      // Touchscreen POS Terminal & Card Reader
      const terminalStand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.4),
        new THREE.MeshStandardMaterial({ color: '#1E293B', metalness: 0.8 })
      );
      terminalStand.position.set(0.5, 1.06, 0.85);
      laneGroup.add(terminalStand);

      const posScreen = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.28, 0.03),
        new THREE.MeshBasicMaterial({ color: '#0369A1' })
      );
      posScreen.position.set(0.5, 1.32, 0.85);
      posScreen.rotation.y = -Math.PI / 5;
      laneGroup.add(posScreen);

      // Contactless Pin Pad Card Reader with green status indicator
      const pinPad = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.05, 0.22),
        new THREE.MeshStandardMaterial({ color: '#334155' })
      );
      pinPad.position.set(0.5, 0.91, 0.45);
      laneGroup.add(pinPad);

      const nfcLed = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.01),
        new THREE.MeshBasicMaterial({ color: '#19C39A' })
      );
      nfcLed.position.set(0.5, 0.94, 0.45);
      laneGroup.add(nfcLed);

      // Receipt Printer
      const printer = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.16, 0.2),
        new THREE.MeshStandardMaterial({ color: '#1E293B' })
      );
      printer.position.set(0.5, 0.94, 1.25);
      laneGroup.add(printer);

      // Numbered Overhead Lane Sign (Lanes 1 to 4)
      const signCanvas = document.createElement('canvas');
      signCanvas.width = 256;
      signCanvas.height = 256;
      const sCtx = signCanvas.getContext('2d')!;
      sCtx.fillStyle = '#101A3A';
      sCtx.fillRect(0, 0, 256, 256);
      sCtx.strokeStyle = '#5B3DF5'; // Omega violet
      sCtx.lineWidth = 10;
      sCtx.strokeRect(8, 8, 240, 240);
      sCtx.fillStyle = '#FFFFFF';
      sCtx.font = 'bold 120px "Sora", sans-serif';
      sCtx.textAlign = 'center';
      sCtx.textBaseline = 'middle';
      sCtx.fillText(String(idx + 1), 128, 105);
      sCtx.font = 'bold 26px "Sora", sans-serif';
      sCtx.fillStyle = '#19C39A'; // Mint
      sCtx.fillText('OPEN', 128, 195);

      const signTex = new THREE.CanvasTexture(signCanvas);
      signTex.colorSpace = THREE.SRGBColorSpace;
      const laneSign = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.7, 0.06),
        new THREE.MeshBasicMaterial({ map: signTex })
      );
      laneSign.position.set(0, 3.2, 0);
      laneGroup.add(laneSign);

      // Station Cashier NPC Alex at Lane 1 behind scanner & POS terminal
      if (idx === 0) {
        this.cashierNPC = new CashierNPC();
        this.cashierNPC.group.position.set(0.52, 0, 0.95);
        this.cashierNPC.group.rotation.y = -2.43; // Facing customer station and conveyor belt
        laneGroup.add(this.cashierNPC.group);
      }

      this.scene.add(laneGroup);
      // Tight collision box for counter desk (1.2m wide x 2.2m long), leaving 4.5m open corridor
      const counterBox = new THREE.Box3(
        new THREE.Vector3(xPos - 0.6, 0, laneZ - 1.1),
        new THREE.Vector3(xPos + 0.6, 1.2, laneZ + 1.1)
      );
      this.collisionBoxes.push(counterBox);
    });
  }

  // 6. Architectural Pillars, Plants, and Cart Park
  private buildDecorAndProps() {
    const pillarMat = new THREE.MeshStandardMaterial({
      color: '#F7F6F2',
      roughness: 0.5,
    });
    const pillarTrimMat = new THREE.MeshStandardMaterial({
      color: '#101A3A',
      roughness: 0.3,
    });

    // 4 Structural Pillars
    const pillarPositions = [
      { x: -12, z: 6 },
      { x: 12, z: 6 },
      { x: -12, z: -8 },
      { x: 12, z: -8 },
    ];

    pillarPositions.forEach((pos) => {
      const pillarGroup = new THREE.Group();
      pillarGroup.position.set(pos.x, 0, pos.z);

      const col = new THREE.Mesh(new THREE.BoxGeometry(0.8, 5.6, 0.8), pillarMat);
      col.position.y = 2.8;
      col.castShadow = this.quality !== 'low';
      pillarGroup.add(col);

      // Navy base trim
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 0.9), pillarTrimMat);
      trim.position.y = 0.2;
      pillarGroup.add(trim);

      this.scene.add(pillarGroup);
      this.collisionBoxes.push(new THREE.Box3().setFromObject(pillarGroup));
    });

    // Indoor Potted Plants (Low-poly ficus / palms)
    const plantPositions = [
      { x: -16, z: 12 },
      { x: 16, z: 12 },
      { x: -16, z: -12 },
      { x: 16, z: -12 },
    ];

    plantPositions.forEach((pos) => {
      const plantGroup = new THREE.Group();
      plantGroup.position.set(pos.x, 0, pos.z);

      // Matte ceramic planter pot
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.26, 0.65, 16),
        new THREE.MeshStandardMaterial({ color: '#E2E8F0', roughness: 0.4 })
      );
      pot.position.y = 0.325;
      plantGroup.add(pot);

      // Foliage stems and leaves
      const leafMat = new THREE.MeshStandardMaterial({
        color: '#15803D',
        roughness: 0.5,
        side: THREE.DoubleSide,
      });
      for (let i = 0; i < 7; i++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.85, 4), leafMat);
        const angle = (i / 7) * Math.PI * 2;
        leaf.position.set(Math.cos(angle) * 0.16, 0.85 + (i % 2) * 0.15, Math.sin(angle) * 0.16);
        leaf.rotation.z = Math.cos(angle) * 0.35;
        leaf.rotation.x = Math.sin(angle) * 0.35;
        plantGroup.add(leaf);
      }

      this.scene.add(plantGroup);
      this.collisionBoxes.push(new THREE.Box3().setFromObject(plantGroup));
    });

    // Cart Park near Entrance (Nested shopping carts)
    const cartParkGroup = new THREE.Group();
    cartParkGroup.position.set(-8.5, 0, 13.2);

    const wireMat = new THREE.MeshStandardMaterial({
      color: '#94A3B8',
      roughness: 0.25,
      metalness: 0.85,
    });
    const handleMat = new THREE.MeshStandardMaterial({
      color: '#101A3A',
      roughness: 0.3,
    });

    for (let c = 0; c < 5; c++) {
      const nestedCart = new THREE.Group();
      nestedCart.position.set(0, 0, -c * 0.55);

      const basket = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.8), wireMat);
      basket.position.set(0, 0.65, 0);
      nestedCart.add(basket);

      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.75), handleMat);
      handle.rotation.z = Math.PI / 2;
      handle.position.set(0, 0.98, -0.4);
      nestedCart.add(handle);

      cartParkGroup.add(nestedCart);
    }

    this.scene.add(cartParkGroup);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(cartParkGroup));
  }

  // 7. Ambient Dust Motes / Particles drifting under light beams
  private buildDustParticles() {
    if (this.quality === 'low') return;

    const particleCount = 180;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 36;
      positions[i + 1] = Math.random() * 4.5 + 0.5;
      positions[i + 2] = (Math.random() - 0.5) * 26;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: '#FFFFFF',
      size: 0.045,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    });

    this.dustParticles = new THREE.Points(geometry, material);
    this.scene.add(this.dustParticles);
  }



  // 9. First-Person Shopping Cart (pinned to bottom of camera)
  private buildFirstPersonCart() {
    this.cartGroup = new THREE.Group();

    const handleMat = new THREE.MeshStandardMaterial({
      color: '#101A3A', // Navy
      roughness: 0.35,
      metalness: 0.3,
    });
    const wireMat = new THREE.MeshStandardMaterial({
      color: '#94A3B8',
      roughness: 0.2,
      metalness: 0.85,
    });

    // Ergonomic horizontal handle bar
    const handleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.82, 16), handleMat);
    handleBar.rotation.z = Math.PI / 2;
    handleBar.position.set(0, 0, 0);
    this.cartGroup.add(handleBar);

    // Diagonal frame struts
    for (const sx of [-0.38, 0.38]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.65, 12), wireMat);
      strut.rotation.x = Math.PI / 5;
      strut.position.set(sx, -0.2, -0.22);
      this.cartGroup.add(strut);
    }

    // Front wire basket rim
    const rimFront = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.78, 12), wireMat);
    rimFront.rotation.z = Math.PI / 2;
    rimFront.position.set(0, -0.36, -0.5);
    this.cartGroup.add(rimFront);

    this.cartGroup.position.set(0, -0.44, -0.8);
    this.camera.add(this.cartGroup);
    this.scene.add(this.camera);
  }

  // 10. Search Beacon Pulse Ring
  private setupBeaconMesh() {
    const geo = new THREE.RingGeometry(0.4, 0.55, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: '#5B3DF5', // Omega violet
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    this.pulseBeaconMesh = new THREE.Mesh(geo, mat);
    this.pulseBeaconMesh.rotation.x = -Math.PI / 2;
    this.pulseBeaconMesh.visible = false;
    this.scene.add(this.pulseBeaconMesh);
  }

  // Pulse a specific shelf slot (when user searches)
  public pulseSlot(slotId: string) {
    const proxy = this.slotMeshMap.get(slotId);
    if (!proxy) return;
    this.pulsedSlotMesh = proxy;
    this.pulseTime = 0;
    if (this.pulseBeaconMesh) {
      this.pulseBeaconMesh.position.set(proxy.parent!.position.x, 0.05, proxy.parent!.position.z);
      this.pulseBeaconMesh.visible = true;
    }
  }

  // Manager Mode Toggle
  public setManagerMode(active: boolean) {
    this.isManagerMode = active;
    this.stockRingMap.forEach((ring) => {
      ring.visible = active;
    });
  }

  // Update Stock on 3D shelf
  public updateSlotStock(slotId: string, newStock: number) {
    const slot = this.shelfSlots.find((s) => s.id === slotId);
    if (!slot) return;
    slot.currentStock = Math.max(0, newStock);

    // Update InstancedMesh visible count
    const instanced = this.instancedMeshMap.get(slotId);
    if (instanced) {
      const maxSlots = 6;
      const count = Math.max(0, Math.min(maxSlots, Math.ceil((slot.currentStock / slot.maxCapacity) * maxSlots)));
      instanced.count = count;
      instanced.instanceMatrix.needsUpdate = true;
    }

    // Update stock ring color
    const ring = this.stockRingMap.get(slotId);
    if (ring) {
      const ringColor = slot.currentStock <= 2 ? '#FF5A4D' : slot.currentStock <= slot.reorderThreshold ? '#F59E0B' : '#19C39A';
      (ring.material as THREE.MeshBasicMaterial).color.set(ringColor);
    }

    // Update coral beacon marker
    let beacon = this.lowStockBeaconMap.get(slotId);
    if (slot.currentStock <= 2) {
      if (!beacon) {
        const proxy = this.slotMeshMap.get(slotId);
        if (proxy && proxy.parent) {
          const markerGeo = new THREE.BoxGeometry(0.24, 0.07, 0.02);
          const markerMat = new THREE.MeshBasicMaterial({ color: '#FF5A4D' });
          beacon = new THREE.Mesh(markerGeo, markerMat);
          beacon.position.set(0, 0.45, 0.3);
          proxy.parent.add(beacon);
          this.lowStockBeaconMap.set(slotId, beacon);
        }
      }
    } else if (beacon && beacon.parent) {
      beacon.parent.remove(beacon);
      this.lowStockBeaconMap.delete(slotId);
    }
  }

  // Toggle visual effects (bloom, contact shadows, dust drift)
  public toggleEffects(enabled?: boolean) {
    this.effectsEnabled = enabled !== undefined ? enabled : !this.effectsEnabled;
    if (this.renderer) {
      this.renderer.shadowMap.enabled = this.effectsEnabled && this.quality !== 'low' && !this.isSoftwareGl;
    }
    if (this.dustParticles) {
      this.dustParticles.visible = this.effectsEnabled;
    }
  }

  // 600ms Add-to-Cart Flight Arc Animation
  public spawnAddToCartFlight(slotId: string) {
    const slot = this.shelfSlots.find((s) => s.id === slotId);
    const prod = this.products.find((p) => p.id === slot?.productId);
    if (!slot || !prod) return;

    sound.playAddToCartPop();

    const projGeo = new THREE.BoxGeometry(0.18, 0.22, 0.14);
    const projMat = new THREE.MeshStandardMaterial({
      color: prod.baseColor,
      roughness: 0.35,
      metalness: 0.2,
    });
    const proj = new THREE.Mesh(projGeo, projMat);

    const start = new THREE.Vector3(slot.x, slot.y + 0.15, slot.z);
    const end = this.camera.position.clone().add(
      this.camera.getWorldDirection(_camDir).multiplyScalar(0.75)
    );
    end.y -= 0.3;

    const control = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    control.y += 1.6; // High curved arc

    this.scene.add(proj);
    this.activeProjectiles.push({
      mesh: proj,
      start,
      control,
      end,
      progress: 0,
      duration: 0.6, // 600 ms as specified
    });
  }

  // Smooth Camera Glide (with pitch and callback support)
  public glideTo(
    targetX: number,
    targetZ: number,
    targetYaw?: number,
    onFinish?: () => void,
    targetPitch?: number,
    durationSec?: number
  ) {
    if (this.prefersReducedMotion) {
      this.playerPos.set(targetX, 1.65, targetZ);
      if (targetYaw !== undefined) this.yaw = targetYaw;
      if (targetPitch !== undefined) this.pitch = targetPitch;
      this.camera.position.copy(this.playerPos);
      this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
      if (onFinish) onFinish();
      return;
    }

    this.isGliding = true;
    this.glideTime = 0;
    this.glideDuration = durationSec || 0.9;
    this.glideStartPos.copy(this.playerPos);
    this.glideTargetPos.set(targetX, 1.65, targetZ);
    this.glideStartYaw = this.yaw;
    this.glideTargetYaw = targetYaw !== undefined ? targetYaw : this.yaw;
    this.glideStartPitch = this.pitch;
    this.glideTargetPitch = targetPitch !== undefined ? targetPitch : this.pitch;
    this.glideCallback = onFinish || null;
  }

  public glideToAisle(aisleNumber: number) {
    const aisle = AISLE_CONFIG.find((a) => a.number === aisleNumber);
    if (!aisle) return;
    this.glideTo(aisle.x, 3.2, Math.PI);
  }

  public glideToCheckout(laneNumber: number = 1) {
    const laneX = [-9.5, -3.2, 3.2, 9.5][laneNumber - 1] || -9.5;
    this.glideTo(laneX - 1.15, 8.8, -2.42, undefined, -0.28, 1.1);
  }

  public glideToProduct(productId: string) {
    const slot = this.shelfSlots.find((s) => s.productId === productId);
    if (!slot) return;
    const standZ = slot.z;
    const standX = slot.x > 0 ? slot.x - 1.4 : slot.x + 1.4;
    const targetYaw = slot.x > 0 ? -Math.PI / 2 : Math.PI / 2;
    this.glideTo(standX, standZ, targetYaw);
    this.pulseSlot(slot.id);
  }

  // Orchestrated 3D Checkout Experience: Walk to counter, products fly out onto conveyor, NPC scans them!
  public startCheckoutSequence(
    cartItems: CartItem[],
    onStep: (stepMsg: string, scannedCount: number, currentItem?: CartItem) => void,
    onComplete: () => void
  ): () => void {
    this.cancelCheckoutSequence();
    this.checkoutSequenceActive = true;

    // Unroll cart items into separate individual packages (up to 8 items max for snappy sequence)
    const unrolledItems: CartItem[] = [];
    for (const item of cartItems) {
      const count = Math.min(item.quantity, 3);
      for (let q = 0; q < count; q++) {
        unrolledItems.push({ product: item.product, quantity: 1 });
        if (unrolledItems.length >= 8) break;
      }
      if (unrolledItems.length >= 8) break;
    }

    if (unrolledItems.length === 0) {
      onComplete();
      return () => {};
    }

    // Step 1: Smoothly glide & walk player to Checkout Lane 1 customer station
    // Customer position: x = -10.65, z = 8.8, facing counter & Cashier Alex (yaw = -2.42, pitch = -0.28)
    const customerStationX = -10.65;
    const customerStationZ = 8.8;
    const targetYaw = -2.42; // Points towards +X (+1.15) and +Z (+1.30) directly facing Lane 1 counter & Cashier Alex
    const targetPitch = -0.28; // Looking slightly down (-16 deg) so conveyor belt, products, and cashier face are all centered

    const distToCheckout = Math.hypot(this.playerPos.x - customerStationX, this.playerPos.z - customerStationZ);
    const glideTime = Math.min(1.8, Math.max(0.8, distToCheckout / 8.5));

    onStep('Walking towards Checkout Lane 1 counter...', 0);

    this.glideTo(customerStationX, customerStationZ, targetYaw, () => {
      if (!this.checkoutSequenceActive) return;

      // Arrived at counter! Cashier Alex greets customer
      this.cashierNPC?.setState('greeting');
      sound.playDoorWhoosh();
      onStep('Alex: "Hello! Welcome to Lane 1. Let me scan your cart items..."', 0);

      // After 750ms greeting, begin sending items flying out of cart onto conveyor belt
      const greetTimer = setTimeout(() => {
        if (!this.checkoutSequenceActive) return;

        let scannedCount = 0;
        const totalCount = unrolledItems.length;

        unrolledItems.forEach((cartItem, idx) => {
          const itemTimer = setTimeout(() => {
            if (!this.checkoutSequenceActive) return;

            // Spawn 3D package geometry matching product
            const { geo } = this.createPackageGeometry(cartItem.product.packageType);
            const tex = TextureFactory.getProductTexture(cartItem.product);
            const mat = new THREE.MeshStandardMaterial({
              map: tex,
              roughness: 0.4,
              metalness: cartItem.product.packageType === 'can' ? 0.6 : 0.05,
            });
            const itemMesh = new THREE.Mesh(geo, mat);
            itemMesh.scale.set(0.85, 0.85, 0.85);

            // Compute start position directly from current camera frustum (bottom-left of screen where player cart is)
            const forward = new THREE.Vector3();
            this.camera.getWorldDirection(forward);
            const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();

            const start = this.camera.position.clone()
              .addScaledVector(forward, 0.72)
              .addScaledVector(right, -0.34);
            start.y -= 0.32;

            // Lane 1 conveyor belt in world space: X = -9.85, Y = 0.90, Z centered along belt
            const end = new THREE.Vector3(
              -9.85,
              0.90,
              9.1 + ((idx * 0.16) % 0.8)
            );

            const control = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
            control.y += 0.85; // Crisp, visible parabolic arc in front of the camera

            this.scene.add(itemMesh);
            this.checkoutSequenceMeshes.push(itemMesh);

            // Pop sound as item leaves cart
            sound.playAddToCartPop();

            this.checkoutConveyorFlightItems.push({
              mesh: itemMesh,
              start,
              control,
              end,
              progress: 0,
              duration: 0.52,
              onLand: () => {
                if (!this.checkoutSequenceActive) return;

                scannedCount++;

                // Cashier Alex aims scanner gun at item & fires laser
                this.cashierNPC?.setState('scanning');
                this.cashierNPC?.setScanTarget(end);
                this.cashierNPC?.triggerLaserPulse(0.4);

                // Barcode scanner beep!
                sound.playScanBeep();

                // Conveyor belt advances forward
                if (this.conveyorBelts.length > 0 && this.conveyorBelts[0].material) {
                  const m = this.conveyorBelts[0].material as any;
                  if (m.map) m.map.offset.y += 0.35;
                }

                // Item slides down belt toward packing area
                const slideTimer = setTimeout(() => {
                  if (itemMesh && itemMesh.parent) {
                    itemMesh.position.z += 0.55;
                  }
                }, 220);
                this.checkoutSequenceTimers.push(slideTimer);

                const price = cartItem.product.isSale && cartItem.product.salePrice
                  ? cartItem.product.salePrice
                  : cartItem.product.price;
                onStep(`Alex scanned: ${cartItem.product.name} ($${price.toFixed(2)})`, scannedCount, cartItem);

                // If this is the last item:
                if (scannedCount >= totalCount) {
                  const wrapTimer = setTimeout(() => {
                    if (!this.checkoutSequenceActive) return;

                    // Cashier finishes, points to card terminal
                    this.cashierNPC?.setState('done');
                    this.cashierNPC?.setScanTarget(null);
                    onStep('All items scanned! Total ready for payment.', totalCount);

                    const finishTimer = setTimeout(() => {
                      if (!this.checkoutSequenceActive) return;
                      this.cleanCheckoutMeshes();
                      this.checkoutSequenceActive = false;
                      this.cashierNPC?.setState('idle');
                      onComplete();
                    }, 850);
                    this.checkoutSequenceTimers.push(finishTimer);
                  }, 450);
                  this.checkoutSequenceTimers.push(wrapTimer);
                }
              },
            });
          }, idx * 650);

          this.checkoutSequenceTimers.push(itemTimer);
        });
      }, 750);
      this.checkoutSequenceTimers.push(greetTimer);
    }, targetPitch, glideTime);

    return () => {
      this.cancelCheckoutSequence();
      onComplete();
    };
  }

  public cancelCheckoutSequence() {
    this.checkoutSequenceActive = false;
    this.checkoutSequenceTimers.forEach((t) => clearTimeout(t));
    this.checkoutSequenceTimers = [];
    this.checkoutConveyorFlightItems = [];
    this.cleanCheckoutMeshes();
    if (this.cashierNPC) {
      this.cashierNPC.setState('idle');
      this.cashierNPC.setScanTarget(null);
    }
  }

  private cleanCheckoutMeshes() {
    this.checkoutSequenceMeshes.forEach((mesh) => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else if (mesh.material) {
        mesh.material.dispose();
      }
    });
    this.checkoutSequenceMeshes = [];
  }

  // Input Handling
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
    if (e.shiftKey) this.keysHeld['Shift'] = true;
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysHeld[e.code] = false;
    this.keysHeld[e.key.toLowerCase()] = false;
    if (!e.shiftKey) this.keysHeld['Shift'] = false;
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.isPointerDown = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.checkRaycastClick(e);
    }
  };

  private handleMouseMove = (e: MouseEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.isPointerDown && !this.isGliding && !this.checkoutSequenceActive) {
      const deltaX = e.clientX - this.lastPointerX;
      const deltaY = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;

      const sens = 0.0035;
      this.yaw -= deltaX * sens;
      this.pitch -= deltaY * sens;
      this.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.pitch));
    }

    // Raycast hover check
    this.checkRaycastHover(e);
  };

  private handleMouseUp = () => {
    this.isPointerDown = false;
  };

  // Mobile Touch Controls
  private touchStartX: number = 0;
  private touchStartY: number = 0;

  private handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      this.touchStartX = t.clientX;
      this.touchStartY = t.clientY;
      this.isPointerDown = true;
      this.lastPointerX = t.clientX;
      this.lastPointerY = t.clientY;
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    if (this.isPointerDown && e.touches.length === 1 && !this.isGliding && !this.checkoutSequenceActive) {
      e.preventDefault();
      const t = e.touches[0];
      const deltaX = t.clientX - this.lastPointerX;
      const deltaY = t.clientY - this.lastPointerY;
      this.lastPointerX = t.clientX;
      this.lastPointerY = t.clientY;

      const sens = 0.0045;
      this.yaw -= deltaX * sens;
      this.pitch -= deltaY * sens;
      this.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.pitch));
    }
  };

  private handleTouchEnd = (e: TouchEvent) => {
    this.isPointerDown = false;
    if (e.changedTouches.length > 0) {
      const t = e.changedTouches[0];
      const dist = Math.hypot(t.clientX - this.touchStartX, t.clientY - this.touchStartY);
      if (dist < 12) {
        this.checkRaycastClick(t as any);
      }
    }
  };

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

  private checkRaycastClick(e: { clientX: number; clientY: number }) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const py = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(px, py), this.camera);
    const hits = this.raycaster.intersectObjects(this.interactiveMeshes, false);

    if (hits.length > 0) {
      const hit = hits[0].object as THREE.Mesh;
      const slotId = hit.userData.slotId;
      const productId = hit.userData.productId;
      if (slotId && productId) {
        const slot = this.shelfSlots.find((s) => s.id === slotId);
        const prod = this.products.find((p) => p.id === productId);
        if (slot && prod) {
          sound.playScanBeep();
          this.callbacks.onProductClick(prod, slot);
        }
      }
    }
  }

  private checkRaycastHover(e: MouseEvent) {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactiveMeshes, false);

    if (hits.length > 0) {
      const hit = hits[0].object as THREE.Mesh;
      const slotId = hit.userData.slotId;
      if (slotId !== this.hoveredSlotId) {
        this.hoveredSlotId = slotId;
        this.renderer.domElement.style.cursor = 'pointer';
        const slot = this.shelfSlots.find((s) => s.id === slotId);
        const prod = this.products.find((p) => p.id === slot?.productId);
        if (this.callbacks.onProductHover && prod && slot) {
          this.callbacks.onProductHover(prod, slot, { x: e.clientX, y: e.clientY });
        }
      }
    } else if (this.hoveredSlotId !== null) {
      this.hoveredSlotId = null;
      this.renderer.domElement.style.cursor = 'default';
      if (this.callbacks.onProductHover) {
        this.callbacks.onProductHover(null, null);
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

  // Player Physics, Walking Bob & FOV Widening
  private updatePlayer(dt: number) {
    if (this.isGliding) {
      this.glideTime += dt;
      const t = Math.min(1, this.glideTime / this.glideDuration);
      // Smooth ease in-out
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      this.playerPos.lerpVectors(this.glideStartPos, this.glideTargetPos, ease);

      // Shortest path angle lerp for seamless rotation
      let yawDiff = (this.glideTargetYaw - this.glideStartYaw) % (Math.PI * 2);
      if (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      if (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      this.yaw = this.glideStartYaw + yawDiff * ease;

      this.pitch = THREE.MathUtils.lerp(this.glideStartPitch, this.glideTargetPitch, ease);

      if (t >= 1) {
        this.isGliding = false;
        if (this.glideCallback) {
          const cb = this.glideCallback;
          this.glideCallback = null;
          cb();
        }
      }
      this.camera.position.copy(this.playerPos);
      this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
      return;
    }

    // Lock player during cinematic checkout sequence
    if (this.checkoutSequenceActive) {
      this.playerVelocity.set(0, 0, 0);
      this.camera.position.set(this.playerPos.x, 1.65, this.playerPos.z);
      this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
      return;
    }

    // Input Movement
    const isRunning = (this.keysHeld['Shift'] || this.keysHeld['ShiftLeft'] || this.keysHeld['ShiftRight']) && !this.prefersReducedMotion;
    const moveX = (this.keysHeld['KeyD'] || this.keysHeld['ArrowRight'] ? 1 : 0) -
                  (this.keysHeld['KeyA'] || this.keysHeld['ArrowLeft'] ? 1 : 0);
    const moveZ = (this.keysHeld['KeyS'] || this.keysHeld['ArrowDown'] ? 1 : 0) -
                  (this.keysHeld['KeyW'] || this.keysHeld['ArrowUp'] ? 1 : 0);

    const baseSpeed = 4.6; // m/s
    const speed = isRunning ? baseSpeed * 1.7 : baseSpeed;

    _moveDir.set(moveX, 0, moveZ);
    const isMoving = _moveDir.lengthSq() > 0;

    if (isMoving) {
      _moveDir.normalize();
      _moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

      this.playerVelocity.x = THREE.MathUtils.damp(this.playerVelocity.x, _moveDir.x * speed, 12, dt);
      this.playerVelocity.z = THREE.MathUtils.damp(this.playerVelocity.z, _moveDir.z * speed, 12, dt);

      // Walking Head-Bob (2 cm as specified)
      if (!this.prefersReducedMotion) {
        this.walkBobTime += dt * (isRunning ? 13 : 9);
        if (Math.sin(this.walkBobTime) > 0.95 && Math.sin(this.walkBobTime - dt * 9) <= 0.95) {
          sound.playFootstep();
        }
      }
    } else {
      this.playerVelocity.x = THREE.MathUtils.damp(this.playerVelocity.x, 0, 14, dt);
      this.playerVelocity.z = THREE.MathUtils.damp(this.playerVelocity.z, 0, 14, dt);
    }

    // Dynamic FOV widening (3 degrees while moving/running)
    const targetFov = isMoving ? (isRunning ? this.baseFov + 4.5 : this.baseFov + 3.0) : this.baseFov;
    this.currentFov = THREE.MathUtils.damp(this.currentFov, targetFov, 6, dt);
    if (Math.abs(this.camera.fov - this.currentFov) > 0.05) {
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }

    // AABB Collision Detection with Smooth Sliding
    const nextX = this.playerPos.x + this.playerVelocity.x * dt;
    const nextZ = this.playerPos.z + this.playerVelocity.z * dt;
    const r = 0.28; // Nimble player collision radius

    let allowedX = Math.max(-19.0 + r, Math.min(19.0 - r, nextX));
    let allowedZ = Math.max(-14.0 + r, Math.min(14.0 - r, nextZ));

    const testBox = new THREE.Box3();
    for (const box of this.collisionBoxes) {
      testBox.copy(box);
      testBox.expandByScalar(r);

      // Check X motion against obstacle
      if (testBox.containsPoint(_vec3.set(allowedX, 1.0, this.playerPos.z))) {
        allowedX = this.playerPos.x;
      }
      // Check Z motion independently against obstacle (allows smooth wall sliding!)
      if (testBox.containsPoint(_vec3.set(allowedX, 1.0, allowedZ))) {
        allowedZ = this.playerPos.z;
      }
    }

    this.playerPos.x = allowedX;
    this.playerPos.z = allowedZ;

    // Apply 2cm head bob
    const bobOffset = isMoving && !this.prefersReducedMotion ? Math.sin(this.walkBobTime) * 0.02 : 0;
    this.camera.position.set(this.playerPos.x, 1.65 + bobOffset, this.playerPos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');

    // Cart bob follow
    if (this.cartGroup) {
      this.cartGroup.position.y = -0.44 + (isMoving ? Math.cos(this.walkBobTime) * 0.012 : 0);
    }

    // Sliding Entrance Doors (500ms pneumatic whoosh)
    if (this.slidingDoorLeft && this.slidingDoorRight) {
      const distToDoor = Math.hypot(this.playerPos.x, this.playerPos.z - 14.5);
      const isDoorOpen = distToDoor < 4.2;
      const targetLeft = isDoorOpen ? -3.4 : -1.6;
      const targetRight = isDoorOpen ? 3.4 : 1.6;

      this.slidingDoorLeft.position.x = THREE.MathUtils.damp(this.slidingDoorLeft.position.x, targetLeft, 6, dt);
      this.slidingDoorRight.position.x = THREE.MathUtils.damp(this.slidingDoorRight.position.x, targetRight, 6, dt);
    }

    // Conveyor belt scroll animation
    for (const belt of this.conveyorBelts) {
      if (belt.material && (belt.material as any).map) {
        (belt.material as any).map.offset.y += dt * 0.25;
      }
    }

    // Notify position to Minimap
    if (this.callbacks.onPlayerMove) {
      this.callbacks.onPlayerMove(this.playerPos.x, this.playerPos.z, this.yaw);
    }
  }

  // Update Shoppers & Dust & Search Beacon
  private updateWorldDynamics(dt: number) {
    // 1. Promo screens loop (every 5 seconds)
    if (this.promoScreens.length > 0 && this.promoTextures.length > 1) {
      this.promoTimer += dt;
      if (this.promoTimer > 5.0) {
        this.promoTimer = 0;
        this.promoSlideIndex = (this.promoSlideIndex + 1) % this.promoTextures.length;
        const newTex = this.promoTextures[this.promoSlideIndex];
        this.promoScreens.forEach((scr) => {
          (scr.material as THREE.MeshBasicMaterial).map = newTex;
          (scr.material as THREE.MeshBasicMaterial).needsUpdate = true;
        });
      }
    }

    // Floating Dust Particles (lightweight GPU rotation with 0 CPU buffer re-uploads)
    if (this.dustParticles) {
      this.dustParticles.rotation.y += dt * 0.03;
    }

    // 4. Pulsing Beacon Ring
    if (this.pulseBeaconMesh && this.pulseBeaconMesh.visible) {
      this.pulseTime += dt * 3.5;
      const scale = 1 + Math.sin(this.pulseTime) * 0.35;
      this.pulseBeaconMesh.scale.set(scale, scale, 1);
      if (this.pulseTime > Math.PI * 6) {
        this.pulseBeaconMesh.visible = false;
      }
    }

    // 5. Coral Low Stock Markers Pulse
    this.lowStockBeaconMap.forEach((beacon) => {
      const s = 1.0 + Math.sin(this.clock.elapsedTime * 5.0) * 0.12;
      beacon.scale.set(s, s, 1);
    });

    // 6. Cashier NPC Animation
    if (this.cashierNPC) {
      this.cashierNPC.update(dt, this.playerPos);
    }
  }

  // 600ms Projectiles Arc
  private updateProjectiles(dt: number) {
    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
      const p = this.activeProjectiles[i];
      p.progress += dt / p.duration;
      const t = Math.min(1, p.progress);

      const invT = 1 - t;
      p.mesh.position.x = invT * invT * p.start.x + 2 * invT * t * p.control.x + t * t * p.end.x;
      p.mesh.position.y = invT * invT * p.start.y + 2 * invT * t * p.control.y + t * t * p.end.y;
      p.mesh.position.z = invT * invT * p.start.z + 2 * invT * t * p.control.z + t * t * p.end.z;

      p.mesh.rotation.x += dt * 9;
      p.mesh.rotation.y += dt * 7;

      if (t >= 1) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.activeProjectiles.splice(i, 1);
      }
    }
  }

  // Animate items flying from player cart onto checkout conveyor belt
  private updateCheckoutSequence(dt: number) {
    for (let i = this.checkoutConveyorFlightItems.length - 1; i >= 0; i--) {
      const item = this.checkoutConveyorFlightItems[i];
      item.progress += dt / item.duration;
      const t = Math.min(1, item.progress);
      const invT = 1 - t;
      item.mesh.position.x = invT * invT * item.start.x + 2 * invT * t * item.control.x + t * t * item.end.x;
      item.mesh.position.y = invT * invT * item.start.y + 2 * invT * t * item.control.y + t * t * item.end.y;
      item.mesh.position.z = invT * invT * item.start.z + 2 * invT * t * item.control.z + t * t * item.end.z;
      item.mesh.rotation.x += dt * 7;
      item.mesh.rotation.y += dt * 8;

      if (t >= 1) {
        item.mesh.position.copy(item.end);
        item.mesh.rotation.set(0, 0, 0);
        if (item.onLand) item.onLand();
        this.checkoutConveyorFlightItems.splice(i, 1);
      }
    }
  }

  // Render Loop
  private startLoop() {
    const tick = () => {
      if (this.isDestroyed) return;
      const dt = Math.min(this.clock.getDelta(), 0.05);

      this.updatePlayer(dt);
      this.updateWorldDynamics(dt);
      this.updateProjectiles(dt);
      this.updateCheckoutSequence(dt);

      this.renderer.render(this.scene, this.camera);
      this.animFrameId = requestAnimationFrame(tick);
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  public setQuality(quality: QualityLevel) {
    this.quality = quality;
    if (this.renderer) {
      this.renderer.shadowMap.enabled = quality !== 'low' && !this.isSoftwareGl;
      this.renderer.setPixelRatio(quality === 'high' ? Math.min(window.devicePixelRatio || 1, 2) : 1);
    }
  }

  public dispose() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.animFrameId);
    this.cancelCheckoutSequence();
    if (this.cashierNPC) {
      this.cashierNPC.dispose();
      this.cashierNPC = null;
    }
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
