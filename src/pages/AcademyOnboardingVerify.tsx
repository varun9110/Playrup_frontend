import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, LogIn, MailCheck, ShieldAlert } from "lucide-react";

export default function AcademyOnboardingVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const token = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("token") || "";
  }, [location.search]);

  const hasSession = Boolean(localStorage.getItem("token") && localStorage.getItem("user"));

  const handleLogin = () => {
    navigate("/login", { state: { redirectTo: `/academy/onboarding/verify?token=${encodeURIComponent(token)}` } });
  };

  const handleVerify = async () => {
    if (!token) {
      setError("Verification token is missing from the link.");
      return;
    }

    if (!hasSession) {
      setError("Please login with your academy owner account and verify again.");
      return;
    }

    try {
      setVerifying(true);
      setError("");
      setSuccessMessage("");

      const response = await axios.post("/api/academy/verify-onboarding", { token });
      setSuccessMessage(response.data?.message || "Academy verified successfully.");
    } catch (err: any) {
      const message = err?.response?.data?.message || "Verification failed. Please try again.";
      setError(message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-2xl pt-8 md:pt-16">
        <Card className="border-slate-200 shadow-lg">
          <CardHeader className="space-y-3 border-b bg-gradient-to-r from-blue-50 to-cyan-50">
            <div className="flex items-center gap-2 text-blue-700">
              <MailCheck className="h-5 w-5" />
              <Badge variant="outline" className="border-blue-200 text-blue-700">
                Academy Email Verification
              </Badge>
            </div>
            <CardTitle className="text-2xl text-slate-900">Complete Academy Onboarding</CardTitle>
            <CardDescription>
              Verify ownership for this academy. You must be logged in with the invited owner account.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 p-6">
            {!hasSession && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 h-4 w-4" />
                  <p>
                    You are not logged in. Login first, then continue verification.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4" />
                  <p>{successMessage}</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {!hasSession && (
                <Button onClick={handleLogin} className="h-10">
                  <LogIn className="mr-2 h-4 w-4" />
                  Login as Owner
                </Button>
              )}

              <Button onClick={handleVerify} disabled={verifying || !token} className="h-10">
                {verifying ? "Verifying..." : "Verify Academy"}
              </Button>

              {successMessage && (
                <Button variant="outline" onClick={() => navigate("/academy-dashboard")} className="h-10">
                  Go to Academy Dashboard
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
