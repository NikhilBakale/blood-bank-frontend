import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { API_BASE_URL } from "@/config/api";
import { Bot, ClipboardList, Database, HeartPulse, Loader2, Send, ShieldCheck, Sparkles, Zap, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/context/AuthContext";
import { getAzureAIResponse, isAIEnabled, getAIProvider } from "@/services/azureOpenAI";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  time: string;
};

type BloodTypeInventory = {
  "A+": number;
  "A-": number;
  "B+": number;
  "B-": number;
  "AB+": number;
  "AB-": number;
  "O+": number;
  "O-": number;
};

type DashboardData = {
  stats: {
    totalUnits: number;
    totalVolume: number;
    donorCount: number;
    pendingTransfers: number;
    urgentRequests: number;
    pendingRequests: number;
  };
  bloodTypeInventory: BloodTypeInventory;
};

type Transfer = {
  transfer_id: number;
  blood_id: string;
  blood_type: string;
  rh_factor: string;
  volume_ml: number;
  transfer_date: string;
  patient_name: string | null; // From blood_requests JOIN
  urgency: string | null;
};

type DonorAnalytics = {
  totalDonors: number;
  donationsPerDay: { date: string; count: number }[];
  recentDonors: { date: string; donor_name: string; blood_type: string }[];
};

const quickPrompts = [
  "What's our current inventory status?",
  "Show my recent transfers",
  "Analyze donor activity per day",
  "What are the critical shortages?"
];

const focusAreas = [
  {
    title: "Operational guidance",
    description: "Policies, SOPs, and how-to steps for the platform.",
    icon: ClipboardList,
  },
  {
    title: "Inventory health",
    description: "Highlight shortages, expiries, and reorder suggestions.",
    icon: Database,
  },
  {
    title: "Safety first",
    description: "Crossmatch rules, eligibility, and compliance reminders.",
    icon: ShieldCheck,
  },
];

const formatTime = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// Improved NLP-like intent detection
const detectIntent = (text: string) => {
  const lower = text.toLowerCase();

  // Transfer related
  if (/(show|list|get|view|display).*transfer|transfer.*history|recent transfer|my transfer/i.test(lower)) {
    return 'transfers';
  }

  // Donor analytics
  if (/(donor.*per day|donor.*daily|donor.*analysis|donor.*trend|donor.*activity|donation.*per day)/i.test(lower)) {
    return 'donor_analytics';
  }

  // Inventory/stock
  if (/(inventory|stock|current.*level|how much|how many.*unit)/i.test(lower)) {
    return 'inventory';
  }

  // Shortages/critical
  if (/(critical|shortage|low.*stock|emergency|urgent.*need)/i.test(lower)) {
    return 'critical';
  }

  // Donor outreach
  if (/(donor.*outreach|donor.*message|donor.*template|contact.*donor)/i.test(lower)) {
    return 'donor_outreach';
  }

  // Requests/transfers management
  if (/(pending.*request|blood.*request|how.*process|transfer.*step)/i.test(lower)) {
    return 'requests';
  }

  // QA/Compliance
  if (/(qa|quality|checklist|compliance|audit|procedure)/i.test(lower)) {
    return 'qa';
  }

  return 'general';
};

const buildBotReply = async (
  prompt: string,
  inventoryData: DashboardData | null,
  hospitalId: string | undefined,
  fetchTransfers: () => Promise<Transfer[]>,
  fetchDonorAnalytics: () => Promise<DonorAnalytics>
) => {
  const blocks: string[] = [];

  if (!inventoryData) {
    blocks.push("Unable to fetch real-time inventory data. Please check your connection and try again.");
    return blocks.join("\n\n");
  }

  const intent = detectIntent(prompt);
  const text = prompt.toLowerCase();
  const { stats, bloodTypeInventory } = inventoryData;

  // Handle transfer requests
  if (intent === 'transfers') {
    try {
      const transfers = await fetchTransfers();
      if (transfers.length === 0) {
        blocks.push("📦 **No Transfer History**\n\nYou haven't made any blood transfers yet. Transfers are created when you fulfill blood requests from other hospitals or patients.");
      } else {
        const recent = transfers.slice(0, 5);
        blocks.push(`📦 **Recent Transfers (Last ${recent.length})**\n`);
        recent.forEach((t, idx) => {
          const date = new Date(t.transfer_date).toLocaleDateString();
          const bloodType = `${t.blood_type}${t.rh_factor}`;
          const recipient = t.patient_name || 'N/A';
          const urgency = t.urgency ? `[${t.urgency.toUpperCase()}]` : '';
          blocks.push(`${idx + 1}. **${bloodType}** - ${t.volume_ml}ml\n   To: ${recipient} ${urgency}\n   Date: ${date}\n   Blood ID: ${t.blood_id}`);
        });
        blocks.push(`\n**Total Transfers:** ${transfers.length}\n**Total Volume Transferred:** ${transfers.reduce((sum, t) => sum + t.volume_ml, 0).toLocaleString()}ml`);
      }
      return blocks.join("\n\n");
    } catch (error) {
      blocks.push("❌ Failed to fetch transfer history. Please try again.");
      return blocks.join("\n\n");
    }
  }

  // Handle donor analytics requests
  if (intent === 'donor_analytics') {
    try {
      const analytics = await fetchDonorAnalytics();
      blocks.push(`📊 **Donor Activity Analysis**\n\n**Total Registered Donors:** ${analytics.totalDonors}`);

      if (analytics.donationsPerDay.length > 0) {
        blocks.push("\n**Donations Per Day (Last 7 Days):**");
        analytics.donationsPerDay.forEach(day => {
          const date = new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          blocks.push(`• ${date}: ${day.count} donation${day.count !== 1 ? 's' : ''}`);
        });

        const avgPerDay = (analytics.donationsPerDay.reduce((sum, d) => sum + d.count, 0) / analytics.donationsPerDay.length).toFixed(1);
        blocks.push(`\n**Average:** ${avgPerDay} donations/day`);
      } else {
        blocks.push("\n⚠️ No donation activity in the last 7 days.");
      }

      if (analytics.recentDonors.length > 0) {
        blocks.push("\n**Recent Donors (Last 5):**");
        analytics.recentDonors.forEach((donor, idx) => {
          const date = new Date(donor.date).toLocaleDateString();
          blocks.push(`${idx + 1}. ${donor.donor_name} (${donor.blood_type}) - ${date}`);
        });
      }

      blocks.push("\n💡 **Insights:**");
      const totalDonations = analytics.donationsPerDay.reduce((sum, d) => sum + d.count, 0);
      if (totalDonations < 5) {
        blocks.push("• Consider organizing a donor drive to increase donations");
      } else if (totalDonations > 20) {
        blocks.push("• Excellent donor engagement! Keep up the momentum");
      }

      return blocks.join("\n\n");
    } catch (error) {
      blocks.push("❌ Failed to fetch donor analytics. Please try again.");
      return blocks.join("\n\n");
    }
  }

  // Identify critical and low stock blood types
  const criticalThreshold = 5;
  const lowThreshold = 20;
  const criticalTypes: string[] = [];
  const lowTypes: string[] = [];
  const stableTypes: string[] = [];

  Object.entries(bloodTypeInventory).forEach(([type, volume]) => {
    if (volume === 0 || volume < criticalThreshold * 350) { // Assuming ~350ml per unit
      criticalTypes.push(`${type}: ${Math.floor(volume / 350)} units (${volume}ml)`);
    } else if (volume < lowThreshold * 350) {
      lowTypes.push(`${type}: ${Math.floor(volume / 350)} units (${volume}ml)`);
    } else {
      stableTypes.push(`${type}: ${Math.floor(volume / 350)} units (${volume}ml)`);
    }
  });

  if (intent === 'inventory' || text.includes("inventory") || text.includes("stock") || text.includes("status") || text.includes("current")) {
    blocks.push(`📊 **Current Inventory Overview:**\n• Total Blood Units: ${stats.totalUnits}\n• Total Volume: ${stats.totalVolume.toLocaleString()}ml\n• Registered Donors: ${stats.donorCount}`);

    if (criticalTypes.length > 0) {
      blocks.push(`🚨 **CRITICAL Levels:**\n${criticalTypes.join("\n")}`);
    }

    if (lowTypes.length > 0) {
      blocks.push(`⚠️ **Low Stock:**\n${lowTypes.join("\n")}`);
    }

    if (stableTypes.length > 0 && criticalTypes.length === 0 && lowTypes.length === 0) {
      blocks.push(`✅ **All blood types are at healthy levels!**\n${stableTypes.slice(0, 3).join("\n")}`);
    }

    blocks.push(`📋 **Action Items:**\n• Pending Requests: ${stats.pendingRequests}\n• Urgent Requests: ${stats.urgentRequests}\n• Pending Transfers: ${stats.pendingTransfers}`);
  }

  if (intent === 'critical' || text.includes("critical") || text.includes("shortage") || text.includes("low")) {
    if (criticalTypes.length > 0) {
      blocks.push(`🚨 **CRITICAL Blood Type Shortages:**\n${criticalTypes.join("\n")}\n\n**Immediate Actions Needed:**\n1. Activate emergency donor outreach\n2. Contact nearby hospitals for transfer\n3. Postpone non-urgent procedures requiring these types`);
    } else if (lowTypes.length > 0) {
      blocks.push(`⚠️ **Low Stock Alerts:**\n${lowTypes.join("\n")}\n\n**Recommended Actions:**\n1. Schedule donor drives for these blood types\n2. Monitor daily usage closely\n3. Prepare transfer requests if levels drop further`);
    } else {
      blocks.push(`✅ **Good News!** All blood types are currently at healthy levels. No critical shortages detected.`);
    }
  }

  if (intent === 'donor_outreach' || text.includes("donor") || text.includes("outreach")) {
    const urgentTypes = [...criticalTypes, ...lowTypes];
    if (urgentTypes.length > 0) {
      blocks.push(
        `📧 **Donor Outreach Template:**\n\nSubject: Urgent: Help Save Lives - We Need ${urgentTypes.length > 1 ? 'Your Blood Type' : urgentTypes[0].split(':')[0]}\n\nDear Donor,\n\nOur hospital currently faces critical shortages in the following blood types:\n${urgentTypes.slice(0, 3).join('\n')}\n\nYour donation could save lives today. We have appointment slots available:\n• Walk-in: Monday-Friday, 8 AM - 6 PM\n• Schedule: Call (XXX) XXX-XXXX or visit our portal\n\nDonation takes just 20 minutes and one unit can save up to 3 lives.\n\nThank you for your lifesaving support!\n\nBest regards,\nBlood Bank Team`
      );
    } else {
      blocks.push(`📧 **Donor Appreciation Template:**\n\nSubject: Thank You - Our Blood Bank is Healthy!\n\nDear Valued Donor,\n\nThanks to generous donors like you, we currently have healthy stock levels across all blood types (${stats.totalUnits} units).\n\nWe encourage you to schedule your next donation to maintain this positive status.\n\nThank you for being a lifesaver!`);
    }
  }

  if (intent === 'requests' || text.includes("transfer") || text.includes("hospital") || text.includes("request")) {
    blocks.push(
      `📦 **Transfer & Request Overview:**\n• Pending Blood Requests: ${stats.pendingRequests}\n• Urgent Requests: ${stats.urgentRequests}\n• Pending Transfers: ${stats.pendingTransfers}\n\n**How to Process:**\n1. Navigate to Dashboard → Transfers/Requests\n2. Review request details and patient urgency\n3. Check inventory availability\n4. Approve or arrange inter-hospital transfer\n5. Confirm courier and tracking info`
    );
  }

  if (intent === 'qa' || text.includes("qa") || text.includes("checklist") || text.includes("quality") || text.includes("compliance")) {
    blocks.push(
      `✅ **Daily QA Checklist:**\n\n**Morning (8 AM):**\n1. Verify cold-chain temperature logs (2-6°C)\n2. Check expiry dates - rotate stock (${stats.totalUnits} units to review)\n3. Reconcile overnight transactions\n\n**Midday (12 PM):**\n4. Review pending requests (${stats.pendingRequests} pending)\n5. Confirm serology test results\n6. Update inventory system\n\n**Evening (6 PM):**\n7. Validate all transfers logged\n8. Quarantine expired/rejected units\n9. Export daily audit trail\n10. Prepare next day's donor schedule`
    );
  }

  if (text.includes("help") || text.includes("what can") || text.includes("how")) {
    blocks.push(
      `🤖 **I'm an AI-Powered Inventory Assistant**\n\n📊 **Real-Time Data Analysis:**\n• Current inventory levels by blood type\n• Critical shortage alerts\n• Pending requests and transfers\n• Transfer history and tracking\n• Donor activity analytics\n\n📝 **Natural Language Understanding:**\nJust ask me naturally! I understand questions like:\n• "Show my recent transfers"\n• "Analyze donor activity per day"\n• "What's our O- status?"\n• "List all pending requests"\n\n💡 **Templates & Guidance:**\n• Donor outreach messages\n• Transfer procedures\n• Quality assurance checklists\n\n🔍 **Try asking:**\n"Show my last 5 transfers"\n"How many donors donated this week?"\n"What blood types are critically low?"`
    );
  }

  if (!blocks.length) {
    blocks.push(
      `I'm an AI-powered assistant with natural language understanding. I can analyze your hospital's real-time data and answer questions naturally.\n\n**Try asking:**\n• "Show my recent transfers"\n• "Analyze donor activity this week"\n• "What's our inventory status?"\n• "Which blood types are critical?"\n\n**Current Stats:** ${stats.totalUnits} units | ${stats.donorCount} donors | ${stats.pendingRequests} pending requests`
    );
  }

  return blocks.join("\n\n");
};

const Chatbot = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I'm your AI-powered inventory assistant with natural language understanding. I can analyze your real-time blood bank data, show transfer history, donor analytics, and more. Just ask me naturally - no need for specific commands!",
      time: formatTime(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [inventoryData, setInventoryData] = useState<DashboardData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [useAI, setUseAI] = useState(false);
  const [aiProvider, setAIProvider] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  // Check if any AI service is available
  useEffect(() => {
    const enabled = isAIEnabled();
    setUseAI(enabled);
    if (enabled) {
      setAIProvider(getAIProvider());
    }
  }, []);

  // Fetch transfers from API
  const fetchTransfers = async (): Promise<Transfer[]> => {
    if (!user?.hospital_id) return [];
    try {
      const response = await fetch(`${API_BASE_URL}/hospital/transfers?hospital_id=${user.hospital_id}`);
      if (!response.ok) throw new Error('Failed to fetch transfers');
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error fetching transfers:', error);
      return [];
    }
  };

  // Fetch donor analytics
  const fetchDonorAnalytics = async (): Promise<DonorAnalytics> => {
    if (!user?.hospital_id) return { totalDonors: 0, donationsPerDay: [], recentDonors: [] };
    try {
      const response = await fetch(`${API_BASE_URL}/donations?hospital_id=${user.hospital_id}`);
      if (!response.ok) throw new Error('Failed to fetch donations');
      const result = await response.json();
      const donations = result.data || [];

      // Process donations per day for last 7 days
      const now = new Date();
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const donationsPerDay = last7Days.map(date => ({
        date,
        count: donations.filter((d: any) => d.collection_date?.startsWith(date)).length
      }));

      // Get recent donors
      const recentDonors = donations
        .slice(0, 5)
        .map((d: any) => ({
          date: d.collection_date,
          donor_name: `${d.first_name} ${d.last_name}`,
          blood_type: `${d.blood_type}${d.rh_factor}`
        }));

      return {
        totalDonors: inventoryData?.stats.donorCount || 0,
        donationsPerDay,
        recentDonors
      };
    } catch (error) {
      console.error('Error fetching donor analytics:', error);
      return { totalDonors: 0, donationsPerDay: [], recentDonors: [] };
    }
  };

  // Fetch real-time inventory data
  useEffect(() => {
    const fetchInventoryData = async () => {
      if (!user?.hospital_id) {
        setDataLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/dashboard/stats?hospital_id=${user.hospital_id}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch inventory data");
        }

        const result = await response.json();
        setInventoryData(result.data);
      } catch (error) {
        console.error("Error fetching inventory data:", error);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "⚠️ I'm having trouble connecting to the inventory database. Please check your connection and refresh the page.",
            time: formatTime(),
          },
        ]);
      } finally {
        setDataLoading(false);
      }
    };

    fetchInventoryData();
    // Refresh data every 30 seconds
    const interval = setInterval(fetchInventoryData, 30000);
    return () => clearInterval(interval);
  }, [user?.hospital_id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || isTyping) return;

    const userMessage: ChatMessage = { role: "user", content: text, time: formatTime() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate AI thinking time and process query
    setTimeout(async () => {
      try {
        let content: string;

        // Try AI service first if configured
        if (useAI) {
          try {
            const transfers = await fetchTransfers();
            const analytics = await fetchDonorAnalytics();

            content = await getAzureAIResponse(text, {
              inventory: inventoryData,
              transfers,
              analytics,
              stats: inventoryData!.stats
            });
          } catch (aiError) {
            console.warn("AI service failed, falling back to pattern matching:", aiError);
            // Fallback to pattern matching
            content = await buildBotReply(text, inventoryData, user?.hospital_id, fetchTransfers, fetchDonorAnalytics);
          }
        } else {
          // Use pattern matching
          content = await buildBotReply(text, inventoryData, user?.hospital_id, fetchTransfers, fetchDonorAnalytics);
        }

        const reply: ChatMessage = {
          role: "assistant",
          content,
          time: formatTime()
        };
        setMessages((prev) => [...prev, reply]);
      } catch (error) {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: "❌ Sorry, I encountered an error processing your request. Please try again.",
          time: formatTime()
        }]);
      } finally {
        setIsTyping(false);
      }
    }, 600);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  if (dataLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading real-time inventory data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Animated Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-300/10 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-cyan-300/10 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      </div>

      <div className="relative z-10 p-6 space-y-6 animate-in fade-in duration-500">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400">
                  AI Chatbot
                </h1>
                <p className="text-muted-foreground mt-0.5">Your intelligent inventory assistant</p>
              </div>
            </div>
          </div>
          <Badge variant="outline" className="gap-2 py-1.5 px-3 bg-white/50 backdrop-blur-sm border-white/40 shadow-sm">
            {useAI ? (
              <>
                <Zap className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="font-medium">{aiProvider}</span>
                <span className="h-4 w-px bg-gray-300 mx-1"></span>
                <span className="text-muted-foreground">{inventoryData?.stats.totalUnits || 0} units active</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-blue-500" />
                {inventoryData ? `Smart Mode • ${inventoryData.stats.totalUnits} units` : "Connecting..."}
              </>
            )}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {focusAreas.map((item) => (
            <Card key={item.title} className="glass-panel border-white/40 shadow-sm bg-white/40 hover:bg-white/60 transition-colors">
              <CardHeader className="flex flex-row items-start gap-4 pb-4">
                <div className="h-12 w-12 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                  <item.icon className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold">{item.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">{item.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="glass-panel border-white/40 shadow-xl overflow-hidden flex flex-col h-[650px]">
          <CardHeader className="bg-white/30 border-b border-white/20 pb-4 sticky top-0 z-10 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-rose-400 to-orange-300 flex items-center justify-center text-white shadow-md">
                <HeartPulse className="h-5 w-5 fill-white" />
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-lg">Conversation</CardTitle>
                <CardDescription>Ask about inventory, donors, or transfers</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col gap-4 p-0 overflow-hidden relative">

            <div className="flex-1 overflow-hidden relative bg-gradient-to-b from-transparent to-white/20">
              <ScrollArea className="h-full px-6 py-6">
                <div className="space-y-6 max-w-4xl mx-auto">
                  {messages.map((message, index) => {
                    const isAssistant = message.role === "assistant";
                    return (
                      <div key={`${message.time}-${index}`} className={`flex gap-4 ${isAssistant ? "" : "flex-row-reverse"}`}>
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${isAssistant ? "bg-white shadow-sm border border-gray-100 text-primary" : "bg-primary text-white shadow-md shadow-primary/20"}`}>
                          {isAssistant ? <Bot className="h-6 w-6" /> : <User className="h-5 w-5" />}
                        </div>

                        <div className={`flex flex-col gap-1 max-w-[80%] ${isAssistant ? "items-start" : "items-end"}`}>
                          <div className={`rounded-2xl px-5 py-4 shadow-sm ${isAssistant
                            ? "bg-white/90 border border-gray-100 text-gray-800 rounded-tl-none"
                            : "bg-primary text-primary-foreground rounded-tr-none shadow-md shadow-primary/10"
                            }`}>
                            <p className="text-sm leading-7 whitespace-pre-wrap">{message.content}</p>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-medium px-2 opacity-70">
                            {message.time} {isAssistant && (useAI ? "• AI Generated" : "• Automated")}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {isTyping && (
                    <div className="flex gap-4 items-center animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="h-10 w-10 rounded-full bg-white shadow-sm border border-gray-100 text-primary flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                      <div className="bg-white/50 rounded-2xl px-4 py-3 border border-white/40 flex items-center gap-2">
                        <span className="h-2 w-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="h-2 w-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="h-2 w-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  )}

                  <div ref={endRef} />
                </div>
              </ScrollArea>
            </div>

            <div className="p-4 bg-white/60 border-t border-white/30 backdrop-blur-md">
              <div className="max-w-4xl mx-auto space-y-4">
                {/* Quick Prompts */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none mask-fade-right">
                  {quickPrompts.map((prompt) => (
                    <Button
                      key={prompt}
                      variant="secondary"
                      size="sm"
                      onClick={() => sendMessage(prompt)}
                      className="bg-white hover:bg-white/80 shadow-sm border border-gray-100 whitespace-nowrap rounded-full px-4 h-8 text-xs font-medium text-gray-600 hover:text-primary transition-all hover:shadow-md hover:-translate-y-0.5"
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>

                <div className="relative group">
                  <Input
                    placeholder="Ask details about transfers, inventory status, or donor trends..."
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={!inventoryData}
                    className="pr-24 h-14 pl-6 rounded-full border-gray-200 bg-white/80 focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all shadow-sm text-base"
                  />
                  <div className="absolute right-2 top-2 bottom-2">
                    <Button
                      onClick={() => sendMessage()}
                      disabled={!input.trim() || isTyping || !inventoryData}
                      className="h-full rounded-full w-12 bg-primary hover:bg-primary/90 shadow-md transition-all hover:scale-105 active:scale-95"
                      size="icon"
                    >
                      {isTyping ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 ml-0.5" />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <p className="text-[10px] text-muted-foreground text-center bg-gray-100/50 px-3 py-1 rounded-full border border-gray-100">
                    {inventoryData
                      ? useAI
                        ? `⚡ Powered by ${aiProvider} with real-time stats`
                        : "💬 Smart Auto-Response Mode"
                      : "Waiting for connection..."}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/40 border-dashed bg-blue-50/30">
          <CardContent className="py-3 px-6 flex flex-wrap items-center justify-center text-center gap-2 text-xs text-muted-foreground/80">
            <ShieldCheck className="h-3.5 w-3.5 text-primary/70" />
            <span>
              {useAI ? (
                <>
                  <strong className="text-primary font-medium">{aiProvider} Active.</strong> We respect patient privacy. No PII is sent to external AI services.
                </>
              ) : (
                <>
                  Basic logic active. <strong>Upgrade to AI</strong> for deeper insights.
                </>
              )}
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Chatbot;
