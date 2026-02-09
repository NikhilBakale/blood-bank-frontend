import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/config/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Mail, Phone, MapPin, Users, Droplet, Calendar } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";

type HospitalProfile = {
  hospital_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  created_at: string | null;
  accountType: string;
  stats: {
    totalDonors: number;
    totalDonations: number;
    availableUnits: number;
  };
};

const Profile = () => {
  const { user, isAuthenticated } = useAuth();
  const hospitalId = user?.hospital_id;

  const [profile, setProfile] = useState<HospitalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log("Profile page - user:", user, "hospitalId:", hospitalId, "isAuthenticated:", isAuthenticated);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!hospitalId) {
        console.log("No hospital_id available");
        setError("No hospital ID found. Please log in again.");
        setLoading(false);
        return;
      }

      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log("Fetching profile for hospital:", hospitalId);
        const response = await fetch(
          `${API_BASE_URL}/hospital/profile?hospital_id=${hospitalId}`
        );

        console.log("Response status:", response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to fetch hospital profile");
        }

        const result = await response.json();
        console.log("Profile result:", result);
        setProfile(result.data);
      } catch (err: any) {
        console.error("Profile fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [hospitalId, isAuthenticated]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {error || "Unable to load hospital profile"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Animated Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-300/10 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-300/10 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      </div>

      <div className="relative z-10 p-6 space-y-6 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400">
            Hospital Information
          </h1>
          <p className="text-muted-foreground mt-1">View your hospital account details</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Hospital Details Card */}
          <Card className="md:col-span-2 glass-panel border-white/40 shadow-xl overflow-hidden">
            <CardHeader className="bg-white/30 border-b border-white/20 pb-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-6">
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shadow-inner ring-1 ring-white/50">
                    <Building2 className="h-10 w-10 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-3xl font-bold tracking-tight">{profile.name || "Hospital"}</CardTitle>
                    <CardDescription className="flex items-center gap-3 mt-2">
                      <Badge variant="secondary" className="px-3 py-1 bg-white/50 backdrop-blur-sm border-white/40 shadow-sm">
                        {profile.accountType}
                      </Badge>
                      <span className="text-sm font-mono text-muted-foreground bg-gray-100/50 px-2 py-1 rounded">ID: {profile.hospital_id}</span>
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid gap-10 md:grid-cols-2">
                <div className="space-y-6">
                  <h3 className="font-semibold text-lg flex items-center gap-2 border-b pb-2 border-gray-100/50">
                    <Users className="h-5 w-5 text-primary/70" />
                    Contact Information
                  </h3>

                  <div className="space-y-4">
                    {profile.email && (
                      <div className="flex items-center gap-4 group p-3 rounded-lg hover:bg-white/40 transition-colors">
                        <div className="bg-blue-50 p-2.5 rounded-xl group-hover:scale-110 transition-transform duration-300">
                          <Mail className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Email</p>
                          <p className="font-medium text-foreground/90">{profile.email}</p>
                        </div>
                      </div>
                    )}

                    {profile.phone && (
                      <div className="flex items-center gap-4 group p-3 rounded-lg hover:bg-white/40 transition-colors">
                        <div className="bg-green-50 p-2.5 rounded-xl group-hover:scale-110 transition-transform duration-300">
                          <Phone className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Phone</p>
                          <p className="font-medium text-foreground/90">{profile.phone}</p>
                        </div>
                      </div>
                    )}

                    {(profile.address || profile.city || profile.state) && (
                      <div className="flex items-start gap-4 group p-3 rounded-lg hover:bg-white/40 transition-colors">
                        <div className="bg-purple-50 p-2.5 rounded-xl mt-1 group-hover:scale-110 transition-transform duration-300">
                          <MapPin className="h-5 w-5 text-purple-500" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Address</p>
                          <p className="font-medium text-foreground/90 leading-relaxed">
                            {[profile.address, profile.city, profile.state, profile.postal_code]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        </div>
                      </div>
                    )}

                    {profile.created_at && (
                      <div className="flex items-center gap-4 group p-3 rounded-lg hover:bg-white/40 transition-colors">
                        <div className="bg-orange-50 p-2.5 rounded-xl group-hover:scale-110 transition-transform duration-300">
                          <Calendar className="h-5 w-5 text-orange-500" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Member Since</p>
                          <p className="font-medium text-foreground/90">
                            {format(new Date(profile.created_at), "MMMM dd, yyyy")}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="font-semibold text-lg flex items-center gap-2 border-b pb-2 border-gray-100/50">
                    <Droplet className="h-5 w-5 text-primary/70" />
                    Quick Stats
                  </h3>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center gap-5 p-5 bg-white/40 hover:bg-white/60 rounded-2xl border border-white/50 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 duration-300">
                      <div className="bg-primary/10 p-4 rounded-2xl">
                        <Users className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <p className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">{profile.stats.totalDonors}</p>
                        <p className="text-sm font-medium text-muted-foreground mt-1">Registered Donors</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-5 p-5 bg-white/40 hover:bg-white/60 rounded-2xl border border-white/50 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 duration-300">
                      <div className="bg-red-50 p-4 rounded-2xl">
                        <Droplet className="h-8 w-8 text-red-500" />
                      </div>
                      <div>
                        <p className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-red-400">{profile.stats.totalDonations}</p>
                        <p className="text-sm font-medium text-muted-foreground mt-1">Total Donations</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-5 p-5 bg-white/40 hover:bg-white/60 rounded-2xl border border-white/50 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 duration-300">
                      <div className="bg-green-50 p-4 rounded-2xl">
                        <Droplet className="h-8 w-8 text-green-600" />
                      </div>
                      <div>
                        <p className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-green-400">{profile.stats.availableUnits}</p>
                        <p className="text-sm font-medium text-muted-foreground mt-1">Available Units</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
