import { useEffect, useState } from "react";
import { API_BASE_URL, API_URL } from "@/config/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplet, Users, ArrowRightLeft, AlertCircle, FileText, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { io } from "socket.io-client";

type InventoryItem = {
  blood_type: string;
  units: number;
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

const Dashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const hospitalId = user?.hospital_id;

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    stats: {
      totalUnits: 0,
      totalVolume: 0,
      donorCount: 0,
      pendingTransfers: 0,
      urgentRequests: 0,
      pendingRequests: 0,
    },
    bloodTypeInventory: {
      "A+": 0,
      "A-": 0,
      "B+": 0,
      "B-": 0,
      "AB+": 0,
      "AB-": 0,
      "O+": 0,
      "O-": 0,
    },
  });
  const [expiringBlood, setExpiringBlood] = useState<ExpiringBlood[]>([]);
  const [loadingExpiring, setLoadingExpiring] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async (forceRefresh = false) => {
      if (!hospitalId || !isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const refreshParam = forceRefresh ? '&force_refresh=true' : '';
        const response = await fetch(
          `${API_BASE_URL}/dashboard/stats?hospital_id=${hospitalId}${refreshParam}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const result = await response.json();
        console.log('Dashboard stats loaded:', result.cached ? 'from cache' : 'from SQL', result.data);
        setDashboardData(result.data);
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData(); // Initial load from Firebase cache (fast)
    fetchExpiringBlood(); // Fetch expiring blood units

    // Setup Socket.IO for real-time updates
    if (!hospitalId || !isAuthenticated) return;

    const socket = io(API_URL);
    
    socket.on('connect', () => {
      console.log('✓ Socket.IO connected for dashboard updates');
      socket.emit('join-hospital', hospitalId);
    });

    // Listen for new request notifications
    socket.on('new-request', (data) => {
      console.log('New request notification:', data);
      // Refresh dashboard data (from cache - Firebase already incremented by webhook)
      fetchDashboardData();
    });

    // Listen for request status updates
    socket.on('request-removed', (data) => {
      console.log('Request removed notification:', data);
      // Refresh dashboard data (from cache)
      fetchDashboardData();
    });

    return () => {
      socket.disconnect();
    };
  }, [hospitalId, isAuthenticated]);

  const fetchExpiringBlood = async () => {
    if (!hospitalId || !isAuthenticated) {
      setLoadingExpiring(false);
      return;
    }

    try {
      setLoadingExpiring(true);
      const response = await fetch(
        `${API_BASE_URL}/hospital/expiring-blood?hospital_id=${hospitalId}&days=7`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch expiring blood data");
      }

      const result = await response.json();
      setExpiringBlood(result.data || []);
    } catch (error) {
      console.error("Expiring blood fetch error:", error);
    } finally {
      setLoadingExpiring(false);
    }
  };

  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            Dashboard
            <span className="text-sm font-normal text-muted-foreground ml-2 bg-secondary/50 px-3 py-1 rounded-full">
              Overview
            </span>
          </h1>
          <p className="text-muted-foreground mt-1">Real-time overview of your blood bank inventory and activities</p>
        </div>
        <div className="text-sm text-muted-foreground/80 hidden md:block bg-white/50 backdrop-blur px-4 py-2 rounded-lg border border-white/40">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-6">
        <Card className="glass-panel border-l-4 border-l-medical-red shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Blood Units</CardTitle>
            <div className="p-2 bg-red-50 rounded-full">
              <Droplet className="h-4 w-4 text-medical-red" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{dashboardData.stats.totalUnits}</div>
            <p className="text-xs text-muted-foreground mt-1">Units in inventory</p>
          </CardContent>
        </Card>

        <Card className="glass-panel border-l-4 border-l-primary shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Registered Donors</CardTitle>
            <div className="p-2 bg-blue-50 rounded-full">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{dashboardData.stats.donorCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Active donors</p>
          </CardContent>
        </Card>

        <Card className="glass-panel border-l-4 border-l-yellow-500 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Requests</CardTitle>
            <div className="p-2 bg-yellow-50 rounded-full">
              <FileText className="h-4 w-4 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{dashboardData.stats.pendingRequests}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card className="glass-panel border-l-4 border-l-orange-500 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Transfers</CardTitle>
            <div className="p-2 bg-orange-50 rounded-full">
              <ArrowRightLeft className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{dashboardData.stats.pendingTransfers}</div>
            <p className="text-xs text-muted-foreground mt-1">In transit</p>
          </CardContent>
        </Card>

        <Card className="glass-panel border-l-4 border-l-destructive shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Urgent Requests</CardTitle>
            <div className="p-2 bg-red-50 rounded-full">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{dashboardData.stats.urgentRequests}</div>
            <p className="text-xs text-muted-foreground mt-1">Critical attention</p>
          </CardContent>
        </Card>

        <Card className="glass-panel border-l-4 border-l-orange-600 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expiring Soon</CardTitle>
            <div className="p-2 bg-orange-50 rounded-full">
              <Clock className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{expiringBlood.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Within 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Expiring Blood Alert Section */}
      {expiringBlood.length > 0 && (
        <Card className="glass-panel shadow-xl border-orange-200 border-2 bg-gradient-to-r from-orange-50/50 to-red-50/50">
          <CardHeader className="border-b border-orange-200/50 bg-orange-100/30">
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-orange-700">
              <Clock className="h-5 w-5" />
              ⚠️ Blood Units Expiring Soon - Action Required
            </CardTitle>
            <p className="text-sm text-orange-600 mt-1">The following units will expire within 7 days. Please prioritize for urgent requests or transfers.</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {expiringBlood.slice(0, 12).map((blood) => {
                const daysLeft = blood.daysUntilExpiry;
                const urgencyColor = daysLeft <= 2 ? 'red' : daysLeft <= 5 ? 'orange' : 'yellow';
                const bgColor = daysLeft <= 2 ? 'bg-red-100/80' : daysLeft <= 5 ? 'bg-orange-100/80' : 'bg-yellow-100/80';
                const borderColor = daysLeft <= 2 ? 'border-red-300' : daysLeft <= 5 ? 'border-orange-300' : 'border-yellow-300';
                const textColor = daysLeft <= 2 ? 'text-red-700' : daysLeft <= 5 ? 'text-orange-700' : 'text-yellow-700';

                return (
                  <div
                    key={blood.bloodId}
                    className={`flex flex-col p-4 ${bgColor} rounded-xl border-2 ${borderColor} shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden`}
                  >
                    {daysLeft <= 2 && (
                      <div className="absolute top-2 right-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-600 text-white animate-pulse">
                          URGENT
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-12 h-12 rounded-full bg-white flex items-center justify-center font-bold shadow-md ${textColor}`}>
                        {blood.bloodType}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800">{blood.componentType}</div>
                        <div className="text-xs text-gray-600">{blood.volumeMl} ml</div>
                      </div>
                    </div>
                    <div className={`text-center py-2 px-3 rounded-lg bg-white/60 border ${borderColor} mt-2`}>
                      <div className={`text-2xl font-bold ${textColor}`}>{daysLeft}</div>
                      <div className="text-xs text-gray-600 font-medium">day{daysLeft !== 1 ? 's' : ''} left</div>
                    </div>
                    <div className="text-xs text-gray-600 mt-2">
                      <div>ID: {blood.bloodId}</div>
                      <div>Expires: {new Date(blood.expiryDate).toLocaleDateString()}</div>
                      {blood.storageLocation && <div>Location: {blood.storageLocation}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            {expiringBlood.length > 12 && (
              <div className="mt-4 text-center">
                <p className="text-sm text-orange-700 font-medium">
                  + {expiringBlood.length - 12} more units expiring soon. View all in Inventory page.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="glass-panel shadow-xl">
        <CardHeader className="border-b border-border/50 bg-secondary/20">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Droplet className="h-5 w-5 text-primary" />
            Blood Type Inventory
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {Object.entries(dashboardData.bloodTypeInventory).map(([bloodType, units]) => {
              // Calculate percentage relative to a "full" target (e.g., 5000ml) for visual fill
              const target = 5000;
              const percentage = Math.min((units / target) * 100, 100);

              return (
                <div
                  key={bloodType}
                  className="flex flex-col items-center justify-between p-4 rounded-xl bg-white/50 border border-white/40 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300 group relative overflow-hidden h-32"
                >
                  <div className="absolute bottom-0 left-0 w-full bg-red-100/50 group-hover:bg-red-200/50 transition-all duration-500 z-0" style={{ height: `${percentage}%` }}></div>

                  <div className="relative z-10 w-full flex justify-between items-start">
                    <span className="text-2xl font-black text-gray-800 group-hover:text-primary transition-colors">{bloodType}</span>
                    {(percentage < 20) && <span className="h-2 w-2 rounded-full bg-destructive animate-pulse"></span>}
                  </div>

                  <div className="relative z-10 w-full text-right mt-auto">
                    <div className="text-lg font-bold text-medical-red">{units}</div>
                    <div className="text-[10px] uppercase text-muted-foreground font-medium tracking-wider">ml Available</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
