import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, Mail, MapPin, Phone, ShieldPlus } from "lucide-react";

export default function AdminOnboardAcademy() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const role = "academy";

    const payload = {
      ...form,
      role,
    };

    try {
      setSubmitting(true);
      const response = await axios.post(
        "/api/academy/onboard-academy",
        payload
      );

      if (response.data?.emailDelivery !== "sent" && response.data?.onboardingLink) {
        console.info("Academy onboarding verification link:", response.data.onboardingLink);
      }

      toast({
        title: "Academy Onboarded",
        description: response.data?.emailDelivery === "sent"
          ? "Verification email has been sent to the owner."
          : "Verification link generated. Configure SMTP to send email automatically."
      });
      setForm({
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
      });
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      alert("Error: " + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <Navbar onLogout={handleLogout} />

      <div className="container mx-auto max-w-7xl space-y-8 px-4 py-8 md:py-12">
        <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
          <div>
            <h1 className="mb-2 text-4xl font-bold text-slate-900 md:text-5xl">Onboard Academy</h1>
            <p className="text-lg text-slate-600">
              Create a new academy account and publish it to the platform with verified manager credentials.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="h-11 rounded-lg" onClick={() => navigate("/adminlanding")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Admin Home
            </Button>
            <Button className="h-11 rounded-lg" onClick={() => navigate("/admin/notifications")}>
              Manage Notifications
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden border-slate-200">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-cyan-50">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <ShieldPlus className="h-5 w-5 text-blue-600" />
              Academy Setup Form
            </CardTitle>
            <CardDescription>All fields below are required to create a complete academy account.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="border-slate-300 text-slate-700">
                Superadmin: {user?.name ? String(user.name) : "Authorized"}
              </Badge>
              <Badge className="bg-blue-100 text-blue-700">Role: Academy</Badge>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="name" className="text-slate-700">Academy Name</Label>
                  <div className="relative mt-2">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="name"
                      name="name"
                      placeholder="Enter academy name"
                      value={form.name}
                      onChange={handleChange}
                      className="bg-white pl-9"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="text-slate-700">Academy Email</Label>
                  <div className="relative mt-2">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      name="email"
                      placeholder="Enter academy email"
                      value={form.email}
                      onChange={handleChange}
                      className="bg-white pl-9"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone" className="text-slate-700">Phone</Label>
                  <div className="relative mt-2">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="phone"
                      name="phone"
                      placeholder="Enter phone number"
                      value={form.phone}
                      onChange={handleChange}
                      className="bg-white pl-9"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="city" className="text-slate-700">City</Label>
                  <div className="relative mt-2">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="city"
                      name="city"
                      placeholder="Enter city"
                      value={form.city}
                      onChange={handleChange}
                      className="bg-white pl-9"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="address" className="text-slate-700">Address</Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="Enter academy address"
                  value={form.address}
                  onChange={handleChange}
                  className="mt-2 bg-white"
                  required
                />
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button type="submit" className="h-11 rounded-lg" disabled={submitting}>
                  {submitting ? "Creating Academy..." : "Create Academy"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-lg"
                  onClick={() =>
                    setForm({
                      name: "",
                      email: "",
                      phone: "",
                      address: "",
                      city: "",
                    })
                  }
                  disabled={submitting}
                >
                  Reset Form
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

