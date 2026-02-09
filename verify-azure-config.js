import { AzureOpenAI } from "openai";
import * as fs from 'fs';
import * as path from 'path';

console.log("🔍 Checking Azure OpenAI Configuration...\n");

// Read .env file
const envPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  console.log("❌ .env file not found!");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^VITE_AZURE_OPENAI_(\w+)=(.+)$/);
  if (match) {
    envVars[match[1]] = match[2].trim();
  }
});

console.log("📝 Configuration Found:");
console.log(`✓ Endpoint: ${envVars.ENDPOINT || 'NOT SET'}`);
console.log(`✓ API Key: ${envVars.KEY ? envVars.KEY.substring(0, 20) + '...' : 'NOT SET'}`);
console.log(`✓ Deployment: ${envVars.DEPLOYMENT || 'NOT SET'}\n`);

if (!envVars.ENDPOINT || !envVars.KEY || !envVars.DEPLOYMENT) {
  console.log("❌ Missing configuration. Please check your .env file.\n");
  process.exit(1);
}

async function testConnection() {
  try {
    console.log("🔗 Testing connection to Azure OpenAI...\n");
    
    const client = new AzureOpenAI({
      endpoint: envVars.ENDPOINT,
      apiKey: envVars.KEY,
      apiVersion: "2024-10-21",
      deployment: envVars.DEPLOYMENT
    });

    console.log("📤 Sending test request...\n");
    
    const result = await client.chat.completions.create({
      model: envVars.DEPLOYMENT,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Say 'Hello! Azure OpenAI is working!'" }
      ],
      max_tokens: 50
    });

    console.log("✅ SUCCESS! Azure OpenAI is working!\n");
    console.log("🤖 Response:", result.choices[0].message.content);
    console.log("\n📊 Tokens used:", result.usage.total_tokens);
    console.log("\n✅ Your chatbot is ready to use Azure OpenAI! 🎉\n");
    
  } catch (error) {
    console.log("\n❌ Connection Failed!\n");
    
    if (error.status === 404) {
      console.log("🚨 DEPLOYMENT NOT FOUND");
      console.log("━".repeat(60));
      console.log("The deployment '" + envVars.DEPLOYMENT + "' doesn't exist.");
      console.log("\n📝 TO FIX THIS:");
      console.log("1. Go to: https://ai.azure.com");
      console.log("2. Click 'Deployments' in left menu");
      console.log("3. Click '+ Deploy model'");
      console.log("4. Choose 'gpt-4o-mini' (recommended)");
      console.log("5. Name it: gpt-4o-mini");
      console.log("6. Click 'Deploy'");
      console.log("\n7. Update your .env file:");
      console.log("   VITE_AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini");
      console.log("━".repeat(60));
    } else if (error.status === 401) {
      console.log("🚨 AUTHENTICATION FAILED");
      console.log("Your API key might be incorrect.");
      console.log("Go to Azure portal → Your OpenAI resource → Click 'Click here to manage keys'");
    } else {
      console.log("Error details:", error.message);
    }
    
    console.log("\n💡 TIP: Your chatbot works WITHOUT Azure OpenAI using pattern matching!");
    console.log("   Just ignore this error and use the chatbot - it works great!\n");
  }
}

testConnection();
