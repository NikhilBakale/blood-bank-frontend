import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "@/config/api";
import { useMsal } from "@azure/msal-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Droplet, AlertCircle } from "lucide-react";
import { loginRequest } from "@/integrations/azure/msalConfig";
import { useEmailAuth } from "@/hooks/useEmailAuth";
import { useAuth } from "@/context/AuthContext";
import OTPVerification from "@/components/OTPVerification";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const { instance } = useMsal();
  const emailAuth = useEmailAuth();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // OTP verification state
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [otpData, setOtpData] = useState({
    hospital_id: "",
    email: "",
    hospitalName: "",
  });

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    email: "",
    password: "",
    hospitalName: "",
    phone: "",
    address: "",
    city: "",
    state: ""
  });
  const [forgotData, setForgotData] = useState({ email: "", newPassword: "" });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [mounted, isAuthenticated, navigate]);

  const handleMicrosoftLogin = async () => {
    try {
      await instance.loginPopup(loginRequest);
      toast({
        title: "Success",
        description: "Logged in successfully!",
      });
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to log in",
        variant: "destructive",
      });
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await emailAuth.login(loginData.email, loginData.password);
      
      // Check if verification is required
      if (result && !result.success && result.requiresVerification) {
        setOtpData({
          hospital_id: result.hospital_id,
          email: result.email,
          hospitalName: "", // Not provided in login response
        });
        setShowOTPVerification(true);
        toast({
          title: "Verification Required",
          description: result.message || "Please verify your email to continue",
        });
        setLoading(false);
        return;
      }

      emailAuth.refreshAuthState();

      toast({
        title: "Success",
        description: "Logged in successfully!",
      });

      setTimeout(() => navigate("/dashboard"), 500);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to log in",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await emailAuth.register({
        email: registerData.email,
        password: registerData.password,
        hospitalName: registerData.hospitalName,
        phone: registerData.phone,
        address: registerData.address,
        city: registerData.city,
        state: registerData.state,
      });

      console.log('🔍 Registration result:', result);
      console.log('🔍 result.requiresVerification value:', result.requiresVerification);
      console.log('🔍 result.requiresVerification type:', typeof result.requiresVerification);
      console.log('🔍 Boolean check:', result.requiresVerification === true);

      // Check if OTP verification is required
      if (result.requiresVerification) {
        console.log('🎯 Showing OTP verification screen');
        console.log('Setting OTP data:', {
          hospital_id: result.hospital_id,
          email: result.email,
          hospitalName: result.hospitalName,
        });
        
        setOtpData({
          hospital_id: result.hospital_id,
          email: result.email,
          hospitalName: result.hospitalName,
        });
        
        console.log('Setting showOTPVerification to TRUE');
        setShowOTPVerification(true);
        
        console.log('showOTPVerification state should now be true');
        
        toast({
          title: "Check Your Email!",
          description: "We've sent a 6-digit OTP to verify your email address.",
        });
        setLoading(false);
        
        console.log('Registration handler complete - OTP screen should be visible');
        return;
      }

      console.log('⚠️ No verification required - direct login');
      
      // Old flow - direct login (for backward compatibility)
      emailAuth.refreshAuthState();

      toast({
        title: "Success",
        description: "Account created successfully! You are now logged in.",
      });

      setTimeout(() => navigate("/dashboard"), 500);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Registration failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerified = (token: string, userData: any) => {
    // Save auth state after OTP verification
    emailAuth.saveAuthAfterVerification(token, userData);
    emailAuth.refreshAuthState();

    toast({
      title: "Welcome! 🎉",
      description: "Your account is verified. Redirecting to dashboard...",
    });

    setTimeout(() => navigate("/dashboard"), 1000);
  };

  const handleCancelOTP = () => {
    setShowOTPVerification(false);
    setOtpData({ hospital_id: "", email: "", hospitalName: "" });
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotData.email,
          newPassword: forgotData.newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Password reset failed");
      }

      toast({
        title: "Success",
        description: "Password reset successfully! You can now log in with your new password.",
      });

      setForgotData({ email: "", newPassword: "" });
      // Optionally switch back to login tab
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Password reset failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  console.log('🔄 Auth component render - showOTPVerification:', showOTPVerification);
  console.log('🔄 OTP Data:', otpData);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Blobs - Medical Blue Theme */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-cyan-300/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
      </div>

      {console.log('🎨 Rendering - showOTPVerification is:', showOTPVerification)}
      
      {/* Show OTP Verification if required */}
      {showOTPVerification ? (
        <>
          {console.log('✅ Rendering OTP Verification component')}
          <OTPVerification
            hospitalId={otpData.hospital_id}
          email={otpData.email}
          hospitalName={otpData.hospitalName || "Hospital"}
          onVerified={handleOTPVerified}
          onCancel={handleCancelOTP}
        />
        </>
      ) : (
        <>
          {console.log('❌ Rendering login/register form (OTP screen NOT shown)')}
          <Card className="w-full max-w-md glass-panel border-white/40 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <CardHeader className="text-center pb-8">
          <div className="flex justify-center mb-6">
            <div className="bg-primary/10 p-4 rounded-2xl shadow-inner ring-1 ring-white/50">
              <Droplet className="h-10 w-10 text-primary drop-shadow-sm" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
            Blood Inventory
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground/80 mt-2">
            Secure access for hospital staff
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8 bg-black/5 backdrop-blur-sm p-1">
              <TabsTrigger value="login" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Login</TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Register</TabsTrigger>
              <TabsTrigger value="forgot" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Recovery</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Hospital Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="hospital@example.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                    className="bg-white/50 border-white/40 focus:border-primary focus:ring-primary/20 transition-all h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                    className="bg-white/50 border-white/40 focus:border-primary focus:ring-primary/20 transition-all h-11"
                  />
                </div>
                <Button type="submit" className="w-full h-11 text-base shadow-lg hover:shadow-primary/25 transition-all" disabled={loading}>
                  {loading ? "Logging in..." : "Login to Dashboard"}
                </Button>
              </form>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-muted-foreground/20"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-transparent px-2 text-muted-foreground backdrop-blur-sm">Or secure sign in with</span>
                </div>
              </div>

              <Button
                onClick={handleMicrosoftLogin}
                variant="outline"
                className="w-full h-11 border-white/40 bg-white/30 hover:bg-white/50"
              >
                <img src="https://learn.microsoft.com/en-us/azure/active-directory/develop/media/howto-add-branding-in-azure-ad-apps/ms-symbollockup_mssymbol_19.png" alt="Microsoft" className="w-5 h-5 mr-2" />
                Sign in with Microsoft
              </Button>
            </TabsContent>

            <TabsContent value="register" className="animate-in slide-in-from-bottom-2 duration-300">
              <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <form onSubmit={handleEmailRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="hospital-name">Hospital Name</Label>
                    <Input
                      id="hospital-name"
                      placeholder="City General Hospital"
                      value={registerData.hospitalName}
                      onChange={(e) => setRegisterData({ ...registerData, hospitalName: e.target.value })}
                      required
                      className="bg-white/50 border-white/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Official Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="admin@hospital.com"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      required
                      className="bg-white/50 border-white/40"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 234..."
                        value={registerData.phone}
                        onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                        className="bg-white/50 border-white/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        placeholder="New York"
                        value={registerData.city}
                        onChange={(e) => setRegisterData({ ...registerData, city: e.target.value })}
                        className="bg-white/50 border-white/40"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      placeholder="123 Medical St"
                      value={registerData.address}
                      onChange={(e) => setRegisterData({ ...registerData, address: e.target.value })}
                      className="bg-white/50 border-white/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      placeholder="NY"
                      value={registerData.state}
                      onChange={(e) => setRegisterData({ ...registerData, state: e.target.value })}
                      className="bg-white/50 border-white/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Create Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Strong password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      required
                      className="bg-white/50 border-white/40"
                    />
                  </div>
                  <Button type="submit" className="w-full mt-2" disabled={loading}>
                    {loading ? "Creating Account..." : "Register Hospital"}
                  </Button>
                </form>
              </div>
            </TabsContent>

            <TabsContent value="forgot" className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
              <div className="text-center mb-6">
                <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Enter your registered email address and we'll help you reset your password.
                </p>
              </div>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email Address</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="hospital@example.com"
                    value={forgotData.email}
                    onChange={(e) => setForgotData({ ...forgotData, email: e.target.value })}
                    required
                    className="bg-white/50 border-white/40"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="forgot-password">New Password</Label>
                  <Input
                    id="forgot-password"
                    type="password"
                    placeholder="Enter new password"
                    value={forgotData.newPassword}
                    onChange={(e) => setForgotData({ ...forgotData, newPassword: e.target.value })}
                    required
                    className="bg-white/50 border-white/40"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
        </>
      )}

      <div className="absolute bottom-4 text-center text-xs text-muted-foreground/60 w-full">
        &copy; {new Date().getFullYear()} Blood Inventory System. Secure Medical Portal.
      </div>
    </div>
  );
};

export default Auth;
