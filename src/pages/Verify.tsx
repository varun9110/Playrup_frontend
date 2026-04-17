import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import bgLogin1 from "@/assets/bg-login-1.png";
import bgLogin2 from "@/assets/bg-login-2.png";
import bgLogin3 from "@/assets/bg-login-3.png";
import bgLogin4 from "@/assets/bg-login-4.png";
import bgLogin5 from "@/assets/bg-login-5.png";
import bgLogin6 from "@/assets/bg-login-6.png";

const Verify = () => {
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const backgrounds = [bgLogin1, bgLogin2, bgLogin3, bgLogin4, bgLogin5, bgLogin6];
  const backgroundImage = React.useMemo(
    () => backgrounds[Math.floor(Math.random() * backgrounds.length)],
    []
  );
  
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

      await axios.post('/api/auth/verify-otp', { email, otp });

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
    <div className="min-h-screen relative overflow-hidden bg-slate-50 text-slate-950">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      <div className="absolute inset-0 bg-transparent" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-12">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div className="hidden lg:block" />
          <div className="flex justify-center lg:translate-x-[23%]">
            <Card className="w-full max-w-xl rounded-[32px] border border-slate-200 bg-white shadow-2xl">
              <CardHeader className="text-center px-8 pt-10">
                <CardTitle className="text-3xl font-bold text-slate-950">Verify Your Account</CardTitle>
                <CardDescription className="text-slate-500">
                  We've sent a verification code to your email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 px-8 pb-10">
                <div className="text-center">
                  <p className="mb-2 text-sm text-slate-500">Enter the 6-digit code sent to:</p>
                  <p className="text-sm font-medium text-slate-900">{email}</p>
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
                  className="w-full bg-blue-600 text-white hover:bg-blue-700"
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? "Verifying..." : "Verify Email"}
                </Button>

                <div className="text-center space-y-2">
                  <p className="text-sm text-slate-500">Didn't receive the code?</p>
                  <Button
                    variant="outline"
                    onClick={handleResend}
                    disabled={!canResend || resendLoading}
                    className="border-slate-300 bg-slate-100 text-slate-900 hover:bg-slate-200"
                  >
                    {resendLoading
                      ? "Sending..."
                      : canResend
                        ? "Resend Code"
                        : `Resend in ${countdown}s`
                    }
                  </Button>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-slate-500">
                      Phone verification will be enabled once email is verified
                    </p>
                    <p className="text-xs text-slate-500">Phone: {phone}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={simulatePhoneVerification}
                      disabled={true}
                      className="text-xs border-slate-300 bg-slate-100 text-slate-900 hover:bg-slate-200"
                    >
                      Verify Phone (Demo)
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Verify;
