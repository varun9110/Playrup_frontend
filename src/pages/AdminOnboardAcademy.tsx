import React, { useState } from "react";
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

export default function AdminOnboardAcademy() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
  });
  const { toast } = useToast();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const role = "academy";

    const payload = {
      ...form,
      role,
    };

    try {
      const res = await axios.post(
        "http://localhost:5000/api/academy/onboard-academy",
        payload
      );

      toast({
        title: "Academy Created Successfully!",
        description: "The academy has been onboarded successfully."
      });
      setForm({
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
      });
    } catch (err) {
      alert("Error: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen gradient-bg px-4">
      <Card className="w-full max-w-lg card-gradient elegant-shadow backdrop-blur-sm border-white/20">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Onboard Academy
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Add a new badminton academy to our platform
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Academy Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Enter academy name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Academy Email</Label>
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="Enter academy email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                placeholder="Enter phone number"
                value={form.phone}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                placeholder="Enter academy address"
                value={form.address}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                name="city"
                placeholder="Enter city"
                value={form.city}
                onChange={handleChange}
              />
            </div>

            <Button type="submit" className="w-full btn-gradient text-white font-semibold">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Create Academy
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
