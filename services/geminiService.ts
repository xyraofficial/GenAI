import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ChatSource, ToolMode } from "../types";

interface GenerateParams {
  prompt: string;
  apiKey?: string;
  mode: ToolMode;
  systemInstruction?: string;
}

interface GenAIResult {
  text: string;
  images?: string[];
  sources?: ChatSource[];
}

// Helper to get location for Maps Grounding
const getCurrentLocation = (): Promise<{ latitude: number; longitude: number } | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.warn("Geolocation error:", error);
        resolve(null);
      },
      { timeout: 5000 }
    );
  });
};

export const generateResponse = async ({
  prompt,
  apiKey,
  mode,
  systemInstruction
}: GenerateParams): Promise<GenAIResult> => {
  
  // Use user-provided key or fallback to system environment variable
  const finalApiKey = apiKey || process.env.API_KEY;

  if (!finalApiKey) {
    throw new Error("API configuration missing. Please add API_KEY to your environment variables or user profile.");
  }

  const ai = new GoogleGenAI({ apiKey: finalApiKey });
  let modelName = 'gemini-3-flash-preview'; // Default "Fast" model
  let tools: any[] = [];
  let toolConfig: any = undefined;
  let config: any = { systemInstruction };

  // --- Feature Configuration Logic ---

  if (mode === 'image') {
    // Generate High-Quality Images
    modelName = 'gemini-3-pro-image-preview'; 
    config = {
      ...config,
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "1K"
      }
    };
    // Note: Image gen uses 'generateContent' in @google/genai but we handle response differently
  } else if (mode === 'search') {
    // Search Grounding
    modelName = 'gemini-3-pro-preview';
    tools = [{ googleSearch: {} }];
  } else if (mode === 'maps') {
    // Maps Grounding - MUST use Gemini 2.5 series
    modelName = 'gemini-2.5-flash';
    tools = [{ googleMaps: {} }];
    
    // Get location for better context
    const location = await getCurrentLocation();
    if (location) {
      toolConfig = {
        retrievalConfig: {
          latLng: location
        }
      };
    }
  } else if (mode === 'thinking') {
    // Deep Thinking
    modelName = 'gemini-3-pro-preview';
    config = {
      ...config,
      thinkingConfig: { thinkingBudget: 2048 } // Allow significant reasoning
    };
  } else {
    // Standard Chat (Fast)
    // Using Flash 3 for "Fast AI responses" (Bolt icon)
    modelName = 'gemini-3-flash-preview';
  }

  // --- API Call ---

  try {
    const callConfig: any = {
      model: modelName,
      contents: prompt,
      config: {
        ...config,
      }
    };

    if (tools.length > 0) {
      callConfig.config.tools = tools;
    }
    if (toolConfig) {
      callConfig.config.toolConfig = toolConfig;
    }

    const response: GenerateContentResponse = await ai.models.generateContent(callConfig);

    // --- Response Parsing ---

    let text = "";
    const images: string[] = [];
    const sources: ChatSource[] = [];

    // 1. Handle Candidate Content (Text & Images)
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const content = candidates[0].content;
      
      if (content.parts) {
        for (const part of content.parts) {
          if (part.text) {
            text += part.text;
          }
          if (part.inlineData && part.inlineData.data) {
             // Handle generated image bytes
             const mimeType = part.inlineData.mimeType || 'image/png';
             images.push(`data:${mimeType};base64,${part.inlineData.data}`);
          }
        }
      }

      // 2. Handle Grounding Metadata (Search & Maps)
      const groundingMetadata = candidates[0].groundingMetadata;
      if (groundingMetadata && groundingMetadata.groundingChunks) {
        
        for (const chunk of groundingMetadata.groundingChunks) {
          // Web Search Sources
          if (chunk.web && chunk.web.uri) {
            sources.push({
              title: chunk.web.title || 'Web Source',
              uri: chunk.web.uri,
              type: 'web'
            });
          }
          // Maps Sources
          if (chunk.map && chunk.map.uri) { // Assuming map structure provided by SDK logic often varies, checking common fields
             // The Gemini API specifically returns chunks.web for search. 
             // For Maps, it is often implicit in text, but if available in chunks:
             // (Adjusted based on standard GroundingChunk types)
             sources.push({
               title: chunk.map.title || 'Map Location',
               uri: chunk.map.uri,
               type: 'map'
             });
          }
        }
      }
    }

    // Fallback if no text but images exist
    if (!text && images.length > 0) {
      text = "Here is the generated image:";
    } else if (!text && !images.length) {
      throw new Error("No content generated.");
    }

    return { text, images, sources };

  } catch (error: any) {
    console.error("Gemini Feature Error:", error);
    if (error.message?.includes("403")) {
       throw new Error("Permission denied. Your API key may not support this model/feature.");
    }
    throw new Error(error.message || "Failed to generate content.");
  }
};