import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

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

// AI Shopping Concierge Endpoint
app.post('/api/ai/concierge', async (req, res) => {
  try {
    const { prompt, currentCart = [], availableProducts = [] } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        reply: "Welcome to Omega! I can suggest items and recipes. (Please ensure GEMINI_API_KEY is configured in Settings > Secrets for live AI generation).",
        recommendedProductIds: []
      });
    }

    const simplifiedCatalog = availableProducts.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      aisle: p.aisleNumber
    }));

    const systemInstruction = `You are the friendly, knowledgeable in-store AI Concierge at Omega Supermarket.
You help shoppers plan meals, find ingredients, suggest budget items, and recommend products from the store.
Here is the store's current catalog:
${JSON.stringify(simplifiedCatalog)}

Rules:
1. Always be helpful, concise, and upbeat.
2. Suggest 1 to 4 relevant products from the catalog matching the user's request.
3. Return your response in JSON format matching this schema:
{
  "reply": "Conversational helpful advice (2-4 sentences)",
  "recommendedProductIds": ["id1", "id2"] // Only valid ids from catalog
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Concierge API Error:', error);
    return res.status(500).json({
      error: 'Failed to generate concierge response',
      details: error.message || String(error)
    });
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
      return res.json({
        analysis: "Manager Stock Intelligence: 3 critical items require immediate restock in Fresh Foods and Drinks. (Configure GEMINI_API_KEY in Secrets for live AI forecasting).",
        priorityRestockIds: [],
        pricingSuggestions: []
      });
    }

    const systemInstruction = `You are the AI Inventory & Merchandising Analyst for Omega Supermarket.
Analyze the current shelf stock levels, capacities, and reorder levels.
Current inventory state:
${JSON.stringify(inventoryData)}

Provide actionable store manager insights:
- Highlight stockouts and urgent replenishment items
- Estimate stock velocity or reorder prioritization
- Suggest promotional pricing adjustments if applicable
Return JSON matching this schema:
{
  "analysis": "Executive summary with 2-4 bullet points for the store manager",
  "priorityRestockIds": ["id1", "id2"],
  "pricingSuggestions": [
    { "productId": "id", "suggestedAction": "Keep or discount by 10%", "reason": "reason" }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Inventory API Error:', error);
    return res.status(500).json({
      error: 'Failed to generate inventory analysis',
      details: error.message || String(error)
    });
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
