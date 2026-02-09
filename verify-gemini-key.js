import * as fs from 'fs';
import https from 'https';

console.log("🔐 Gemini API Key Verification Tool\n");

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
  console.log("❌ No API key found in .env file");
  console.log("\n📝 Add to your .env file:");
  console.log("VITE_GEMINI_API_KEY=your-api-key-here");
  process.exit(1);
}

console.log("✅ API Key found in .env");
console.log(`   Preview: ${apiKey.substring(0, 20)}...${apiKey.substring(apiKey.length - 5)}`);
console.log(`   Length: ${apiKey.length} characters`);
console.log(`   Starts with: ${apiKey.substring(0, 5)}`);

// Validate format
if (!apiKey.startsWith('AIza')) {
  console.log("\n⚠️  WARNING: API key doesn't start with 'AIza'");
  console.log("   Standard Gemini API keys should start with 'AIza'");
}

if (apiKey.length < 30) {
  console.log("\n⚠️  WARNING: API key seems too short");
  console.log("   Standard Gemini API keys are typically 39 characters");
}

// Test with a simple HTTP request
console.log("\n🌐 Testing API connectivity...\n");

const testUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(testUrl, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`   HTTP Status: ${res.statusCode}`);
    
    if (res.statusCode === 200) {
      console.log("   ✅ API Key is VALID!\n");
      try {
        const json = JSON.parse(data);
        if (json.models && json.models.length > 0) {
          console.log("📋 Available Models:");
          json.models.forEach(model => {
            console.log(`   • ${model.name} - ${model.displayName || 'N/A'}`);
          });
          
          console.log("\n✅ Your Gemini integration is properly configured!");
          console.log("   You can use these model names in your code:");
          json.models.slice(0, 3).forEach(model => {
            const modelName = model.name.replace('models/', '');
            console.log(`   - ${modelName}`);
          });
        }
      } catch (err) {
        console.log("Response data:", data.substring(0, 500));
      }
    } else if (res.statusCode === 400) {
      console.log("   ❌ API Key is INVALID (400 Bad Request)");
      console.log("\n🔧 Solutions:");
      console.log("   1. Get a NEW key: https://aistudio.google.com/apikey");
      console.log("   2. Make sure you copied the ENTIRE key");
      console.log("   3. Check for extra spaces or quotes in .env file");
    } else if (res.statusCode === 403) {
      console.log("   ❌ API Key is VALID but ACCESS DENIED (403 Forbidden)");
      console.log("\n🔧 Possible issues:");
      console.log("   1. Gemini API is not enabled for this key");
      console.log("   2. Billing/quota issues");
      console.log("   3. Geographic restrictions");
    } else {
      console.log("   ❌ Unexpected error");
      console.log("   Response:", data.substring(0, 500));
    }
  });
}).on('error', (err) => {
  console.log("   ❌ Network error:", err.message);
  console.log("\n🔧 Check your internet connection");
});
