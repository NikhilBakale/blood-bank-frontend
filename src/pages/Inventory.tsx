import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  AreaChart, Area, LineChart, Line, ComposedChart
} from "recharts";
import { Droplet, AlertTriangle, Package, Loader2, Clock, TrendingDown, TrendingUp, Users, Activity } from "lucide-react";
import { format, parseISO } from "date-fns";

// Default colors for blood types
const BLOOD_TYPE_COLORS: Record<string, string> = {
  "A+": "#ef4444",
  "A-": "#b91c1c",
  "B+": "#f97316",
  "B-": "#c2410c",
  "AB+": "#8b5cf6",
  "AB-": "#6d28d9",
  "O+": "#3b82f6",
  "O-": "#1d4ed8",
};

type LowStockItem = {
  bloodType: string;
  unitCount: number;
  totalVolumeMl: number;
  earliestExpiry: string;
};

type ExpiringBlood = {
  bloodId: string;
  bloodType: string;
  componentType: string;
  volumeMl: number;
  expiryDate: string;
  collectionDate: string;
  storageLocation: string;
  daysUntilExpiry: number;
  donorName: string | null;
};

type AnalyticsData = {
  donationsPerDay: { date: string; count: number; volume: number }[];
  componentDistribution: { componentType: string; unitCount: number; totalVolume: number }[];
  bloodTypeTrends: { date: string; bloodType: string; count: number }[];
  expiringByBloodType: { bloodType: string; expiringUnits: number; expiringVolume: number; minDaysLeft: number; maxDaysLeft: number }[];
  donorRegistrations: { date: string; newDonors: number }[];
};

const Inventory = () => {
  const { user } = useAuth();
  const [bloodData, setBloodData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalUnits, setTotalUnits] = useState(0);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [expiringBlood, setExpiringBlood] = useState<ExpiringBlood[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  const lowStockThreshold = 5;

  const fetchInventoryStats = async () => {
    if (!user?.hospital_id) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/dashboard/stats?hospital_id=${user.hospital_id}`);

      if (!response.ok) {
        throw new Error("Failed to fetch inventory stats");
      }

      const result = await response.json();
      const inventory = result.data.bloodTypeInventory;

      // Transform API data to Recharts format
      const chartData = Object.entries(inventory).map(([type, count]) => ({
        name: type,
        value: count as number,
        color: BLOOD_TYPE_COLORS[type] || "#cccccc",
      }));

      setBloodData(chartData);
      setTotalUnits(result.data.stats.totalUnits);
    } catch (err: any) {
      console.error("Error fetching inventory:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLowStock = async () => {
    if (!user?.hospital_id) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/hospital/low-stock?hospital_id=${user.hospital_id}&threshold=${lowStockThreshold}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch low stock data");
      }

      const result = await response.json();
      setLowStockItems(result.data || []);
    } catch (err: any) {
      console.error("Error fetching low stock:", err);
    }
  };

  const fetchExpiringBlood = async () => {
    if (!user?.hospital_id) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/hospital/expiring-blood?hospital_id=${user.hospital_id}&days=7`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch expiring blood data");
      }

      const result = await response.json();
      setExpiringBlood(result.data || []);
    } catch (err: any) {
      console.error("Error fetching expiring blood:", err);
    }
  };

  const fetchAllAlerts = async () => {
    setLoadingAlerts(true);
    await Promise.all([fetchLowStock(), fetchExpiringBlood()]);
    setLoadingAlerts(false);
  };

  const fetchAnalytics = async () => {
    if (!user?.hospital_id) return;

    try {
      setLoadingAnalytics(true);
      const response = await fetch(
        `${API_BASE_URL}/hospital/analytics?hospital_id=${user.hospital_id}&days=30`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch analytics data");
      }

      const result = await response.json();
      setAnalyticsData(result.data);
    } catch (err: any) {
      console.error("Error fetching analytics:", err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (user?.hospital_id) {
      fetchInventoryStats();
      fetchAllAlerts();
      fetchAnalytics();
    }
  }, [user?.hospital_id]);
  const mostAvailable = [...bloodData].sort((a, b) => b.value - a.value)[0];
  const leastAvailable = [...bloodData].filter(i => i.value > 0).sort((a, b) => a.value - b.value)[0];

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500">
        <p>Error loading inventory data: {error}</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Animated Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      </div>

      <div className="relative z-10 p-6 space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
              <Package className="h-8 w-8" />
              Inventory Analytics
            </h1>
            <p className="text-muted-foreground mt-1">Real-time analysis of blood stock levels across all types.</p>
          </div>
          <div className="bg-white/50 backdrop-blur-sm shadow-sm text-primary px-4 py-2 rounded-lg font-medium border border-white/20">
            Total Units: <span className="font-bold text-lg ml-1">{totalUnits}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Distribution Chart */}
          <Card className="glass-panel col-span-1 md:col-span-2 border-white/40 shadow-lg">
            <CardHeader>
              <CardTitle>Blood Type Distribution</CardTitle>
              <CardDescription>Current stock levels by blood group</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {totalUnits === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <p>No inventory data available yet.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bloodData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      cursor={{ fill: 'transparent' }}
                    />
                    <Bar dataKey="value" name="Units" radius={[6, 6, 0, 0]}>
                      {bloodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Alerts */}
          <div className="space-y-6">
            <Card className="glass-panel border-white/40 h-full shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Low Stock Alerts
                </CardTitle>
                <CardDescription>Blood types below minimum threshold ({lowStockThreshold} units)</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAlerts ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : lowStockItems.length > 0 ? (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {lowStockItems.map((item) => (
                      <div key={item.bloodType} className="flex items-center justify-between p-3 bg-red-50/80 backdrop-blur-sm rounded-lg border border-red-100/50 hover:bg-red-100/80 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-red-600 font-bold text-xs shadow-sm" style={{ color: BLOOD_TYPE_COLORS[item.bloodType] || "#dc2626" }}>
                            {item.bloodType}
                          </div>
                          <div>
                            <span className="font-medium text-red-800 text-sm">Critical Level</span>
                            <p className="text-xs text-red-600">{item.totalVolumeMl} ml total</p>
                          </div>
                        </div>
                        <span className="font-bold text-red-600">{item.unitCount} units</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-green-600 bg-green-50/50 backdrop-blur-sm rounded-lg border border-green-100">
                    <Package className="h-8 w-8 mb-2 opacity-80" />
                    <p className="font-medium">All Stock Levels Healthy</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Expiring Blood Alert Section - Always Show */}
        <Card className="glass-panel border-white/40 shadow-lg border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <Clock className="h-5 w-5" />
              Expiring Soon (Top 5)
            </CardTitle>
            <CardDescription>
              {loadingAlerts ? 'Loading expiring blood units...' : 
               expiringBlood.length > 0 ? `${expiringBlood.length} blood unit${expiringBlood.length !== 1 ? 's' : ''} expiring within 7 days - prioritize usage` :
               'No blood units expiring within the next 7 days'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAlerts ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
              </div>
            ) : expiringBlood.length > 0 ? (
              <>
                <div className="space-y-3">
                  {expiringBlood.slice(0, 5).map((blood, index) => {
                    const urgencyLevel = blood.daysUntilExpiry <= 2 ? 'critical' : blood.daysUntilExpiry <= 4 ? 'warning' : 'caution';
                    const bgColor = urgencyLevel === 'critical' ? 'bg-red-100/90' : urgencyLevel === 'warning' ? 'bg-orange-100/90' : 'bg-yellow-100/80';
                    const borderColor = urgencyLevel === 'critical' ? 'border-red-300' : urgencyLevel === 'warning' ? 'border-orange-300' : 'border-yellow-300';
                    
                    return (
                      <div key={blood.bloodId} className={`flex items-center justify-between p-4 ${bgColor} backdrop-blur-sm rounded-lg border-2 ${borderColor} hover:shadow-md transition-all relative`}>
                        {urgencyLevel === 'critical' && (
                          <div className="absolute -top-2 -right-2">
                            <span className="flex h-6 w-6 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-6 w-6 bg-red-500 items-center justify-center">
                                <AlertTriangle className="h-3 w-3 text-white" />
                              </span>
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 flex-shrink-0 mr-2">
                          <span className="text-xs font-bold text-gray-500 w-4">#{index + 1}</span>
                        </div>
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center font-bold text-sm shadow-md" style={{ color: BLOOD_TYPE_COLORS[blood.bloodType] || "#ea580c" }}>
                              {blood.bloodType}
                            </div>
                            <span className={`text-xs font-bold mt-1 ${urgencyLevel === 'critical' ? 'text-red-700' : urgencyLevel === 'warning' ? 'text-orange-700' : 'text-yellow-700'}`}>
                              {blood.daysUntilExpiry}d
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-800">{blood.componentType}</span>
                              <span className="text-xs bg-white/70 text-gray-700 px-2 py-0.5 rounded-full font-medium">{blood.volumeMl} ml</span>
                              {urgencyLevel === 'critical' && (
                                <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">URGENT</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">ID: {blood.bloodId}</p>
                            {blood.storageLocation && (
                              <p className="text-xs text-gray-500 truncate">📍 {blood.storageLocation}</p>
                            )}
                            <p className="text-xs text-orange-600 font-medium mt-1">
                              ⏰ Expires: {format(new Date(blood.expiryDate), "MMM dd, yyyy")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <TrendingDown className={`h-5 w-5 ${urgencyLevel === 'critical' ? 'text-red-500' : 'text-orange-500'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {expiringBlood.length > 5 && (
                  <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200 text-center">
                    <p className="text-sm font-medium text-orange-800">
                      + {expiringBlood.length - 5} more unit{expiringBlood.length - 5 !== 1 ? 's' : ''} expiring soon
                    </p>
                    <p className="text-xs text-orange-600 mt-1">Scroll down to view analytics breakdown by blood type</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-green-50/50 backdrop-blur-sm rounded-lg border border-green-100">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <Clock className="h-8 w-8 text-green-600" />
                </div>
                <p className="font-semibold text-green-800 text-lg">All Blood Units Are Fresh! ✓</p>
                <p className="text-sm text-green-700 mt-2 max-w-md">
                  No blood units are expiring within the next 7 days. Your inventory is well-managed.
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-green-600">
                  <Activity className="h-4 w-4" />
                  <span>Monitoring continues automatically</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expiring Blood by Type Breakdown */}
        {analyticsData?.expiringByBloodType && analyticsData.expiringByBloodType.length > 0 && (
          <Card className="glass-panel border-white/40 shadow-lg border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-5 w-5" />
                Expiring Blood by Type
              </CardTitle>
              <CardDescription>Blood types with units expiring within 7 days</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.expiringByBloodType} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="expiringGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ea580c" stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                  <XAxis dataKey="bloodType" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: 'rgba(249, 115, 22, 0.1)' }}
                    formatter={(value: any, name: string) => {
                      if (name === 'expiringUnits') return [value, 'Expiring Units'];
                      return [value, name];
                    }}
                  />
                  <Bar dataKey="expiringUnits" fill="url(#expiringGradient)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Advanced Analytics Section */}
        {!loadingAnalytics && analyticsData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Donation Trends - Area Chart */}
            {analyticsData.donationsPerDay.length > 0 && (
              <Card className="glass-panel border-white/40 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    Donation Trends (Last 30 Days)
                  </CardTitle>
                  <CardDescription>Daily donation activity and volume</CardDescription>
                </CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.donationsPerDay} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false}
                        tickFormatter={(date) => format(parseISO(date), "MMM dd")}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis axisLine={false} tickLine={false} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        labelFormatter={(date) => format(parseISO(date), "MMM dd, yyyy")}
                        formatter={(value: any, name: string) => {
                          if (name === 'count') return [value, 'Donations'];
                          if (name === 'volume') return [`${value} ml`, 'Volume'];
                          return [value, name];
                        }}
                      />
                      <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Donor Registrations - Line Chart */}
            {analyticsData.donorRegistrations.length > 0 && (
              <Card className="glass-panel border-white/40 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    Donor Registrations (Last 30 Days)
                  </CardTitle>
                  <CardDescription>New donor registration trends</CardDescription>
                </CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analyticsData.donorRegistrations} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                      <defs>
                        <linearGradient id="donorGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false}
                        tickFormatter={(date) => format(parseISO(date), "MMM dd")}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis axisLine={false} tickLine={false} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        labelFormatter={(date) => format(parseISO(date), "MMM dd, yyyy")}
                        formatter={(value: any) => [value, 'New Donors']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="newDonors" 
                        stroke="url(#donorGradient)" 
                        strokeWidth={3}
                        dot={{ fill: '#8b5cf6', r: 4 }}
                        activeDot={{ r: 6, fill: '#ec4899' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Component Distribution - Stacked/Gradient Bar */}
            {analyticsData.componentDistribution.length > 0 && (
              <Card className="glass-panel border-white/40 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-teal-600" />
                    Component Distribution
                  </CardTitle>
                  <CardDescription>Available blood components breakdown</CardDescription>
                </CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={analyticsData.componentDistribution} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}>
                      <defs>
                        <linearGradient id="componentGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.9}/>
                          <stop offset="95%" stopColor="#0d9488" stopOpacity={0.5}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                      <XAxis 
                        dataKey="componentType" 
                        axisLine={false} 
                        tickLine={false}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                      />
                      <YAxis axisLine={false} tickLine={false} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: any, name: string) => {
                          if (name === 'unitCount') return [value, 'Units'];
                          if (name === 'totalVolume') return [`${value} ml`, 'Volume'];
                          return [value, name];
                        }}
                      />
                      <Bar dataKey="unitCount" fill="url(#componentGradient)" radius={[8, 8, 0, 0]} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Blood Type Trends Over Time */}
            {analyticsData.bloodTypeTrends.length > 0 && (
              <Card className="glass-panel border-white/40 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-rose-600" />
                    Blood Type Trends
                  </CardTitle>
                  <CardDescription>Collection patterns by blood type (Last 30 Days)</CardDescription>
                </CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false}
                        type="category"
                        allowDuplicatedCategory={false}
                        tickFormatter={(date) => format(parseISO(date), "MMM dd")}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis axisLine={false} tickLine={false} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        labelFormatter={(date) => format(parseISO(date), "MMM dd, yyyy")}
                      />
                      <Legend />
                      {/* Group data by blood type and create lines */}
                      {Array.from(new Set(analyticsData.bloodTypeTrends.map(d => d.bloodType))).map((bloodType) => {
                        const typeData = analyticsData.bloodTypeTrends
                          .filter(d => d.bloodType === bloodType)
                          .map(d => ({ date: d.date, [bloodType]: d.count }));
                        
                        return (
                          <Line
                            key={bloodType}
                            data={typeData}
                            type="monotone"
                            dataKey={bloodType}
                            stroke={BLOOD_TYPE_COLORS[bloodType] || "#gray"}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
          {/* Pie Chart Component */}
          <Card className="glass-panel border-white/40 shadow-lg">
            <CardHeader>
              <CardTitle>Composition Analysis</CardTitle>
              <CardDescription>Proportion of total inventory</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {totalUnits === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <p>No inventory data available yet.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bloodData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {bloodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="glass-panel border-white/40 flex flex-col justify-center items-center p-6 text-center hover:scale-[1.02] transition-all duration-300 shadow-lg bg-gradient-to-br from-blue-50/50 to-transparent">
              <div className="bg-blue-100 p-4 rounded-full mb-3 text-blue-600 shadow-sm">
                <Droplet className="h-8 w-8" />
              </div>
              <h3 className="text-3xl font-black text-foreground mb-1">{mostAvailable ? mostAvailable.name : '-'}</h3>
              <p className="text-muted-foreground text-sm font-medium">Most Available</p>
            </Card>
            <Card className="glass-panel border-white/40 flex flex-col justify-center items-center p-6 text-center hover:scale-[1.02] transition-all duration-300 shadow-lg bg-gradient-to-br from-purple-50/50 to-transparent">
              <div className="bg-purple-100 p-4 rounded-full mb-3 text-purple-600 shadow-sm">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <h3 className="text-3xl font-black text-foreground mb-1">{leastAvailable ? leastAvailable.name : '-'}</h3>
              <p className="text-muted-foreground text-sm font-medium">Lowest Stock</p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
