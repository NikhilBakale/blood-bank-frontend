import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/config/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertCircle, Clock, CheckCircle, XCircle, Phone, MapPin, User, Droplet, ArrowRightLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { getCompatibleDonorTypes } from "@/lib/utils";
import { initializeSocket, onRequestRemoved, offRequestRemoved, disconnectSocket } from "@/services/socket";
import { toast } from "@/hooks/use-toast";

type BloodRequest = {
  request_id: string;
  requester_id: string;
  patient_name: string;
  patient_age: number | null;
  blood_type: string;
  urgency: string;
  units_needed: number | null;
  contact_number: string;
  address: string | null;
  medical_notes: string | null;
  request_status: string;
  created_at: string;
  requester_email: string | null;
  requester_name: string | null;
  requester_phone: string | null;
  hospital_id: string;
  hospital_name: string;
  hospital_status: string;
  responded_at: string | null;
  hospital_notes: string | null;
};

type AvailableDonation = {
  blood_id: string;
  donor_id: number;
  blood_type: string;
  rh_factor: string;
  component_type: string;
  volume_ml: number;
  collection_date: string;
  expiry_date: string;
  status: string;
  donor_name: string | null;
};

const Requests = () => {
  const { user, isAuthenticated } = useAuth();
  const hospitalId = user?.hospital_id;

  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pending");

  // Transfer modal state
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BloodRequest | null>(null);
  const [availableDonations, setAvailableDonations] = useState<AvailableDonation[]>([]);
  const [selectedDonation, setSelectedDonation] = useState<string>("");
  const [loadingDonations, setLoadingDonations] = useState(false);
  const [transferring, setTransferring] = useState(false);

  const fetchRequests = async () => {
    if (!hospitalId || !isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/hospital/requests?hospital_id=${hospitalId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch requests");
      }

      const result = await response.json();
      setRequests(result.data || []);
    } catch (error) {
      console.error("Requests fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [hospitalId, isAuthenticated]);

  // Setup Socket.IO for real-time updates
  useEffect(() => {
    if (!hospitalId || !isAuthenticated) return;

    const socket = initializeSocket(hospitalId);

    // Listen for removed requests
    onRequestRemoved((data) => {
      console.log('Request removed via socket:', data);

      // Remove the request from local state
      setRequests((prev) => prev.filter((req) => req.request_id !== data.request_id));

      // Show toast notification
      toast({
        title: "Request No Longer Available",
        description: data.reason === 'approved_by_other'
          ? "Another hospital has approved this request"
          : "This request has been fulfilled",
        variant: "default"
      });
    });

    // Listen for new requests
    socket?.on('new-request', (data) => {
      console.log('New request via socket:', data);

      if (data.hospital_id === hospitalId) {
        // Refresh requests to get the new one
        fetchRequests();

        toast({
          title: "New Blood Request",
          description: `New ${data.request?.urgency || 'urgent'} request for ${data.request?.blood_type || 'blood'}`,
          variant: "default"
        });
      }
    });

    return () => {
      offRequestRemoved();
      socket?.off('new-request');
      disconnectSocket();
    };
  }, [hospitalId, isAuthenticated]);

  const openTransferModal = async (request: BloodRequest) => {
    setSelectedRequest(request);
    setSelectedDonation("");
    setTransferModalOpen(true);
    setLoadingDonations(true);

    try {
      // Get all compatible blood types for the recipient
      const compatibleTypes = getCompatibleDonorTypes(request.blood_type);

      // Fetch donations for all compatible blood types
      const response = await fetch(
        `${API_BASE_URL}/hospital/donations/available?hospital_id=${hospitalId}&blood_types=${compatibleTypes.join(",")}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch donations");
      }

      const result = await response.json();
      setAvailableDonations(result.data || []);
    } catch (error) {
      console.error("Fetch donations error:", error);
      setAvailableDonations([]);
    } finally {
      setLoadingDonations(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedRequest || !selectedDonation || !hospitalId) return;

    setTransferring(true);
    try {
      const response = await fetch(`${API_BASE_URL}/hospital/transfers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blood_id: selectedDonation,
          request_id: selectedRequest.request_id,
          hospital_id: hospitalId,
          // Recipient details will be retrieved from blood_requests table via JOIN
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Transfer failed");
      }

      // Close modal and refresh
      setTransferModalOpen(false);
      setSelectedRequest(null);
      setSelectedDonation("");
      await fetchRequests();
    } catch (error: any) {
      console.error("Transfer error:", error);
      alert(error.message || "Transfer failed");
    } finally {
      setTransferring(false);
    }
  };

  const updateRequestStatus = async (requestId: string, newStatus: string) => {
    if (!hospitalId) return;

    setUpdatingId(requestId);
    try {
      const response = await fetch(
        `${API_BASE_URL}/hospital/requests/${requestId}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hospital_id: hospitalId, status: newStatus }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      // Refresh requests
      await fetchRequests();
    } catch (error) {
      console.error("Status update error:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "urgent":
        return <Badge className="bg-orange-500 hover:bg-orange-600">Urgent</Badge>;
      case "routine":
        return <Badge variant="secondary">Routine</Badge>;
      default:
        return <Badge variant="outline">{urgency}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case "fulfilled":
        return <Badge className="bg-blue-500 hover:bg-blue-600"><CheckCircle className="h-3 w-3 mr-1" />Fulfilled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (activeTab === "all") return true;
    return req.hospital_status === activeTab;
  });

  const pendingCount = requests.filter((r) => r.hospital_status === "pending").length;
  const approvedCount = requests.filter((r) => r.hospital_status === "approved").length;

  return (
    <div className="relative min-h-screen">
      {/* Animated Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-yellow-300/10 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-red-400/10 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      </div>

      <div className="relative z-10 p-6 space-y-6 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400">
            Blood Requests
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage incoming blood requests from patients and requesters
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass-panel border-l-4 border-l-yellow-500 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card className="glass-panel border-l-4 border-l-green-500 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{approvedCount}</div>
            </CardContent>
          </Card>
          <Card className="glass-panel border-l-4 border-l-primary shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{requests.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/50 backdrop-blur-sm p-1 rounded-xl border border-white/40">
            <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Pending ({pendingCount})</TabsTrigger>
            <TabsTrigger value="approved" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Approved</TabsTrigger>
            <TabsTrigger value="rejected" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Rejected</TabsTrigger>
            <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">All</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredRequests.length === 0 ? (
              <Card className="glass-panel">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="bg-secondary/50 p-6 rounded-full mb-4">
                    <AlertCircle className="h-10 w-10 text-muted-foreground opacity-50" />
                  </div>
                  <p className="text-lg font-medium text-muted-foreground">No {activeTab} requests found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredRequests.map((request, index) => (
                  <Card
                    key={request.request_id}
                    className="glass-panel border-white/40 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <CardHeader className="pb-3 bg-white/30 border-b border-white/20">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 p-1.5 rounded-lg">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-semibold">
                              {request.patient_name}
                              {request.patient_age && (
                                <span className="text-sm font-normal text-muted-foreground ml-2">
                                  ({request.patient_age}y)
                                </span>
                              )}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {format(new Date(request.created_at), "MMM dd, yyyy 'at' hh:mm a")}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {getUrgencyBadge(request.urgency)}
                          {getStatusBadge(request.hospital_status)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4 pb-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="flex items-center gap-2">
                          <div className="bg-red-50 p-1.5 rounded-md">
                            <Droplet className="h-4 w-4 text-red-500" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Blood Type</p>
                            <p className="text-lg font-bold text-gray-800">{request.blood_type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="bg-blue-50 p-1.5 rounded-md">
                            <Droplet className="h-4 w-4 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Units</p>
                            <p className="text-lg font-bold text-gray-800">{request.units_needed || "N/A"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="bg-green-50 p-1.5 rounded-md">
                            <Phone className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Contact</p>
                            <p className="text-sm font-semibold text-gray-800">{request.contact_number}</p>
                          </div>
                        </div>
                        {request.address && (
                          <div className="flex items-center gap-2">
                            <div className="bg-purple-50 p-1.5 rounded-md">
                              <MapPin className="h-4 w-4 text-purple-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">Address</p>
                              <p className="text-sm font-semibold text-gray-800 truncate" title={request.address}>{request.address}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {request.medical_notes && (
                        <div className="bg-secondary/30 p-3 rounded-lg border border-secondary/40">
                          <p className="text-xs text-muted-foreground font-semibold mb-1">Medical Notes</p>
                          <p className="text-sm text-foreground/90">{request.medical_notes}</p>
                        </div>
                      )}

                      {request.requester_name && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-gray-50/50 p-2 rounded-md w-fit">
                          <span className="font-medium">Requested by:</span> {request.requester_name}
                          {request.requester_email && <span className="text-muted-foreground/80">({request.requester_email})</span>}
                        </div>
                      )}

                      {request.hospital_status === "pending" && (
                        <div className="flex gap-2 pt-3 border-t border-border/40">
                          <Button
                            onClick={() => updateRequestStatus(request.request_id, "approved")}
                            disabled={updatingId === request.request_id}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => updateRequestStatus(request.request_id, "rejected")}
                            disabled={updatingId === request.request_id}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1.5" />
                            Reject
                          </Button>
                        </div>
                      )}

                      {request.hospital_status === "approved" && (
                        <div className="flex gap-2 pt-3 border-t border-border/40">
                          <Button
                            onClick={() => openTransferModal(request)}
                            disabled={updatingId === request.request_id}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
                            Process Transfer
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Fulfilled Requests Section */}
        {requests.filter((r) => r.hospital_status === "fulfilled").length > 0 && activeTab === "all" && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
              <h2 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-500" />
                Fulfilled Requests
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-border via-border to-transparent" />
            </div>
            
            <div className="grid gap-3">
              {requests
                .filter((r) => r.hospital_status === "fulfilled")
                .map((request, index) => (
                  <Card
                    key={request.request_id}
                    className="glass-panel border-blue-200 bg-blue-50/30 overflow-hidden shadow-sm opacity-80 hover:opacity-100 transition-opacity"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-2 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{request.patient_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(request.created_at), "MMM dd, yyyy")} • {request.blood_type} • {request.units_needed || 1} unit(s)
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-blue-500 hover:bg-blue-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Fulfilled
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {/* Transfer Modal */}
        <Dialog open={transferModalOpen} onOpenChange={setTransferModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                Transfer Blood Unit
              </DialogTitle>
              <DialogDescription>
                Select an available blood unit to transfer for this request.
                {selectedRequest && (
                  <span className="block mt-2 font-medium text-foreground">
                    Patient: {selectedRequest.patient_name} • Blood Type: {selectedRequest.blood_type}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              {loadingDonations ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : availableDonations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Droplet className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No available {selectedRequest?.blood_type} blood units found.</p>
                  <p className="text-sm">Please add donations first.</p>
                </div>
              ) : (
                <RadioGroup value={selectedDonation} onValueChange={setSelectedDonation}>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {availableDonations.map((donation) => (
                      <div
                        key={donation.blood_id}
                        className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedDonation === donation.blood_id
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:bg-gray-50"
                          }`}
                        onClick={() => setSelectedDonation(donation.blood_id)}
                      >
                        <RadioGroupItem value={donation.blood_id} id={donation.blood_id} />
                        <Label htmlFor={donation.blood_id} className="flex-1 cursor-pointer">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">
                                {donation.blood_type}{donation.rh_factor} • {donation.component_type}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {donation.volume_ml}ml • ID: {donation.blood_id}
                              </p>
                              {donation.donor_name && (
                                <p className="text-sm text-muted-foreground">
                                  Donor: {donation.donor_name}
                                </p>
                              )}
                            </div>
                            <div className="text-right text-sm">
                              <p className="text-muted-foreground">Expires</p>
                              <p className="font-medium">
                                {format(new Date(donation.expiry_date), "MMM dd, yyyy")}
                              </p>
                            </div>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setTransferModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleTransfer}
                disabled={!selectedDonation || transferring}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {transferring ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Transferring...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="h-4 w-4 mr-1" />
                    Confirm Transfer
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Requests;
