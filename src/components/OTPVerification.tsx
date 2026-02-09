import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, RefreshCw, CheckCircle2 } from "lucide-react";

interface OTPVerificationProps {
  hospitalId: string;
  email: string;
  hospitalName: string;
  onVerified: (token: string, userData: any) => void;
  onCancel: () => void;
}

const OTPVerification = ({ hospitalId, email, hospitalName, onVerified, onCancel }: OTPVerificationProps) => {
  const { toast } = useToast();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(600); // 10 minutes in seconds
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a 6-digit OTP",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospital_id: hospitalId,
          email: email,
          otp: otp,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || "Verification failed");
      }

      const data = await response.json();

      toast({
        title: "Success! 🎉",
        description: "Your email has been verified successfully!",
      });

      // Pass token and user data to parent
      onVerified(data.data.token, data.data);
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid or expired OTP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResending(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospital_id: hospitalId,
          email: email,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to resend OTP");
      }

      toast({
        title: "OTP Sent",
        description: "A new OTP has been sent to your email",
      });

      // Reset timer
      setTimer(600);
      setCanResend(false);
      setOtp("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend OTP",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  const handleOTPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(value);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-red-100 p-3 rounded-full">
            <Mail className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <CardTitle className="text-2xl">Verify Your Email</CardTitle>
        <CardDescription className="text-base">
          We've sent a 6-digit OTP to<br />
          <strong className="text-foreground">{email}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">Enter OTP</Label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="000000"
              value={otp}
              onChange={handleOTPChange}
              className="text-center text-2xl tracking-widest font-bold"
              maxLength={6}
              autoFocus
            />
          </div>

          {timer > 0 ? (
            <p className="text-sm text-center text-muted-foreground">
              OTP expires in: <span className="font-semibold text-red-600">{formatTime(timer)}</span>
            </p>
          ) : (
            <p className="text-sm text-center text-destructive font-semibold">
              OTP has expired. Please request a new one.
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || otp.length !== 6}
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Verify Email
              </>
            )}
          </Button>
        </form>

        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleResendOTP}
            disabled={resending || !canResend}
          >
            {resending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                {canResend ? "Resend OTP" : `Resend OTP (${formatTime(timer)})`}
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
          <p className="text-xs text-blue-900 text-center">
            <strong>Didn't receive the email?</strong><br />
            Check your spam folder or wait {formatTime(timer)} to request a new OTP
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default OTPVerification;
