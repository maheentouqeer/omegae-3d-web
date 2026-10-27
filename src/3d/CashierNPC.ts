import * as THREE from 'three';

export type CashierState = 'idle' | 'greeting' | 'scanning' | 'done';

export class CashierNPC {
  public group: THREE.Group;
  private state: CashierState = 'idle';
  private stateTimer: number = 0;

  // Body parts
  private torso: THREE.Mesh;
  private headGroup: THREE.Group;
  private headMesh: THREE.Mesh;
  private leftArmGroup: THREE.Group;
  private rightArmGroup: THREE.Group;
  private scannerGun: THREE.Group;
  private laserBeam: THREE.Mesh;

  private scanTargetWorld: THREE.Vector3 | null = null;
  private laserTimer: number = 0;

  constructor() {
    this.group = new THREE.Group();

    // 1. Apron & Uniform Materials
    const apronMat = new THREE.MeshStandardMaterial({
      color: '#5B3DF5', // Omega violet
      roughness: 0.5,
      metalness: 0.05,
    });
    const shirtMat = new THREE.MeshStandardMaterial({
      color: '#F8FAFC',
      roughness: 0.6,
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: '#101A3A', // Deep navy
      roughness: 0.7,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: '#F5D0C5',
      roughness: 0.7,
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: '#1E293B',
      roughness: 0.8,
    });

    // 2. Legs (Matte navy trousers)
    const legGeo = new THREE.BoxGeometry(0.12, 0.82, 0.15);
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.set(-0.09, 0.41, 0);
    this.group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.set(0.09, 0.41, 0);
    this.group.add(rightLeg);

    // Shoes
    const shoeGeo = new THREE.BoxGeometry(0.13, 0.08, 0.2);
    const leftShoe = new THREE.Mesh(shoeGeo, pantsMat);
    leftShoe.position.set(-0.09, 0.04, 0.03);
    this.group.add(leftShoe);

    const rightShoe = new THREE.Mesh(shoeGeo, pantsMat);
    rightShoe.position.set(0.09, 0.04, 0.03);
    this.group.add(rightShoe);

    // 3. Torso (White collared shirt under Omega violet apron)
    const torsoGeo = new THREE.BoxGeometry(0.36, 0.52, 0.22);
    this.torso = new THREE.Mesh(torsoGeo, apronMat);
    this.torso.position.set(0, 1.08, 0);
    this.group.add(this.torso);

    // Shirt collar trim
    const collarGeo = new THREE.BoxGeometry(0.18, 0.08, 0.06);
    const collar = new THREE.Mesh(collarGeo, shirtMat);
    collar.position.set(0, 0.22, 0.1);
    this.torso.add(collar);

    // Employee Badge ("ALEX · OMEGA")
    const badgeCanvas = document.createElement('canvas');
    badgeCanvas.width = 128;
    badgeCanvas.height = 64;
    const bCtx = badgeCanvas.getContext('2d')!;
    bCtx.fillStyle = '#FFFFFF';
    bCtx.fillRect(0, 0, 128, 64);
    bCtx.fillStyle = '#5B3DF5';
    bCtx.fillRect(0, 0, 128, 16);
    bCtx.fillStyle = '#FFFFFF';
    bCtx.font = 'bold 11px sans-serif';
    bCtx.textAlign = 'center';
    bCtx.fillText('OMEGA STORE', 64, 12);
    bCtx.fillStyle = '#101A3A';
    bCtx.font = 'bold 16px sans-serif';
    bCtx.fillText('ALEX', 64, 38);
    bCtx.fillStyle = '#19C39A';
    bCtx.font = 'bold 9px sans-serif';
    bCtx.fillText('CASHIER #1', 64, 52);

    const badgeTex = new THREE.CanvasTexture(badgeCanvas);
    badgeTex.colorSpace = THREE.SRGBColorSpace;
    const badge = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.06, 0.02),
      new THREE.MeshBasicMaterial({ map: badgeTex })
    );
    badge.position.set(0.1, 0.12, 0.12);
    this.torso.add(badge);

    // 4. Head Group
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.38, 0);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 8), skinMat);
    neck.position.y = 0.05;
    this.headGroup.add(neck);

    // Face / Head
    const headCanvas = document.createElement('canvas');
    headCanvas.width = 128;
    headCanvas.height = 128;
    const hCtx = headCanvas.getContext('2d')!;
    hCtx.fillStyle = '#F5D0C5';
    hCtx.fillRect(0, 0, 128, 128);
    // Friendly eyes
    hCtx.fillStyle = '#101A3A';
    hCtx.beginPath();
    hCtx.arc(42, 60, 6, 0, Math.PI * 2);
    hCtx.arc(86, 60, 6, 0, Math.PI * 2);
    hCtx.fill();
    // Sparkle highlights in eyes
    hCtx.fillStyle = '#FFFFFF';
    hCtx.beginPath();
    hCtx.arc(44, 58, 2, 0, Math.PI * 2);
    hCtx.arc(88, 58, 2, 0, Math.PI * 2);
    hCtx.fill();
    // Warm friendly smile
    hCtx.strokeStyle = '#991B1B';
    hCtx.lineWidth = 4;
    hCtx.beginPath();
    hCtx.arc(64, 82, 16, 0.15 * Math.PI, 0.85 * Math.PI, false);
    hCtx.stroke();

    const faceTex = new THREE.CanvasTexture(headCanvas);
    faceTex.colorSpace = THREE.SRGBColorSpace;
    const headMat = [
      skinMat, // right
      skinMat, // left
      skinMat, // top
      skinMat, // bottom
      new THREE.MeshBasicMaterial({ map: faceTex }), // front face
      hairMat, // back
    ];
    this.headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.2), headMat);
    this.headMesh.position.y = 0.2;
    this.headGroup.add(this.headMesh);

    // Stylish Cap / Hair
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.22), hairMat);
    cap.position.set(0, 0.32, 0);
    this.headGroup.add(cap);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.1), hairMat);
    visor.position.set(0, 0.28, 0.14);
    visor.rotation.x = 0.15;
    this.headGroup.add(visor);

    this.group.add(this.headGroup);

    // 5. Left Arm (resting casually on counter)
    this.leftArmGroup = new THREE.Group();
    this.leftArmGroup.position.set(-0.22, 1.28, 0);

    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.38, 0.1), shirtMat);
    leftArm.position.set(-0.03, -0.16, 0.08);
    leftArm.rotation.x = 0.4;
    leftArm.rotation.z = 0.15;
    this.leftArmGroup.add(leftArm);

    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.08), skinMat);
    leftHand.position.set(-0.03, -0.36, 0.18);
    this.leftArmGroup.add(leftHand);

    this.group.add(this.leftArmGroup);

    // 6. Right Arm (Holding barcode scanner gun)
    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(0.22, 1.28, 0);

    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.34, 0.1), shirtMat);
    rightArm.position.set(0.03, -0.14, 0.04);
    this.rightArmGroup.add(rightArm);

    const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.08), skinMat);
    rightHand.position.set(0.03, -0.32, 0.08);
    this.rightArmGroup.add(rightHand);

    // Handheld Barcode Scanner
    this.scannerGun = new THREE.Group();
    this.scannerGun.position.set(0.03, -0.34, 0.14);
    this.scannerGun.rotation.x = -Math.PI / 4;

    // Grip
    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.12, 0.04),
      new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.5 })
    );
    this.scannerGun.add(grip);

    // Scanner Head
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.06, 0.12),
      new THREE.MeshStandardMaterial({ color: '#0F172A', roughness: 0.4 })
    );
    head.position.set(0, 0.06, 0.04);
    this.scannerGun.add(head);

    // Scanner red optic diode
    const diode = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.03, 0.01),
      new THREE.MeshBasicMaterial({ color: '#EF4444' })
    );
    diode.position.set(0, 0.06, 0.105);
    this.scannerGun.add(diode);

    // Translucent Laser Beam Cone
    const laserGeo = new THREE.ConeGeometry(0.09, 0.75, 8);
    laserGeo.rotateX(-Math.PI / 2);
    laserGeo.translate(0, 0, 0.38);
    const laserMat = new THREE.MeshBasicMaterial({
      color: '#EF4444',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.laserBeam = new THREE.Mesh(laserGeo, laserMat);
    this.laserBeam.position.set(0, 0.06, 0.1);
    this.scannerGun.add(this.laserBeam);

    this.rightArmGroup.add(this.scannerGun);
    this.group.add(this.rightArmGroup);
  }

  public setState(state: CashierState) {
    this.state = state;
    this.stateTimer = 0;
  }

  public getState(): CashierState {
    return this.state;
  }

  public setScanTarget(worldPos: THREE.Vector3 | null) {
    this.scanTargetWorld = worldPos;
  }

  public triggerLaserPulse(durationSec: number = 0.3) {
    this.laserTimer = durationSec;
  }

  public update(dt: number, customerWorldPos?: THREE.Vector3) {
    this.stateTimer += dt;

    // Laser beam fade
    if (this.laserTimer > 0) {
      this.laserTimer -= dt;
      (this.laserBeam.material as THREE.MeshBasicMaterial).opacity = Math.min(0.75, this.laserTimer * 3);
    } else {
      (this.laserBeam.material as THREE.MeshBasicMaterial).opacity = 0;
    }

    // State machine animations
    switch (this.state) {
      case 'idle': {
        // Gentle breathing on torso
        this.torso.position.y = 1.08 + Math.sin(this.stateTimer * 2.2) * 0.012;
        this.headGroup.position.y = 1.38 + Math.sin(this.stateTimer * 2.2) * 0.012;

        // Scanner held resting downward
        this.rightArmGroup.rotation.x = THREE.MathUtils.damp(this.rightArmGroup.rotation.x, 0.2, 5, dt);
        this.rightArmGroup.rotation.y = THREE.MathUtils.damp(this.rightArmGroup.rotation.y, -0.1, 5, dt);
        this.rightArmGroup.rotation.z = THREE.MathUtils.damp(this.rightArmGroup.rotation.z, 0.1, 5, dt);

        // Turn head towards approaching customer
        if (customerWorldPos) {
          const localCustomer = customerWorldPos.clone();
          this.group.worldToLocal(localCustomer);
          const angle = Math.atan2(localCustomer.x, localCustomer.z);
          const clampedAngle = THREE.MathUtils.clamp(angle, -Math.PI / 3, Math.PI / 3);
          this.headGroup.rotation.y = THREE.MathUtils.damp(this.headGroup.rotation.y, clampedAngle, 4, dt);
        }
        break;
      }

      case 'greeting': {
        // Friendly wave with right arm holding scanner up
        const wave = Math.sin(this.stateTimer * 7.0) * 0.35;
        this.rightArmGroup.rotation.x = THREE.MathUtils.damp(this.rightArmGroup.rotation.x, -0.9, 8, dt);
        this.rightArmGroup.rotation.z = THREE.MathUtils.damp(this.rightArmGroup.rotation.z, -0.4 + wave, 10, dt);
        this.headGroup.rotation.x = Math.sin(this.stateTimer * 4) * 0.08; // friendly nod
        break;
      }

      case 'scanning': {
        // Aim right arm towards the scan target on the conveyor belt
        if (this.scanTargetWorld) {
          const localTarget = this.scanTargetWorld.clone();
          this.group.worldToLocal(localTarget);

          // Arm angles to point towards product
          const targetRotX = THREE.MathUtils.clamp(-0.8 + (localTarget.z * 0.5), -1.2, -0.2);
          const targetRotY = THREE.MathUtils.clamp(localTarget.x * 0.7, -0.8, 0.8);
          this.rightArmGroup.rotation.x = THREE.MathUtils.damp(this.rightArmGroup.rotation.x, targetRotX, 8, dt);
          this.rightArmGroup.rotation.y = THREE.MathUtils.damp(this.rightArmGroup.rotation.y, targetRotY, 8, dt);
          this.rightArmGroup.rotation.z = THREE.MathUtils.damp(this.rightArmGroup.rotation.z, 0.25, 8, dt);

          // Head looks at product being scanned
          const headAngle = Math.atan2(localTarget.x, localTarget.z);
          this.headGroup.rotation.y = THREE.MathUtils.damp(this.headGroup.rotation.y, headAngle, 6, dt);
          this.headGroup.rotation.x = THREE.MathUtils.damp(this.headGroup.rotation.x, 0.25, 6, dt);
        } else {
          this.rightArmGroup.rotation.x = THREE.MathUtils.damp(this.rightArmGroup.rotation.x, -0.4, 5, dt);
          this.rightArmGroup.rotation.z = THREE.MathUtils.damp(this.rightArmGroup.rotation.z, 0.2, 5, dt);
        }
        break;
      }

      case 'done': {
        // Open-palm polite gesture towards card terminal (customer's right)
        this.rightArmGroup.rotation.x = THREE.MathUtils.damp(this.rightArmGroup.rotation.x, -0.6, 6, dt);
        this.rightArmGroup.rotation.y = THREE.MathUtils.damp(this.rightArmGroup.rotation.y, 0.45, 6, dt);
        this.rightArmGroup.rotation.z = THREE.MathUtils.damp(this.rightArmGroup.rotation.z, -0.3, 6, dt);
        this.headGroup.rotation.y = THREE.MathUtils.damp(this.headGroup.rotation.y, 0.3, 5, dt);
        this.headGroup.rotation.x = Math.sin(this.stateTimer * 3) * 0.06;
        break;
      }
    }
  }

  public dispose() {
    this.group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry.dispose();
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => mat.dispose());
        } else if (m.material) {
          m.material.dispose();
        }
      }
    });
  }
}
