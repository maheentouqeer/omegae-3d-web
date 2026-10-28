import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// Initialize Gemini client with aistudio-build header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Intelligent Local Fallback for Shopping Concierge
function generateLocalConciergeResponse(prompt: string, availableProducts: any[]) {
  const q = prompt.toLowerCase();
  let matches = availableProducts.filter((p: any) => {
    const name = (p.name || '').toLowerCase();
    const cat = (p.category || '').toLowerCase();
    return q.includes(name) || q.includes(cat);
  });

  if (matches.length === 0) {
    if (q.includes('dinner') || q.includes('pasta') || q.includes('cook') || q.includes('meal')) {
      matches = availableProducts.filter((p: any) => [1, 2, 7].includes(p.aisleNumber));
    } else if (q.includes('healthy') || q.includes('workout') || q.includes('energy') || q.includes('gym')) {
      matches = availableProducts.filter((p: any) => [1, 2, 4].includes(p.aisleNumber));
    } else if (q.includes('flu') || q.includes('cold') || q.includes('recovery') || q.includes('sick')) {
      matches = availableProducts.filter((p: any) => [4, 1, 2].includes(p.aisleNumber));
    } else {
      matches = availableProducts.slice(0, 4);
    }
  }

  const selected = matches.slice(0, 4);
  const totalCost = selected.reduce((sum: number, p: any) => sum + (p.price || 0), 0);

  return {
    reply: `Here are our recommended items based on what you asked:\n\n` +
      selected.map((p: any) => `• ${p.name} ($${p.price?.toFixed(2)} · Aisle ${p.aisleNumber})`).join('\n') +
      `\n\nTotal estimate: $${totalCost.toFixed(2)}. You can tap the view or add buttons below to find them in store!`,
    recommendedProductIds: selected.map((p: any) => p.id),
  };
}

// Intelligent Local Fallback for Store Manager Inventory Analyst
function analyzeStoreInventoryLocally(prompt: string, inventoryData: any[]) {
  const q = prompt.toLowerCase();

  // 1. Specific product inquiry
  const matchedProducts = inventoryData.filter(item => {
    const name = (item.productName || '').toLowerCase();
    const brand = (item.brand || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();
    return q.includes(name) || name.split(' ').some((word: string) => word.length > 3 && q.includes(word));
  });

  if (matchedProducts.length > 0 && !q.includes('all') && !q.includes('restock all') && !q.includes('bottlenecks')) {
    const lines = matchedProducts.map(p => {
      const status = p.stock <= p.reorderThreshold ? '⚠️ LOW STOCK' : '✅ Healthy';
      return `• ${p.productName} (Aisle ${p.aisle}): ${p.stock} units on shelf (Capacity: ${p.max}). Price: $${p.price?.toFixed(2) || '0.00'}. Status: ${status}. Sold to date: ${p.salesCount || 0} units.`;
    });

    const lowItems = matchedProducts.filter(p => p.stock <= p.reorderThreshold);

    return {
      analysis: `Specific Product Inventory Status for your query:\n\n${lines.join('\n')}\n\n` +
        `Summary: ${
          lowItems.length > 0
            ? `Critical replenishment needed for ${lowItems.map(i => i.productName).join(', ')}.`
            : `All queried items are currently healthy on the shelves.`
        }`,
      priorityRestockIds: lowItems.map(p => p.productId).filter(Boolean),
      pricingSuggestions: matchedProducts
        .filter(p => p.stock > p.reorderThreshold && (p.salesCount || 0) < 3)
        .map(p => ({
          productId: p.productId,
          suggestedAction: `Consider a 10% promotional markdown`,
          reason: `High shelf capacity with low velocity.`,
        })),
    };
  }

  // 2. Aisle / Category inquiry
  const aisleMap: Record<number, string> = {
    1: 'Bakery & Fresh',
    2: 'Cold Drinks',
    3: 'Beauty & Care',
    4: 'Pharmacy',
    5: 'Apparel & Basics',
    6: 'Electronics',
    7: 'Home & Kitchen',
    8: 'Kids & Toys',
  };

  for (let a = 1; a <= 8; a++) {
    const aisleName = aisleMap[a].toLowerCase();
    if (q.includes(`aisle ${a}`) || q.includes(aisleName.split(' ')[0])) {
      const aisleItems = inventoryData.filter(i => i.aisle === a);
      const totalUnits = aisleItems.reduce((acc, i) => acc + (i.stock || 0), 0);
      const maxUnits = aisleItems.reduce((acc, i) => acc + (i.max || 0), 0);
      const lowItems = aisleItems.filter(i => i.stock <= i.reorderThreshold);
      const aisleVal = aisleItems.reduce((acc, i) => acc + ((i.price || 0) * (i.stock || 0)), 0);

      return {
        analysis: `Aisle ${a} (${aisleMap[a]}) Inventory Analysis:\n\n` +
          `• Total Stock on Shelf: ${totalUnits} units across ${aisleItems.length} products (${Math.round((totalUnits / (maxUnits || 1)) * 100)}% shelf capacity filled).\n` +
          `• Inventory Retail Value: $${aisleVal.toFixed(2)}.\n` +
          `• Critical Replenishment Alerts: ${lowItems.length} item(s) below reorder threshold (${lowItems.map(i => i.productName).join(', ') || 'None'}).\n\n` +
          `Manager Recommendation: ${lowItems.length > 0 ? 'Restock depleted facings to maintain visual merchandising standards.' : 'Aisle 100% compliant with healthy display levels.'}`,
        priorityRestockIds: lowItems.map(i => i.productId).filter(Boolean),
        pricingSuggestions: aisleItems
          .filter(i => i.stock >= (i.max || 10) * 0.9)
          .slice(0, 2)
          .map(i => ({
            productId: i.productId,
            suggestedAction: `Feature on Aisle ${a} end-cap display with 5% discount`,
            reason: `Full stock capacity; promote to accelerate turn.`,
          })),
      };
    }
  }

  // 3. Restock / Replenishment inquiry
  if (q.includes('restock') || q.includes('low stock') || q.includes('out of stock') || q.includes('replenish') || q.includes('bottlenecks') || q.includes('shortage')) {
    const lowItems = inventoryData.filter(i => i.stock <= i.reorderThreshold || i.isLowStock);
    lowItems.sort((a, b) => (a.stock / (a.max || 1)) - (b.stock / (b.max || 1)));

    const topNeeds = lowItems.slice(0, 6);
    const lines = topNeeds.map(i => {
      const needed = (i.max || 15) - (i.stock || 0);
      return `• ${i.productName} (Aisle ${i.aisle}): ${i.stock} remaining (Threshold: ${i.reorderThreshold}). Needs +${needed} units.`;
    });

    return {
      analysis: `Store Priority Replenishment Intelligence:\n\n` +
        `Found ${lowItems.length} products currently below reorder thresholds across the 8 aisles.\n\n` +
        `${lines.join('\n')}\n\n` +
        `Recommendation: Use the "Restock All" button in the dashboard to replenish all ${lowItems.length} slots immediately.`,
      priorityRestockIds: topNeeds.map(i => i.productId).filter(Boolean),
      pricingSuggestions: [],
    };
  }

  // 4. Financial / Valuation / Sales inquiry
  if (q.includes('value') || q.includes('worth') || q.includes('sales') || q.includes('revenue') || q.includes('financial') || q.includes('total')) {
    const totalUnits = inventoryData.reduce((acc, i) => acc + (i.stock || 0), 0);
    const totalMax = inventoryData.reduce((acc, i) => acc + (i.max || 0), 0);
    const totalVal = inventoryData.reduce((acc, i) => acc + ((i.price || 0) * (i.stock || 0)), 0);
    const totalSalesRev = inventoryData.reduce((acc, i) => acc + ((i.price || 0) * (i.salesCount || 0)), 0);
    const topSellers = [...inventoryData].sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0)).slice(0, 3);

    return {
      analysis: `Store Financial & Inventory Value Summary:\n\n` +
        `• Total Retail Stock Value: $${totalVal.toFixed(2)} on floor.\n` +
        `• Physical Stock Depth: ${totalUnits} units on shelves (${Math.round((totalUnits / (totalMax || 1)) * 100)}% capacity filled).\n` +
        `• Accumulated Sales Revenue: $${totalSalesRev.toFixed(2)} across shopping transactions.\n` +
        `• Top Selling Products: ${topSellers.map(s => `${s.productName} (${s.salesCount || 0} sold)`).join(', ')}.`,
      priorityRestockIds: topSellers.map(s => s.productId).filter(Boolean),
      pricingSuggestions: [],
    };
  }

  // 5. Pricing & Markdown suggestions
  if (q.includes('price') || q.includes('discount') || q.includes('markdown') || q.includes('promo') || q.includes('slow')) {
    const candidates = inventoryData.filter(i => (i.stock || 0) > (i.reorderThreshold || 4) && (i.salesCount || 0) < 3).slice(0, 4);

    return {
      analysis: `Merchandising & Pricing Recommendations:\n\n` +
        `To accelerate stock turnover on slower-moving items, consider temporary promotional pricing on these ${candidates.length} products:\n\n` +
        candidates.map(c => `• ${c.productName} (Aisle ${c.aisle}): Currently $${c.price?.toFixed(2)}. Suggest 10% discount to $${((c.price || 0) * 0.9).toFixed(2)}.`).join('\n'),
      priorityRestockIds: candidates.map(c => c.productId).filter(Boolean),
      pricingSuggestions: candidates.map(c => ({
        productId: c.productId,
        suggestedAction: `Discount 10% to $${((c.price || 0) * 0.9).toFixed(2)}`,
        reason: `Accelerate stock turnover on Aisle ${c.aisle}.`,
      })),
    };
  }

  // 6. General default overview based on real store numbers
  const lowCount = inventoryData.filter(i => i.stock <= i.reorderThreshold).length;
  const totalItems = inventoryData.length;
  const totalUnits = inventoryData.reduce((acc, i) => acc + (i.stock || 0), 0);
  const totalVal = inventoryData.reduce((acc, i) => acc + ((i.price || 0) * (i.stock || 0)), 0);

  return {
    analysis: `Omega Store Inventory Intelligence Overview:\n\n` +
      `• Catalog Size: ${totalItems} products across 8 active aisles.\n` +
      `• Total Stock: ${totalUnits} physical units with an aggregate retail value of $${totalVal.toFixed(2)}.\n` +
      `• Replenishment Needs: ${lowCount} item(s) are currently at or below reorder threshold.\n\n` +
      `You can ask specific questions like: "Which products in Aisle 1 need restock?", "How much stock of Sourdough Bread do we have?", or "Show slow-moving items for markdown".`,
    priorityRestockIds: inventoryData.filter(i => i.stock <= i.reorderThreshold).slice(0, 4).map(i => i.productId).filter(Boolean),
    pricingSuggestions: [],
  };
}

// AI Shopping Concierge Endpoint
app.post('/api/ai/concierge', async (req, res) => {
  try {
    const { prompt, currentCart = [], availableProducts = [] } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      const fallback = generateLocalConciergeResponse(prompt, availableProducts);
      return res.json(fallback);
    }

    const simplifiedCatalog = availableProducts.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      aisle: p.aisleNumber,
    }));

    const systemInstruction = `You are the friendly, knowledgeable in-store AI Concierge at Omega Supermarket.
You help shoppers plan meals, find ingredients, answer questions about products, suggest budget items, and recommend products from the store.
Here is the store's current catalog:
${JSON.stringify(simplifiedCatalog)}

Rules:
1. Directly answer what the customer asked in an upbeat, helpful, concise tone.
2. Recommend 1 to 4 relevant products from the catalog that best match their inquiry.
3. Include product names, aisle numbers, and prices in your explanation.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: 'Helpful conversational answer directly addressing the user inquiry.',
            },
            recommendedProductIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Array of exact product IDs from the catalog matching the recommendation.',
            },
          },
          required: ['reply', 'recommendedProductIds'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Concierge API Error:', error);
    // Graceful fallback to local intelligence engine
    const fallback = generateLocalConciergeResponse(req.body.prompt || '', req.body.availableProducts || []);
    return res.json(fallback);
  }
});

// AI Manager Inventory Analyst Endpoint
app.post('/api/ai/inventory', async (req, res) => {
  try {
    const { prompt, inventoryData = [], auditLog = [] } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      const fallback = analyzeStoreInventoryLocally(prompt, inventoryData);
      return res.json(fallback);
    }

    const systemInstruction = `You are the expert AI Inventory & Merchandising Analyst for Omega Supermarket.
You have real-time access to the store's shelf inventory, pricing, capacities, and sales velocity data across all 8 aisles:
- Aisle 1: Bakery & Fresh
- Aisle 2: Cold Drinks
- Aisle 3: Beauty & Care
- Aisle 4: Pharmacy (generic health & wellness only, no medical claims)
- Aisle 5: Apparel & Basics
- Aisle 6: Electronics
- Aisle 7: Home & Kitchen
- Aisle 8: Kids & Toys

Live Store Inventory & Sales Data:
${JSON.stringify(inventoryData)}

CRITICAL INSTRUCTIONS:
1. DIRECT ANSWER FIRST: Directly and accurately answer the store manager's specific question or prompt. Address EXACTLY what was asked using the provided data.
2. PRECISE NUMBERS: If asked about a product, aisle, restock needs, revenue, sales, or capacity, cite the exact quantities, aisle numbers, and dollar values from the store data.
3. RELEVANT PRODUCTS: In "priorityRestockIds", return an array of product IDs matching the items discussed, needing restock, or relevant to the user query.
4. ACTIONABLE SUGGESTIONS: In "pricingSuggestions", provide concrete pricing or restock recommendations when applicable.
5. Never provide a generic canned answer when a specific question was asked.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: {
              type: Type.STRING,
              description: 'Accurate, thorough response directly answering the manager question using store figures and aisle locations.',
            },
            priorityRestockIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Product IDs of relevant products or items needing restock.',
            },
            pricingSuggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  productId: { type: Type.STRING },
                  suggestedAction: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
                required: ['productId', 'suggestedAction', 'reason'],
              },
              description: 'Optional list of promotional pricing or inventory actions.',
            },
          },
          required: ['analysis', 'priorityRestockIds'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Inventory API Error:', error);
    // Graceful fallback to local intelligence engine
    const fallback = analyzeStoreInventoryLocally(req.body.prompt || '', req.body.inventoryData || []);
    return res.json(fallback);
  }
});

const httpServer = http.createServer(app);

// Mount Vite or serve static dist
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: {
      middlewareMode: true,
      hmr: false, // HMR is disabled in AI Studio per environment constraints
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Omega 3D Supermarket running at http://0.0.0.0:${port}`);
});
