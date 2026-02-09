import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, User, Droplet } from "lucide-react";

const Donors = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [donors, setDonors] = useState([]);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Calculate expiry date based on medical standards (FDA/AABB guidelines)
  const calculateExpiry = (component_type, collection_date) => {
    // Parse date carefully to avoid timezone issues
    const date = new Date(collection_date + 'T00:00:00');
    let days = 35; // Default for whole blood

    // Set shelf life according to medical standards
    if (component_type === "Whole Blood") days = 35;
    else if (component_type === "Red Blood Cells") days = 42;
    else if (component_type === "Platelets") days = 5;
    else if (component_type === "Fresh Frozen Plasma") days = 365;
    else if (component_type === "Cryoprecipitate") days = 365;

    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
  };

  // Get hospital_id from authenticated user
  const hospitalId = user?.hospital_id;

  // Debug: log hospital_id
  useEffect(() => {
    console.log("🏥 Donors Page - User object:", user);
    console.log("🏥 Hospital ID:", hospitalId);
    console.log("🏥 Is Authenticated:", isAuthenticated);

    // Wait a bit for auth to settle
    const timer = setTimeout(() => {
      setIsAuthReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [user, hospitalId, isAuthenticated]);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    gender: "Male",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    postal_code: "",
    blood_type: "O",
    rh_factor: "+",
    component_type: "Whole Blood",
    volume_ml: "450",
    collection_date: new Date().toISOString().split("T")[0],
    expiry_date: calculateExpiry("Whole Blood", new Date().toISOString().split("T")[0]),
    storage_location: "",
  });

  const handleComponentChange = (e) => {
    const component = e.target.value;
    setFormData({
      ...formData,
      component_type: component,
      expiry_date: calculateExpiry(component, formData.collection_date),
    });
  };

  const handleCollectionDateChange = (e) => {
    const date = e.target.value;
    setFormData({
      ...formData,
      collection_date: date,
      expiry_date: calculateExpiry(formData.component_type, date),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!hospitalId) {
        console.error("User object:", user);
        console.error("Auth data from localStorage:", localStorage.getItem("blood_bank_auth_token"));
        throw new Error("Hospital ID not found. Please log out and log in again.");
      }

      console.log("📝 Creating donor with hospital_id:", hospitalId);

      // 1. Create donor
      const donorResponse = await fetch(`${API_BASE_URL}/donors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospital_id: hospitalId,
          first_name: formData.first_name,
          last_name: formData.last_name,
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postal_code,
        }),
      });

      if (!donorResponse.ok) {
        const error = await donorResponse.json();
        console.error("❌ Donor creation error response:", error);
        throw new Error(error.details || error.error || "Failed to create donor");
      }

      const donorData = await donorResponse.json();
      const donor_id = donorData.data.donor_id;

      // 2. Create donation record
      const donationPayload = {
        donor_id: donor_id,
        hospital_id: hospitalId,
        blood_type: formData.blood_type,
        rh_factor: formData.rh_factor,
        component_type: formData.component_type,
        volume_ml: parseInt(formData.volume_ml),
        collection_date: formData.collection_date,
        expiry_date: formData.expiry_date,
        storage_location: formData.storage_location,
      };

      console.log("📤 Sending donation payload:", donationPayload);

      const donationResponse = await fetch(`${API_BASE_URL}/donations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(donationPayload),
      });

      if (!donationResponse.ok) {
        const error = await donationResponse.json();
        console.error("❌ Donation creation error response:", error);
        if (error.missing) {
          console.error("❌ Missing fields details:", error.missing);
        }
        throw new Error(error.details || error.error || "Failed to record donation");
      }

      const donationData = await donationResponse.json();

      toast({
        title: "Success",
        description: `Donor ${formData.first_name} ${formData.last_name} added with Blood ID: ${donationData.data.blood_id}`,
      });

      // Reset form and close dialog
      setFormData({
        first_name: "",
        last_name: "",
        date_of_birth: "",
        gender: "Male",
        phone: "",
        email: "",
        address: "",
        city: "",
        state: "",
        postal_code: "",
        blood_type: "O",
        rh_factor: "+",
        component_type: "Whole Blood",
        volume_ml: "450",
        collection_date: new Date().toISOString().split("T")[0],
        expiry_date: "",
        storage_location: "",
      });

      setIsOpen(false);

      // Refresh donors list
      fetchDonors();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to add donor",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDonors = async () => {
    try {
      if (!hospitalId) {
        console.warn("Hospital ID not available yet");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/donors?hospital_id=${hospitalId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch donors");
      }

      const data = await response.json();
      setDonors(data.data || []);
    } catch (error) {
      console.error("Fetch donors error:", error);
      toast({
        title: "Error",
        description: "Failed to load donors",
        variant: "destructive",
      });
    }
  };

  // Load donors on mount
  useEffect(() => {
    if (hospitalId) {
      fetchDonors();
    }
  }, [hospitalId]);

  return (
    <div className="relative min-h-screen">
      {/* Animated Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-red-400/10 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-pink-400/10 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      </div>

      <div className="relative z-10 p-6 space-y-6 animate-in fade-in duration-500">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400">
              Donors Management
            </h1>
            <p className="text-muted-foreground mt-1">Manage blood donors and donation records</p>
          </div>
          <Button onClick={() => setIsOpen(true)} className="gap-2 shadow-lg hover:shadow-primary/25 transition-all duration-300 transform hover:-translate-y-0.5">
            <Plus className="h-4 w-4" />
            Add New Donor
          </Button>
        </div>

        {/* Donors List */}
        <Card className="glass-panel border-white/40 shadow-xl overflow-hidden">
          <CardContent className="p-0">
            {donors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="bg-secondary/50 p-6 rounded-full mb-4">
                  <User className="h-10 w-10 opacity-50" />
                </div>
                <p className="text-lg font-medium">No donors registered yet</p>
                <p className="text-sm">Add your first donor to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50/50 backdrop-blur-sm">
                    <TableRow className="border-b border-gray-100 hover:bg-transparent">
                      <TableHead className="w-[80px] font-semibold text-primary">ID</TableHead>
                      <TableHead className="font-semibold text-primary">Name</TableHead>
                      <TableHead className="font-semibold text-primary">DOB</TableHead>
                      <TableHead className="font-semibold text-primary">Gender</TableHead>
                      <TableHead className="font-semibold text-primary">Phone</TableHead>
                      <TableHead className="font-semibold text-primary">Email</TableHead>
                      <TableHead className="font-semibold text-primary">Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {donors.map((donor) => (
                      <TableRow key={donor.donor_id} className="hover:bg-primary/5 transition-colors border-b border-gray-50">
                        <TableCell className="font-medium text-foreground/80">
                          <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-md text-xs font-bold border border-primary/10">
                            {donor.donor_id}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                              {donor.first_name[0]}{donor.last_name[0]}
                            </div>
                            {donor.first_name} {donor.last_name}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(donor.date_of_birth).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${donor.gender === 'Male' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-pink-50 text-pink-700 border-pink-100'}`}>
                            {donor.gender}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{donor.phone || "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{donor.email || "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={donor.address}>{donor.address || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Donor Dialog */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-panel border-white/40">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                Add New Donor
              </DialogTitle>
              <DialogDescription className="text-base">
                Register a new blood donor and record their blood donation details.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              {/* Donor Information Section */}
              <div className="space-y-4 p-4 rounded-xl bg-secondary/20 border border-border/50">
                <h3 className="font-semibold text-lg flex items-center gap-2 text-primary">
                  <User className="h-5 w-5" />
                  Donor Information
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      required
                      className="bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      required
                      className="bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth *</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      required
                      className="bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender *</Label>
                    <select
                      id="gender"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md bg-white/50 border-input ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Postal Code</Label>
                    <Input
                      id="postal_code"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      className="bg-white/50"
                    />
                  </div>
                </div>
              </div>

              {/* Blood Donation Information Section */}
              <div className="space-y-4 p-4 rounded-xl bg-red-50/50 border border-red-100 dark:bg-red-900/10 dark:border-red-900/30">
                <h3 className="font-semibold text-lg flex items-center gap-2 text-medical-red">
                  <Droplet className="h-5 w-5 fill-current" />
                  Blood Donation Information
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="blood_type">Blood Type *</Label>
                    <select
                      id="blood_type"
                      value={formData.blood_type}
                      onChange={(e) => setFormData({ ...formData, blood_type: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md bg-white/50 border-input ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option>O</option>
                      <option>A</option>
                      <option>B</option>
                      <option>AB</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rh_factor">RH Factor *</Label>
                    <select
                      id="rh_factor"
                      value={formData.rh_factor}
                      onChange={(e) => setFormData({ ...formData, rh_factor: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md bg-white/50 border-input ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="+">+</option>
                      <option value="-">-</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="component_type">Component Type *</Label>
                    <select
                      id="component_type"
                      value={formData.component_type}
                      onChange={handleComponentChange}
                      className="w-full px-3 py-2 border rounded-md bg-white/50 border-input ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option>Whole Blood</option>
                      <option>Red Blood Cells</option>
                      <option>Platelets</option>
                      <option>Fresh Frozen Plasma</option>
                      <option>Cryoprecipitate</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="volume_ml">Volume (ml) *</Label>
                    <Input
                      id="volume_ml"
                      type="number"
                      value={formData.volume_ml}
                      onChange={(e) => setFormData({ ...formData, volume_ml: e.target.value })}
                      required
                      className="bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="collection_date">Collection Date *</Label>
                    <Input
                      id="collection_date"
                      type="date"
                      value={formData.collection_date}
                      onChange={handleCollectionDateChange}
                      required
                      className="bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiry_date">Expiry Date *</Label>
                    <Input
                      id="expiry_date"
                      type="date"
                      value={formData.expiry_date}
                      readOnly
                      className="bg-gray-100"
                    />
                    <p className="text-xs text-muted-foreground">Auto-calculated based on component type</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storage_location">Storage Location</Label>
                    <Input
                      id="storage_location"
                      value={formData.storage_location}
                      onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                      placeholder="e.g., Freezer A, Shelf 3"
                      className="bg-white/50"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button variant="outline" onClick={() => setIsOpen(false)} className="hover:bg-secondary">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="shadow-lg hover:shadow-primary/25">
                  {loading ? "Adding..." : "Add Donor & Record Donation"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Donors;
