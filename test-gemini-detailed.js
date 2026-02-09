import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from 'fs';

console.log("🔍 Detailed Gemini API Diagnostic\n");

// Read API key
const envPath = '.env';
let apiKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const match = envContent.match(/VITE_GEMINI_API_KEY=(.+)/);
  if (match) {
    apiKey = match[1].trim();
  }
}

if (!apiKey) {
  console.log("❌ No API key found");
  process.exit(1);
}

console.log(`✅ API Key loaded: ${apiKey.substring(0, 20)}...${apiKey.substring(apiKey.length - 5)}`);
console.log(`📏 Key length: ${apiKey.length} characters\n`);

async function diagnostics() {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    console.log("📋 Testing model access...\n");
    
    // Test 1: Try to list models (if supported)
    console.log("Test 1: Attempting to list available models...");
    try {
      // Note: listModels might not be available in all SDK versions
      const models = await genAI.listModels?.();
      if (models) {
        console.log("✅ Available models:");
        console.log(models);
      }
    } catch (err) {
      console.log("⚠️  List models not available or failed:", err.message);
    }
    
    console.log("\nTest 2: Testing direct model access...\n");
    
    // Test different model names with latest API
    const modelsToTest = [
      "gemini-2.0-flash-exp",
      "gemini-1.5-flash-latest",
      "gemini-1.5-flash",
      "gemini-1.5-pro-latest", 
      "gemini-1.5-pro",
      "gemini-pro",
      "gemini-1.0-pro-latest",
      "gemini-1.0-pro"
    ];
    
    for (const modelName of modelsToTest) {
      try {
        console.log(`   Testing: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Reply with: Working!");
        const response = result.response.text();
        
        console.log(`   ✅ SUCCESS with ${modelName}`);
        console.log(`   Response: ${response}\n`);
        console.log("═".repeat(60));
        console.log(`🎉 WORKING MODEL FOUND: ${modelName}`);
        console.log("═".repeat(60));
        return modelName;
      } catch (err) {
        console.log(`   ❌ Failed: ${err.message.substring(0, 100)}`);
      }
    }
    
    console.log("\n❌ No working model found");
    console.log("\n🔧 Troubleshooting:");
    console.log("1. Check if API key is valid at: https://aistudio.google.com/apikey");
    console.log("2. Verify API key has Gemini API enabled");
    console.log("3. Check if there are any billing/quota issues");
    console.log("4. Try regenerating your API key");
    
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
  }
}

diagnostics();
