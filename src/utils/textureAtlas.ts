import * as THREE from 'three';
import { Product, AisleInfo } from '../types';

export class TextureFactory {
  private static productTextureCache = new Map<string, THREE.CanvasTexture>();
  private static aisleSignCache = new Map<number, THREE.CanvasTexture>();
  private static floorTexture: THREE.CanvasTexture | null = null;
  private static beltTexture: THREE.CanvasTexture | null = null;
  private static promoTextures: THREE.CanvasTexture[] = [];
  private static floorDecalTexture: THREE.CanvasTexture | null = null;
  private static endCapSignCache = new Map<number, THREE.CanvasTexture>();

  // Product packaging label: crisp readable brand, title, accent band, and price
  public static getProductTexture(product: Product): THREE.CanvasTexture {
    if (this.productTextureCache.has(product.id)) {
      return this.productTextureCache.get(product.id)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Background base
    ctx.fillStyle = product.baseColor;
    ctx.fillRect(0, 0, 512, 512);

    // Header color band
    ctx.fillStyle = product.accentColor;
    ctx.fillRect(0, 0, 512, 115);

    // Brand mark strip
    ctx.fillStyle = '#101A3A';
    ctx.fillRect(0, 115, 512, 20);

    // Brand Name
    ctx.fillStyle = '#101A3A';
    ctx.font = 'bold 32px "Sora", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(product.brandName.toUpperCase(), 256, 52);

    ctx.font = '600 20px "Inter", sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText(product.category.toUpperCase(), 256, 90);

    // Product Name (Bold, readable from 3m)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px "Sora", sans-serif';
    const words = product.name.split(' ');
    let line1 = words.slice(0, 2).join(' ');
    let line2 = words.slice(2, 4).join(' ');
    let line3 = words.slice(4).join(' ');
    ctx.fillText(line1, 256, 205);
    if (line2) ctx.fillText(line2, 256, 250);
    if (line3) ctx.fillText(line3, 256, 290);

    // Unit size / spec
    ctx.font = '500 22px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(product.unit, 256, 340);

    // Price tag / Coral sale badge (#FF5A4D for sale only!)
    if (product.isSale) {
      ctx.fillStyle = '#FF5A4D'; // Coral
      ctx.fillRect(36, 370, 440, 60);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 32px "JetBrains Mono", monospace';
      ctx.fillText(`SALE $${(product.salePrice || product.price).toFixed(2)}`, 256, 412);
    } else {
      ctx.fillStyle = 'rgba(16, 26, 58, 0.65)';
      ctx.fillRect(70, 370, 372, 60);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 32px "JetBrains Mono", monospace';
      ctx.fillText(`$${product.price.toFixed(2)}`, 256, 412);
    }

    // Barcode footer block
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(50, 444, 412, 54);

    ctx.fillStyle = '#000000';
    for (let x = 70; x < 440; x += 6) {
      const barW = (x % 11 === 0 || x % 13 === 0) ? 4 : 2;
      ctx.fillRect(x, 452, barW, 38);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.productTextureCache.set(product.id, texture);
    return texture;
  }

  // Hanging Aisle Sign: readable from 15m with aisle number, name, and subLabel
  public static getAisleSignTexture(aisle: AisleInfo): THREE.CanvasTexture {
    if (this.aisleSignCache.has(aisle.number)) {
      return this.aisleSignCache.get(aisle.number)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 340;
    const ctx = canvas.getContext('2d')!;

    // Navy base #101A3A
    ctx.fillStyle = '#101A3A';
    ctx.fillRect(0, 0, 1024, 340);

    // Aisle accent border
    ctx.strokeStyle = aisle.accentColor;
    ctx.lineWidth = 14;
    ctx.strokeRect(8, 8, 1008, 324);

    // Number Block on left
    ctx.fillStyle = aisle.accentColor;
    ctx.fillRect(24, 24, 250, 292);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 125px "Sora", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`0${aisle.number}`, 149, 155);

    ctx.font = 'bold 24px "Sora", sans-serif';
    ctx.fillStyle = '#101A3A';
    ctx.fillText('AISLE', 149, 240);

    // Main Category Title
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 64px "Sora", sans-serif';
    ctx.fillText(aisle.name.toUpperCase(), 310, 135);

    // Sub-label readable from 15m
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '500 28px "Inter", sans-serif';
    ctx.fillText(aisle.subLabel, 310, 205);

    // Bottom accent indicator bar
    ctx.fillStyle = aisle.accentColor;
    ctx.fillRect(310, 235, 680, 8);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.aisleSignCache.set(aisle.number, texture);
    return texture;
  }

  // End-cap display sign
  public static getEndCapSignTexture(aisle: AisleInfo): THREE.CanvasTexture {
    if (this.endCapSignCache.has(aisle.number)) {
      return this.endCapSignCache.get(aisle.number)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#101A3A';
    ctx.fillRect(0, 0, 512, 256);

    ctx.fillStyle = aisle.accentColor;
    ctx.fillRect(0, 0, 512, 50);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px "Sora", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`FEATURED · AISLE 0${aisle.number}`, 256, 35);

    ctx.font = 'bold 36px "Sora", sans-serif';
    ctx.fillText(aisle.name.toUpperCase(), 256, 130);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 20px "Inter", sans-serif';
    ctx.fillText('Omega Quality Guarantee', 256, 185);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.endCapSignCache.set(aisle.number, texture);
    return texture;
  }

  // Warm light grey floor #E9E6DF with faint reflection
  public static getFloorTexture(): THREE.CanvasTexture {
    if (this.floorTexture) return this.floorTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Warm light grey base #E9E6DF
    ctx.fillStyle = '#E9E6DF';
    ctx.fillRect(0, 0, 1024, 1024);

    const tileSize = 256;
    for (let x = 0; x < 1024; x += tileSize) {
      for (let y = 0; y < 1024; y += tileSize) {
        // Soft tile variation
        const grad = ctx.createLinearGradient(x, y, x + tileSize, y + tileSize);
        grad.addColorStop(0, '#ECE9E2');
        grad.addColorStop(1, '#E5E2DA');
        ctx.fillStyle = grad;
        ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

        // Fine speckles
        for (let s = 0; s < 25; s++) {
          const sx = x + Math.random() * (tileSize - 4);
          const sy = y + Math.random() * (tileSize - 4);
          ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.6)' : 'rgba(150,145,135,0.25)';
          ctx.fillRect(sx, sy, 2, 2);
        }

        // Clean light grout lines
        ctx.strokeStyle = '#D6D2C8';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, tileSize, tileSize);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(12, 10);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.floorTexture = texture;
    return texture;
  }

  // Floor Decals: directional navigation arrows & aisle entrance guidance
  public static getFloorDecalTexture(): THREE.CanvasTexture {
    if (this.floorDecalTexture) return this.floorDecalTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 512, 512);

    // Circular floor guide decal
    ctx.strokeStyle = 'rgba(91, 61, 245, 0.4)'; // Omega violet
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(256, 256, 220, 0, Math.PI * 2);
    ctx.stroke();

    // Direction arrow
    ctx.fillStyle = 'rgba(91, 61, 245, 0.35)';
    ctx.beginPath();
    ctx.moveTo(256, 90);
    ctx.lineTo(370, 220);
    ctx.lineTo(295, 220);
    ctx.lineTo(295, 380);
    ctx.lineTo(217, 380);
    ctx.lineTo(217, 220);
    ctx.lineTo(142, 220);
    ctx.closePath();
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.floorDecalTexture = texture;
    return texture;
  }

  // Matte Conveyor Belt
  public static getConveyorBeltTexture(): THREE.CanvasTexture {
    if (this.beltTexture) return this.beltTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#181E2C'; // Matte dark slate navy
    ctx.fillRect(0, 0, 512, 512);

    // Ribbed horizontal textured grooves
    ctx.fillStyle = '#222B3D';
    for (let y = 0; y < 512; y += 14) {
      ctx.fillRect(0, y, 512, 3);
    }

    // Yellow hazard safety edge stripes
    ctx.fillStyle = '#EAB308';
    ctx.fillRect(0, 0, 14, 512);
    ctx.fillRect(498, 0, 14, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.beltTexture = texture;
    return texture;
  }

  // Looping Promo Screens (Slides 1, 2, 3)
  public static getPromoScreenTextures(): THREE.CanvasTexture[] {
    if (this.promoTextures.length > 0) return this.promoTextures;

    const slides = [
      {
        title: 'WELCOME TO OMEGA',
        sub: '8 AISLES OF FRESH ESSENTIALS & DIGITAL EXPERIENCES',
        highlight: 'SCAN & FLY DIRECTLY TO ANY SHELF WITH SEARCH',
        color: '#5B3DF5',
      },
      {
        title: 'ORGANIC HARVEST SPECIALS',
        sub: 'FRESH BREADS, ORCHARD HONEYCRISP & TUSCAN OILS',
        highlight: 'SAVE UP TO 25% ACROSS AISLE 01 TODAY',
        color: '#D97706',
      },
      {
        title: 'SMART REPLENISHMENT',
        sub: 'SWITCH TO MANAGER MODE TO MONITOR REAL-TIME SHELF VELOCITY',
        highlight: 'DEMO PIN: 1234 · LIVE STOCK RING VISUALIZERS',
        color: '#059669',
      },
    ];

    this.promoTextures = slides.map((slide) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 320;
      const ctx = canvas.getContext('2d')!;

      // Background
      const grad = ctx.createLinearGradient(0, 0, 1024, 320);
      grad.addColorStop(0, '#101A3A');
      grad.addColorStop(1, slide.color);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 320);

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 6;
      ctx.strokeRect(10, 10, 1004, 300);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 56px "Sora", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(slide.title, 512, 105);

      ctx.font = '600 24px "Inter", sans-serif';
      ctx.fillStyle = '#E2E8F0';
      ctx.fillText(slide.sub, 512, 175);

      ctx.font = 'bold 20px "JetBrains Mono", monospace';
      ctx.fillStyle = '#FEF08A';
      ctx.fillText(slide.highlight, 512, 235);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    });

    return this.promoTextures;
  }
}
