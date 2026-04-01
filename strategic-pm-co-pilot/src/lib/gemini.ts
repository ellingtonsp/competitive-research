import { GoogleGenAI, Type } from "@google/genai";

const MODEL_NAME = "gemini-3.1-flash-lite-preview";

export async function fetchMarketActivity(competitors: any[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API Key missing");

  const ai = new GoogleGenAI({ apiKey });
  
  const competitorNames = competitors.map(c => c.name).filter(Boolean);
  if (competitorNames.length === 0) return [];

  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const prompt = `Today is ${currentDate}. Find the most recent press releases, news stories, and market activity for the following competitors: ${competitorNames.join(", ")}. 
Focus on product launches, funding, partnerships, or major strategic shifts from the last 3-6 months. Ensure the information is as current as possible.`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            link: { type: Type.STRING },
            snippet: { type: Type.STRING },
            date: { type: Type.STRING },
            source: { type: Type.STRING },
          },
          required: ["id", "title", "link", "snippet"]
        }
      }
    },
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse market activity:", e);
    return [];
  }
}

export async function generateStrategicActions(companyData: any, competitors: any[], marketNews: any[] = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API Key missing");

  const ai = new GoogleGenAI({ apiKey });

  const marketContext = marketNews.length > 0 
    ? `\nRecent Market Activity:\n${marketNews.map(n => `- [${n.source}] ${n.title}: ${n.snippet}`).join("\n")}`
    : "";

  const prompt = `Based on our company profile, competitive research, and recent market activity, generate a list of 5-7 prioritized strategic actions (tickets).
Each action should be tactical and ready for an execution pipeline (like Linear).

Context:
Company: ${companyData.name}
Value Prop: ${companyData.valueProposition}
Competitors: ${competitors.map(c => c.name).join(", ")}
${marketContext}

Output a JSON array of objects.`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            priority: { type: Type.STRING, enum: ["high", "medium", "low"] },
            type: { type: Type.STRING, enum: ["feature", "positioning", "marketing"] },
          },
          required: ["id", "title", "description", "priority", "type"]
        }
      }
    },
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse strategic actions:", e);
    return [];
  }
}

export async function generateStrategicContent(type: 'positioning' | 'battlecard' | 'brief', companyData: any, competitors: any[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please configure it in the Secrets panel.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const systemInstruction = `You are a Senior Product Manager with an MBA from Harvard Business School and a decade of experience in Silicon Valley. 
Your tone is professional, strategic, and focused on "First Principles" differentiation. 
Avoid corporate buzzwords. Focus on hard-hitting insights that help a PM win in a competitive market.
Render your response in clean, structured Markdown. Use Markdown tables for any structured data comparison or 2x2 grids.`;

  let prompt = "";

  const companyContext = `
My Company: ${companyData.name}
Target Audience: ${companyData.targetAudience}
Value Proposition: ${companyData.valueProposition}
Key Features: ${companyData.keyFeatures}
Pricing Model: ${companyData.pricingModel}
Secret Sauce: ${companyData.secretSauce}
`;

  const competitorContext = competitors.map(c => `
Competitor: ${c.name}
URL: ${c.url}
Strengths/Weaknesses: ${c.notes}
`).join("\n");

  if (type === 'positioning') {
    prompt = `Generate a high-stakes Narrative Positioning Statement for my company. 
Use the [Target-Category-Benefit-Differentiation] framework.
Context:
${companyContext}
${competitorContext}

The output should be a single, powerful narrative that defines why we win.`;
  } else if (type === 'battlecard') {
    prompt = `Generate a Competitive Battlecard for my company against the listed competitors.
Format it as a 2x2 grid using Markdown tables covering:
1. How to Win (Our unique advantages)
2. Where They Struggle (Their core vulnerabilities)
3. Landmines to Drop (Questions for customers to ask that expose competitor weaknesses)
4. Quick Pitch (A 30-second elevator pitch)

Use a Markdown table for the 2x2 grid if possible, or clear sections with sub-tables.

Context:
${companyContext}
${competitorContext}`;
  } else if (type === 'brief') {
    prompt = `Generate a comprehensive Research Brief (PRD-style) summarizing the competitive landscape.
Include:
- Executive Summary
- Market Dynamics
- Deep Dive on each competitor
- Strategic Recommendations for our product roadmap
- Risks and Mitigations

Context:
${companyContext}
${competitorContext}`;
  }

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      systemInstruction,
    },
  });

  return response.text;
}
