import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import sportsAcademyBg from "@/assets/sports-academy-bg.jpg";

const Verify = () => {
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const email = location.state?.email || "";
  const phone = location.state?.phone || "";

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  useEffect(() => {
    if (!email) {
      navigate("/signup");
    }
  }, [email, navigate]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a 6-digit verification code",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {

      const res = await axios.post('http://localhost:5000/api/auth/verify-otp', { email, otp });

      toast({
        title: "Email verified successfully!",
        description: "Your account has been activated."
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        toast({
          title: "Resend failed",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Verification code sent",
        description: "Please check your email for the new code"
      });
      
      setCountdown(60);
      setCanResend(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to resend verification code",
        variant: "destructive"
      });
    } finally {
      setResendLoading(false);
    }
  };

  const simulatePhoneVerification = () => {
    toast({
      title: "Phone verification",
      description: `Verification code sent to ${phone}. In a real app, this would send an SMS.`
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg p-4"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.6)), url(${sportsAcademyBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
      <Card className="w-full max-w-md card-gradient elegant-shadow backdrop-blur-sm border-white/20">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Verify Your Account</CardTitle>
          <CardDescription className="text-muted-foreground">
            We've sent a verification code to your email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Enter the 6-digit code sent to:
            </p>
            <p className="text-sm font-medium">{email}</p>
          </div>

          <div className="flex justify-center">
            <InputOTP value={otp} onChange={setOtp} maxLength={6}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button 
            onClick={handleVerify} 
            className="w-full btn-gradient text-white font-semibold" 
            disabled={isLoading || otp.length !== 6}
          >
            {isLoading ? "Verifying..." : "Verify Email"}
          </Button>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Didn't receive the code?
            </p>
            <Button
              variant="outline"
              onClick={handleResend}
              disabled={!canResend || resendLoading}
              className="text-sm border-white/20 hover:bg-white/10 backdrop-blur-sm"
            >
              {resendLoading 
                ? "Sending..." 
                : canResend 
                  ? "Resend Code" 
                  : `Resend in ${countdown}s`
              }
            </Button>
          </div>

          <div className="border-t border-border pt-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Phone verification will be enabled once email is verified
              </p>
              <p className="text-xs text-muted-foreground">
                Phone: {phone}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={simulatePhoneVerification}
                disabled={true}
                className="text-xs"
              >
                Verify Phone (Demo)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Verify;