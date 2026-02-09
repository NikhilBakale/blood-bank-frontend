import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/config/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRightLeft, Droplet, User, Phone, Calendar } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";

type Transfer = {
  transfer_id: number;
  blood_id: string;
  request_id: string;
  hospital_id: string;
  transfer_date: string;
  notes: string | null;
  created_at: string;
  // From donations table JOIN
  donor_id: number | null;
  blood_type: string;
  rh_factor: string;
  component_type: string;
  volume_ml: number;
  // From blood_requests table JOIN
  patient_name: string | null;
  requested_blood_type: string | null;
  urgency: string | null;
};

const Transfers = () => {
  const { user, isAuthenticated } = useAuth();
  const hospitalId = user?.hospital_id;

  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransfers = async () => {
    if (!hospitalId || !isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/hospital/transfers?hospital_id=${hospitalId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch transfers");
      }

      const result = await response.json();
      console.log('Transfers API response:', result.data);
      setTransfers(result.data || []);
    } catch (error) {
      console.error("Transfers fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, [hospitalId, isAuthenticated]);

  const getUrgencyBadge = (urgency: string | null) => {
    switch (urgency) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "urgent":
        return <Badge className="bg-orange-500 hover:bg-orange-600">Urgent</Badge>;
      case "routine":
        return <Badge variant="secondary">Routine</Badge>;
      default:
        return null;
    }
  };

  // Calculate stats
  const totalTransfers = transfers.length;
  const totalVolume = transfers.reduce((sum, t) => {
    const vol = Number(t.volume_ml) || 0;
    console.log('Processing transfer:', t.blood_id, 'volume_ml:', t.volume_ml, 'converted:', vol);
    return sum + vol;
  }, 0);
  console.log('FINAL Total Volume:', totalVolume);
  const thisMonthTransfers = transfers.filter((t) => {
    const transferDate = new Date(t.transfer_date);
    const now = new Date();
    return transferDate.getMonth() === now.getMonth() && transferDate.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="relative min-h-screen">
      {/* Animated Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-400/10 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-400/10 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      </div>

      <div className="relative z-10 p-6 space-y-6 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 flex items-center gap-2">
            <ArrowRightLeft className="h-8 w-8 text-orange-500" />
            Blood Transfers
          </h1>
          <p className="text-muted-foreground mt-1">Track blood units transferred to patients</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass-panel border-white/40 shadow-lg hover:transform hover:scale-[1.02] transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Transfers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{totalTransfers}</div>
            </CardContent>
          </Card>
          <Card className="glass-panel border-white/40 shadow-lg hover:transform hover:scale-[1.02] transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{thisMonthTransfers}</div>
            </CardContent>
          </Card>
          <Card className="glass-panel border-white/40 shadow-lg hover:transform hover:scale-[1.02] transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Volume Transferred</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {totalVolume.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">ml</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transfers Table */}
        <Card className="glass-panel border-white/40 shadow-xl overflow-hidden">
          <CardHeader className="border-b border-gray-100/50 bg-white/30 backdrop-blur-sm">
            <CardTitle className="text-xl flex items-center gap-2">
              <span className="bg-orange-100 p-1.5 rounded-md">
                <ArrowRightLeft className="h-5 w-5 text-orange-600" />
              </span>
              Transfer History
            </CardTitle>
            <CardDescription>All blood units transferred to patients</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : transfers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground bg-gray-50/30">
                <ArrowRightLeft className="h-12 w-12 mb-4 opacity-30" />
                <p className="text-lg font-medium">No transfers yet</p>
                <p className="text-sm">Transfers will appear here once blood is transferred to patients</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50/80 backdrop-blur-sm">
                    <TableRow className="hover:bg-transparent border-b border-gray-100">
                      <TableHead className="font-semibold text-primary">Transfer Date</TableHead>
                      <TableHead className="font-semibold text-primary">Blood ID</TableHead>
                      <TableHead className="font-semibold text-primary">Blood Type</TableHead>
                      <TableHead className="font-semibold text-primary">Component</TableHead>
                      <TableHead className="font-semibold text-primary">Volume</TableHead>
                      <TableHead className="font-semibold text-primary">Recipient</TableHead>
                      <TableHead className="font-semibold text-primary">Contact</TableHead>
                      <TableHead className="font-semibold text-primary">Urgency</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers.map((transfer) => (
                      <TableRow key={transfer.transfer_id} className="hover:bg-primary/5 transition-colors border-b border-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{format(new Date(transfer.transfer_date), "MMM dd, yyyy")}</span>
                          </div>
                          <div className="text-xs text-muted-foreground pl-6">
                            {format(new Date(transfer.transfer_date), "hh:mm a")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded border border-border">
                            {transfer.blood_id}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Droplet className="h-4 w-4 text-medical-red" />
                            <span className="font-bold text-lg text-foreground/80">
                              {transfer.blood_type}
                              <sup className="text-xs ml-0.5">{transfer.rh_factor === "positive" ? "+" : "-"}</sup>
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{transfer.component_type}</TableCell>
                        <TableCell className="text-sm font-mono">{transfer.volume_ml} ml</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="bg-primary/10 p-1.5 rounded-full">
                              <User className="h-3 w-3 text-primary" />
                            </div>
                            <span className="text-sm font-medium">{transfer.patient_name || "N/A"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground text-sm">From Request</span>
                        </TableCell>
                        <TableCell>
                          {getUrgencyBadge(transfer.urgency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Transfers;
