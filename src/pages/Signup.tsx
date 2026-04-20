import React, { useState } from "react";
import { useForm } from "react-hook-form";
import axios from 'axios';
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import bgLogin1 from "@/assets/bg-login-1.png";
import bgLogin2 from "@/assets/bg-login-2.png";
import bgLogin3 from "@/assets/bg-login-3.png";
import bgLogin4 from "@/assets/bg-login-4.png";
import bgLogin5 from "@/assets/bg-login-5.png";
import bgLogin6 from "@/assets/bg-login-6.png";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type SignupFormData = z.infer<typeof signupSchema>;

const Signup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const backgrounds = [bgLogin1, bgLogin2, bgLogin3, bgLogin4, bgLogin5, bgLogin6];
  const backgroundImage = React.useMemo(
    () => backgrounds[Math.floor(Math.random() * backgrounds.length)],
    []
  );

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: ""
    }
  });

  const handleSignup = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      const form = {
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone
      }
      const res = await axios.post('/api/auth/register', form);

      toast({
        title: "Account created successfully!",
        description: "Please check your email for verification."
      });
      
      navigate("/verify", { 
        state: { 
          email: data.email, 
          phone: data.phone 
        } 
      });
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
                <CardTitle className="text-3xl font-bold text-slate-950">Create Account</CardTitle>
                <CardDescription className="text-slate-500">
                  Join our sports community today
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 px-8 pb-10">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSignup)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Enter your name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="Enter your phone number"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirm your password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full bg-blue-600 text-white hover:bg-blue-700" disabled={isLoading}>
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>
                  </form>
                </Form>

                <div className="text-center text-sm text-slate-400">
                  Already have an account?{" "}
                  <Link to="/" className="text-slate-950 font-semibold hover:text-accent">
                    Sign in
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
