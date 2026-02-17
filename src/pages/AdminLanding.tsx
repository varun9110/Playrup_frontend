import React, { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminLanding() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (!user || user.role !== "superadmin") {
      const timer = setTimeout(() => navigate("/"), 1000);
      return () => clearTimeout(timer);
    }
  }, [user, navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  if (!user || user.role !== "superadmin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground text-lg">
          Unauthorized access. Redirecting...
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen gradient-bg px-4">
      <Card className="w-full max-w-lg card-gradient elegant-shadow backdrop-blur-sm border-white/20">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Superadmin Dashboard
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Welcome, <span className="font-semibold text-accent">Super Admin</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <Link to="/admin/onboard">
            <Button className="w-full btn-gradient text-white font-semibold">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Onboard New Academy
            </Button>
          </Link>

          <Link to="/admin/bookings">
            <Button className="w-full" variant="outline">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              View Admin Bookings
            </Button>
          </Link>

          <Button
            className="w-full"
            variant="destructive"
            onClick={handleLogout}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
