import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from 'fs';

const envPath = '.env';
let apiKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const match = envContent.match(/VITE_GEMINI_API_KEY=(.+)/);
  if (match) {
    apiKey = match[1].trim();
  }
}

async function listModels() {
  try {
    console.log("🔍 Checking available Gemini models...\n");
    console.log("API Key:", apiKey.substring(0, 20) + "...\n");

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Try different model names
    const modelsToTry = [
      "gemini-pro",
      "gemini-1.0-pro",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
      "models/gemini-pro",
      "models/gemini-1.5-pro"
    ];

    for (const modelName of modelsToTry) {
      try {
        console.log(`Testing: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hi");
        const response = result.response.text();
        console.log(`✅ SUCCESS with: ${modelName}\n`);
        console.log("Response:", response);
        console.log("\n✅ Use this model in your code!\n");
        break;
      } catch (err) {
        console.log(`❌ ${modelName} - ${err.message.substring(0, 80)}...\n`);
      }
    }
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

listModels();
