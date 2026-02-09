import { AzureOpenAI } from "openai";

// Test Azure OpenAI Configuration
const endpoint = "https://bloodinventoryai.openai.azure.com/";
const apiKey = "YOUR_AZURE_OPENAI_KEY_HERE";
const deploymentName = "gpt-4o-mini";

async function testAzureOpenAI() {
  console.log("🧪 Testing Azure OpenAI Integration...\n");
  
  try {
    const client = new AzureOpenAI({
      endpoint,
      apiKey,
      apiVersion: "2024-10-21",
      deployment: deploymentName
    });

    console.log("✅ Client created successfully");
    console.log(`📍 Endpoint: ${endpoint}`);
    console.log(`🚀 Deployment: ${deploymentName}\n`);

    console.log("📤 Sending test message...");
    
    const result = await client.chat.completions.create({
      model: deploymentName,
      messages: [
        { 
          role: "system", 
          content: "You are a helpful assistant for a blood bank management system." 
        },
        { 
          role: "user", 
          content: "What is the importance of blood inventory management?" 
        }
      ],
      max_tokens: 150,
      temperature: 0.7
    });

    console.log("\n✅ Response received successfully!\n");
    console.log("📥 AI Response:");
    console.log("─".repeat(60));
    console.log(result.choices[0]?.message?.content);
    console.log("─".repeat(60));
    
    console.log("\n📊 Usage Stats:");
    console.log(`- Prompt tokens: ${result.usage?.prompt_tokens}`);
    console.log(`- Completion tokens: ${result.usage?.completion_tokens}`);
    console.log(`- Total tokens: ${result.usage?.total_tokens}`);
    
    console.log("\n✅ Azure OpenAI Integration: WORKING PERFECTLY! 🎉");
    
  } catch (error) {
    console.error("\n❌ Error testing Azure OpenAI:");
    console.error(error);
    
    if (error.message?.includes("401")) {
      console.error("\n⚠️  Authentication failed. Please check your API key.");
    } else if (error.message?.includes("404")) {
      console.error("\n⚠️  Deployment not found. Please check your deployment name.");
    } else if (error.message?.includes("429")) {
      console.error("\n⚠️  Rate limit exceeded. Please wait a moment and try again.");
    }
  }
}

testAzureOpenAI();
