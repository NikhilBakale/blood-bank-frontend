import { AzureOpenAI } from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/index";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Azure OpenAI Configuration
const endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT || "";
const apiKey = import.meta.env.VITE_AZURE_OPENAI_KEY || "";
const deploymentName = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT || "gpt-35-turbo";

// Google Gemini Configuration (FREE!)
const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
let geminiClient: GoogleGenerativeAI | null = null;

const getGeminiClient = () => {
  if (!geminiClient && geminiApiKey) {
    geminiClient = new GoogleGenerativeAI(geminiApiKey);
  }
  return geminiClient;
};

let client: AzureOpenAI | null = null;

// Initialize Azure OpenAI client
const getClient = () => {
  if (!client && endpoint && apiKey) {
    client = new AzureOpenAI({
      endpoint,
      apiKey,
      apiVersion: "2024-10-21",
      deployment: deploymentName
    });
  }
  return client;
};

// Check if Azure OpenAI is configured
export const isAzureAIEnabled = () => {
  return Boolean(endpoint && apiKey && deploymentName);
};

// Check if Gemini is configured
export const isGeminiEnabled = () => {
  return Boolean(geminiApiKey);
};

// Check if any AI service is enabled
export const isAIEnabled = () => {
  return isGeminiEnabled() || isAzureAIEnabled();
};

// Get active AI provider name
export const getAIProvider = () => {
  if (isGeminiEnabled()) return "Google Gemini";
  if (isAzureAIEnabled()) return "Azure OpenAI";
  return "Pattern Matching";
};

type ContextData = {
  inventory: any;
  transfers: any[];
  analytics: any;
  stats: {
    totalUnits: number;
    donorCount: number;
    pendingRequests: number;
    urgentRequests: number;
  };
};

// Get AI response from Google Gemini (FREE!)
const getGeminiResponse = async (
  userMessage: string,
  contextData: ContextData
): Promise<string> => {
  const client = getGeminiClient();
  
  if (!client) {
    throw new Error("Gemini API key not configured");
  }

  // Build context summary
  const inventorySummary = Object.entries(contextData.inventory.bloodTypeInventory || {})
    .map(([type, volume]) => `${type}: ${Math.floor((volume as number) / 350)} units`)
    .join(", ");

  const recentTransfers = contextData.transfers.slice(0, 3).map(t => 
    `${t.blood_type}${t.rh_factor} (${t.volume_ml}ml) to ${t.patient_name || 'recipient'} on ${new Date(t.transfer_date).toLocaleDateString()}`
  ).join("; ");

  const systemPrompt = `You are an AI assistant for a blood bank inventory management system. You help hospital staff manage blood inventory, track transfers, analyze donor activity, and ensure patient safety.

Current Hospital Data:
- Total Blood Units: ${contextData.stats.totalUnits}
- Registered Donors: ${contextData.stats.donorCount}
- Pending Requests: ${contextData.stats.pendingRequests}
- Urgent Requests: ${contextData.stats.urgentRequests}
- Blood Inventory: ${inventorySummary}
- Recent Transfers: ${recentTransfers || "No recent transfers"}
- Recent Donations: ${contextData.analytics.donationsPerDay?.reduce((sum: number, d: any) => sum + d.count, 0) || 0} in last 7 days

Guidelines:
1. Be concise and professional
2. Prioritize patient safety in recommendations
3. Highlight critical shortages (< 5 units)
4. Suggest actionable next steps
5. Use medical terminology appropriately
6. Format responses with bullet points and sections for readability`;

  try {
    const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(`${systemPrompt}\n\nUser Query: ${userMessage}`);
    const response = result.response.text();
    
    if (!response) {
      throw new Error("No response from Gemini");
    }

    return response;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(`Gemini service error: ${error.message}`);
  }
};

// Get AI response - tries Gemini first, then Azure OpenAI
export const getAzureAIResponse = async (
  userMessage: string,
  contextData: ContextData
): Promise<string> => {
  // Try Gemini first if enabled (FREE!)
  if (isGeminiEnabled()) {
    try {
      return await getGeminiResponse(userMessage, contextData);
    } catch (error) {
      console.warn("Gemini failed, trying Azure OpenAI:", error);
      // Fall through to Azure OpenAI
    }
  }

  const aiClient = getClient();
  
  if (!aiClient) {
    throw new Error("No AI service configured. Add VITE_GEMINI_API_KEY to .env file for FREE AI!");
  }

  // Build context summary (keep it concise to reduce tokens)
  const inventorySummary = Object.entries(contextData.inventory.bloodTypeInventory || {})
    .map(([type, volume]) => `${type}: ${Math.floor((volume as number) / 350)} units`)
    .join(", ");

  const recentTransfers = contextData.transfers.slice(0, 3).map(t => 
    `${t.blood_type}${t.rh_factor} (${t.volume_ml}ml) to ${t.patient_name || 'recipient'} on ${new Date(t.transfer_date).toLocaleDateString()}`
  ).join("; ");

  const systemPrompt = `You are an AI assistant for a blood bank inventory management system. You help hospital staff manage blood inventory, track transfers, analyze donor activity, and ensure patient safety.

Current Hospital Data:
- Total Blood Units: ${contextData.stats.totalUnits}
- Registered Donors: ${contextData.stats.donorCount}
- Pending Requests: ${contextData.stats.pendingRequests}
- Urgent Requests: ${contextData.stats.urgentRequests}
- Blood Inventory: ${inventorySummary}
- Recent Transfers: ${recentTransfers || "No recent transfers"}
- Recent Donations: ${contextData.analytics.donationsPerDay?.reduce((sum: number, d: any) => sum + d.count, 0) || 0} in last 7 days

Guidelines:
1. Be concise and professional
2. Prioritize patient safety in recommendations
3. Highlight critical shortages (< 5 units)
4. Suggest actionable next steps
5. Use medical terminology appropriately
6. Format responses with bullet points and sections for readability

Respond to the user's query with accurate, data-driven insights.`;

  try {
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ];

    const result = await aiClient.chat.completions.create({
      model: deploymentName,
      messages,
      temperature: 0.7,
      max_tokens: 800,
      top_p: 0.95,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    const response = result.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error("No response from Azure OpenAI");
    }

    return response;
  } catch (error: any) {
    console.error("Azure OpenAI Error:", error);
    throw new Error(`AI service error: ${error.message}`);
  }
};

// Stream response for better UX (optional advanced feature)
export const streamAzureAIResponse = async (
  userMessage: string,
  contextData: ContextData,
  onChunk: (chunk: string) => void
): Promise<void> => {
  const aiClient = getClient();
  
  if (!aiClient) {
    throw new Error("Azure OpenAI not configured");
  }

  const inventorySummary = Object.entries(contextData.inventory.bloodTypeInventory || {})
    .map(([type, volume]) => `${type}: ${Math.floor((volume as number) / 350)} units`)
    .join(", ");

  const systemPrompt = `You are an AI assistant for a blood bank. Current data: ${contextData.stats.totalUnits} units, ${contextData.stats.donorCount} donors. Inventory: ${inventorySummary}. Be concise and actionable.`;

  try {
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ];

    const stream = await aiClient.chat.completions.create({
      model: deploymentName,
      messages,
      max_tokens: 800,
      temperature: 0.7,
      stream: true
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        onChunk(delta);
      }
    }
  } catch (error: any) {
    console.error("Azure OpenAI Streaming Error:", error);
    throw new Error(`AI streaming error: ${error.message}`);
  }
};
