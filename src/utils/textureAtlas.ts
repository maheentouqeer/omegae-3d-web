import * as THREE from 'three';
import { Product, AisleInfo } from '../types';

export class TextureFactory {
  private static productTextureCache = new Map<string, THREE.CanvasTexture>();
  private static aisleSignCache = new Map<number, THREE.CanvasTexture>();
  private static sharedFloorTexture: THREE.CanvasTexture | null = null;
  private static sharedBeltTexture: THREE.CanvasTexture | null = null;
  private static sharedBannerTexture: THREE.CanvasTexture | null = null;

  // Generate procedural label texture for a product box/bottle
  public static getProductTexture(product: Product): THREE.CanvasTexture {
    if (this.productTextureCache.has(product.id)) {
      return this.productTextureCache.get(product.id)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Background color
    ctx.fillStyle = product.baseColor;
    ctx.fillRect(0, 0, 512, 512);

    // Accent Header Block
    ctx.fillStyle = product.accentColor;
    ctx.fillRect(0, 0, 512, 120);

    // Dark band for brand contrast
    ctx.fillStyle = '#0b1528';
    ctx.fillRect(0, 120, 512, 16);

    // Brand Label
    ctx.fillStyle = '#0b1528';
    ctx.font = 'bold 36px "Bricolage Grotesque", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OMEGA SELECT', 256, 50);

    ctx.font = '500 22px "Inter", sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText(product.category.toUpperCase(), 256, 92);

    // Product Title (Main body)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 38px "Bricolage Grotesque", sans-serif';
    const words = product.name.split(' ');
    let line1 = words.slice(0, 2).join(' ');
    let line2 = words.slice(2).join(' ');
    ctx.fillText(line1, 256, 220);
    if (line2) {
      ctx.fillText(line2, 256, 268);
    }

    // Spec / Weight
    ctx.font = '500 24px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText(product.unit, 256, 330);

    // Price Badge & Sale Tag
    if (product.isSale) {
      ctx.fillStyle = '#e5322d';
      ctx.fillRect(40, 360, 432, 60);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px "JetBrains Mono", monospace';
      ctx.fillText(`SALE $${(product.salePrice || product.price).toFixed(2)}`, 256, 402);
    } else {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(80, 360, 352, 60);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px "JetBrains Mono", monospace';
      ctx.fillText(`$${product.price.toFixed(2)}`, 256, 402);
    }

    // Barcode area at bottom
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(60, 440, 392, 55);

    // Draw realistic barcode stripes
    ctx.fillStyle = '#000000';
    for (let x = 80; x < 430; x += 6) {
      const barW = (x % 11 === 0 || x % 17 === 0) ? 4 : 2;
      ctx.fillRect(x, 448, barW, 38);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    this.productTextureCache.set(product.id, texture);
    return texture;
  }

  // Hanging Aisle Sign Texture (Double-sided clean readable display)
  public static getAisleSignTexture(aisle: AisleInfo): THREE.CanvasTexture {
    if (this.aisleSignCache.has(aisle.number)) {
      return this.aisleSignCache.get(aisle.number)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 340;
    const ctx = canvas.getContext('2d')!;

    // Omega deep blue sign
    ctx.fillStyle = '#0B2A6F';
    ctx.fillRect(0, 0, 1024, 340);

    // Accent border & glowing inset line
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 12;
    ctx.strokeRect(10, 10, 1004, 320);

    // Aisle Number Badge on Left
    ctx.fillStyle = '#1e40af';
    ctx.fillRect(30, 30, 240, 280);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 120px "Bricolage Grotesque", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`0${aisle.number}`, 150, 160);

    ctx.font = 'bold 24px "Inter", sans-serif';
    ctx.fillStyle = '#93c5fd';
    ctx.fillText('AISLE', 150, 240);

    // Category Sign Title on Right
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px "Bricolage Grotesque", sans-serif';
    ctx.fillText(aisle.name.toUpperCase(), 310, 145);

    ctx.fillStyle = '#67e8f9';
    ctx.font = '600 30px "Inter", sans-serif';
    ctx.fillText('OMEGA FRESH & ESSENTIALS', 310, 210);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.aisleSignCache.set(aisle.number, texture);
    return texture;
  }

  // High-end Polished Supermarket Terrazzo Floor Texture
  public static getFloorTexture(): THREE.CanvasTexture {
    if (this.sharedFloorTexture) return this.sharedFloorTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Soft neutral warm tile field
    ctx.fillStyle = '#dcdfe4';
    ctx.fillRect(0, 0, 1024, 1024);

    // 4 large tile quadrants
    const tileSize = 256;
    for (let x = 0; x < 1024; x += tileSize) {
      for (let y = 0; y < 1024; y += tileSize) {
        // Tile surface slight gradient
        const grad = ctx.createLinearGradient(x, y, x + tileSize, y + tileSize);
        grad.addColorStop(0, '#e5e7eb');
        grad.addColorStop(1, '#d1d5db');
        ctx.fillStyle = grad;
        ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

        // Subtle aggregate speckles
        for (let s = 0; s < 30; s++) {
          const sx = x + Math.random() * (tileSize - 4);
          const sy = y + Math.random() * (tileSize - 4);
          ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.7)' : 'rgba(75,85,99,0.3)';
          ctx.fillRect(sx, sy, 3, 3);
        }

        // Grout line
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, tileSize, tileSize);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(12, 10);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.sharedFloorTexture = texture;
    return texture;
  }

  // Conveyor Belt Black Rubber Texture with Yellow Hazard Stripes
  public static getConveyorBeltTexture(): THREE.CanvasTexture {
    if (this.sharedBeltTexture) return this.sharedBeltTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1c1917';
    ctx.fillRect(0, 0, 512, 512);

    // Ribbed horizontal grooves
    ctx.fillStyle = '#292524';
    for (let y = 0; y < 512; y += 16) {
      ctx.fillRect(0, y, 512, 4);
    }

    // Yellow hazard edges
    ctx.fillStyle = '#eab308';
    ctx.fillRect(0, 0, 16, 512);
    ctx.fillRect(496, 0, 16, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.sharedBeltTexture = texture;
    return texture;
  }

  // Entrance Promo Screen Billboard
  public static getEntranceBannerTexture(): THREE.CanvasTexture {
    if (this.sharedBannerTexture) return this.sharedBannerTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 1024, 256);
    grad.addColorStop(0, '#0B2A6F');
    grad.addColorStop(0.5, '#1e3a8a');
    grad.addColorStop(1, '#312e81');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 256);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, 1012, 244);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 64px "Bricolage Grotesque", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WELCOME TO OMEGA SUPERMARKET', 512, 90);

    ctx.font = '600 28px "Inter", sans-serif';
    ctx.fillStyle = '#7dd3fc';
    ctx.fillText('ORGANIC PRODUCE · SMART AISLES · AI CONCIERGE · FAST CHECKOUT', 512, 155);

    ctx.font = '500 20px "JetBrains Mono", monospace';
    ctx.fillStyle = '#fde047';
    ctx.fillText('TODAY ONLY: SPECIAL DISCOUNTS ACROSS ALL 8 AISLES', 512, 205);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.sharedBannerTexture = texture;
    return texture;
  }
}
