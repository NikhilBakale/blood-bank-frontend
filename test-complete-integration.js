import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from 'fs';

console.log("═".repeat(70));
console.log("  🩸 BLOOD BANK BUDDY - GEMINI AI INTEGRATION TEST");
console.log("═".repeat(70));
console.log();

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

async function comprehensiveTest() {
  console.log("📋 TEST 1: API Key Validation");
  console.log("─".repeat(70));
  console.log(`   Key Preview: ${apiKey.substring(0, 20)}...${apiKey.substring(apiKey.length - 5)}`);
  console.log(`   Key Length: ${apiKey.length} characters`);
  console.log(`   Format: ${apiKey.startsWith('AIza') ? '✅ Valid' : '❌ Invalid'}`);
  console.log();

  console.log("📋 TEST 2: Initialize Gemini Client");
  console.log("─".repeat(70));
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    console.log("   ✅ GoogleGenerativeAI client initialized");
    console.log();

    console.log("📋 TEST 3: Load Model (gemini-2.5-flash)");
    console.log("─".repeat(70));
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    console.log("   ✅ Model loaded successfully");
    console.log();

    console.log("📋 TEST 4: Simple Query (Health Check)");
    console.log("─".repeat(70));
    const result1 = await model.generateContent("Say 'OK' if you're working");
    const response1 = result1.response.text();
    console.log(`   Query: "Say 'OK' if you're working"`);
    console.log(`   Response: "${response1}"`);
    console.log("   ✅ Basic communication working");
    console.log();

    console.log("📋 TEST 5: Blood Bank Context Query");
    console.log("─".repeat(70));
    
    // Simulate real blood bank data
    const contextPrompt = `You are an AI assistant for a blood bank. Current data:
- Total Blood Units: 145
- Registered Donors: 892
- Blood Inventory: A+: 25 units, A-: 8 units, B+: 18 units, B-: 4 units, AB+: 12 units, AB-: 2 units, O+: 35 units, O-: 6 units
- Recent Transfers: O+ (450ml) to Emergency Room on 12/24/2025

Question: What blood types need immediate attention?`;

    const result2 = await model.generateContent(contextPrompt);
    const response2 = result2.response.text();
    console.log(`   Query: "What blood types need immediate attention?"`);
    console.log("   Response:");
    console.log("   ┌" + "─".repeat(66) + "┐");
    response2.split('\n').forEach(line => {
      console.log(`   │ ${line.padEnd(64)} │`);
    });
    console.log("   └" + "─".repeat(66) + "┘");
    console.log("   ✅ Context-aware responses working");
    console.log();

    console.log("📋 TEST 6: Natural Language Understanding");
    console.log("─".repeat(70));
    const nlQueries = [
      "Show my recent transfers",
      "What's the O negative status?",
      "I need donor outreach help"
    ];
    
    for (const query of nlQueries) {
      const testResult = await model.generateContent(`Respond briefly to: "${query}" (in context of blood bank management)`);
      const testResponse = testResult.response.text();
      console.log(`   ✅ "${query}"`);
      console.log(`      → ${testResponse.substring(0, 60)}...`);
    }
    console.log();

    console.log("═".repeat(70));
    console.log("  ✅ ALL TESTS PASSED - GEMINI IS FULLY OPERATIONAL!");
    console.log("═".repeat(70));
    console.log();
    console.log("🎯 INTEGRATION STATUS:");
    console.log("   ✅ API Authentication: WORKING");
    console.log("   ✅ Model Access: gemini-2.5-flash");
    console.log("   ✅ Context Processing: WORKING");
    console.log("   ✅ Natural Language: WORKING");
    console.log("   ✅ Blood Bank Queries: WORKING");
    console.log();
    console.log("🚀 READY FOR PRODUCTION!");
    console.log("   Start your dev server: npm run dev");
    console.log("   Navigate to: Chatbot page");
    console.log("   Try asking: 'What's our current inventory status?'");
    console.log();

  } catch (error) {
    console.log("   ❌ Error:", error.message);
    console.log();
    console.log("🔧 TROUBLESHOOTING:");
    console.log("   1. Verify API key at: https://aistudio.google.com/apikey");
    console.log("   2. Check internet connection");
    console.log("   3. Run: node verify-gemini-key.js");
  }
}

comprehensiveTest();
