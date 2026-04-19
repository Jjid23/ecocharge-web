import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface BottleAnalysis {
  type: 'PET' | 'HDPE' | 'REJECTED' | 'UNKNOWN';
  confidence: number;
  reason: string;
  tip?: string;
  brand?: string;
}

export async function analyzeBottle(base64Image: string): Promise<BottleAnalysis> {
  if (!base64Image || base64Image.length < 100) {
    return {
      type: 'UNKNOWN',
      confidence: 0,
      reason: "Sensor warming up... Warming optics.",
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
          {
            text: `You are a specialized industrial visual inspection AI. Analyze this image from a recycling kiosk camera with maximum precision. 
            1. Identify if a plastic bottle is present. 
            2. If present, determine if it is PET (Polyethylene Terephthalate) or HDPE (High-Density Polyethylene). 
            3. If no bottle is found, or if it is a different object, set type to 'REJECTED' and reason to 'No bottle detected'. 
            4. If the confidence is below 0.8, YOU MUST provide a specific, actionable tip:
               - If cut off: 'Try to center the bottle'
               - If dark: 'Ensure better lighting'
               - If blurry: 'Hold the bottle still for a sharper scan'
               - If too close/far: 'Adjust bottle distance from sensor'
               - If labels hidden: 'Rotate bottle to show label or logo'
            5. Always look for and extract the Brand Name (e.g., Coca-Cola, Pepsi, Dasani, etc.).
            Provide the result in JSON format with type, confidence (0-1), reason, tip, and brand.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: {
              type: Type.STRING,
              enum: ['PET', 'HDPE', 'REJECTED', 'UNKNOWN'],
              description: "The type of plastic identified.",
            },
            confidence: {
              type: Type.NUMBER,
              description: "Confidence level of the identification from 0 to 1.",
            },
            reason: {
              type: Type.STRING,
              description: "Brief reason for the classification.",
            },
            tip: {
              type: Type.STRING,
              description: "A specific tip for the user if confidence is low (e.g., 'Center the bottle', 'More light').",
            },
            brand: {
              type: Type.STRING,
              description: "Brand name if visible on the bottle.",
            },
          },
          required: ['type', 'confidence', 'reason'],
        },
      },
    });

    const result = JSON.parse(response.text || '{}');
    return {
      type: result.type || 'UNKNOWN',
      confidence: result.confidence || 0,
      reason: result.reason || 'Analysis incomplete',
      tip: result.tip,
      brand: result.brand,
    };
  } catch (error: any) {
    console.error("Gemini analysis failed:", error);
    const errorMessage = error?.message || "";
    const isQuotaError = errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED");
    const isInvalidImage = errorMessage.includes("400") || errorMessage.includes("INVALID_ARGUMENT") || errorMessage.includes("input image");
    
    return {
      type: 'UNKNOWN',
      confidence: 0,
      reason: isQuotaError 
        ? "AI Quota temporary Limit reached. Please wait a minute and try again." 
        : isInvalidImage
        ? "Optical feed glitch. AI is recalibrating..."
        : "AI connection unstable. Switching to standard sensors.",
    };
  }
}
