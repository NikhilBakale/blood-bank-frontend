import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from 'fs';

console.log("🧪 Testing Google Gemini Integration...\n");

// Read API key from .env
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
  console.log("❌ Gemini API key not found in .env file\n");
  console.log("📝 TO GET FREE API KEY:");
  console.log("1. Go to: https://makersuite.google.com/app/apikey");
  console.log("2. Click 'Create API Key'");
  console.log("3. Copy the key (starts with AIza...)");
  console.log("4. Add to .env file:");
  console.log("   VITE_GEMINI_API_KEY=your-key-here\n");
  process.exit(1);
}

async function testGemini() {
  try {
    console.log("✅ API key found:", apiKey.substring(0, 15) + "...\n");
    console.log("📤 Sending test message to Gemini...\n");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent("Say 'Hello! Google Gemini AI is working perfectly for your blood bank chatbot!'");
    const response = result.response.text();

    console.log("✅ SUCCESS! Gemini is working!\n");
    console.log("🤖 Response:");
    console.log("─".repeat(60));
    console.log(response);
    console.log("─".repeat(60));
    
    console.log("\n✅ Your chatbot now has AI capabilities! 🎉");
    console.log("\n📊 Features:");
    console.log("• FREE - No credit card required");
    console.log("• 15 requests per minute");
    console.log("• Natural language understanding");
    console.log("• Contextual responses");
    console.log("\n🚀 Restart your dev server to use AI in the chatbot!");
    
  } catch (error) {
    console.log("\n❌ Error testing Gemini:\n");
    
    if (error.message?.includes("API_KEY_INVALID") || error.message?.includes("400")) {
      console.log("🚨 INVALID API KEY");
      console.log("Your API key might be incorrect.");
      console.log("\nGet a new key at: https://makersuite.google.com/app/apikey");
    } else {
      console.log("Error details:", error.message);
    }
  }
}

testGemini();
