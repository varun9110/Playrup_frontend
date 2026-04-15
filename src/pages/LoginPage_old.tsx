import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import sportsAcademyBg from "@/assets/sports-academy-bg.jpg";

// Form validation schema
const loginSchema = z
  .object({
    email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
    phone: z.string().min(10, "Please enter a valid phone number").optional().or(z.literal("")),
    password: z.string().min(6, "Password must be at least 6 characters"),
  })
  .superRefine((data, ctx) => {
    if (!data.email && !data.phone) {
      ctx.addIssue({
        code: "custom",
        message: "Either email or phone number is required",
        path: ["email"],
      });
      ctx.addIssue({
        code: "custom",
        message: "Either email or phone number is required",
        path: ["phone"],
      });
    }
  });


type LoginFormData = z.infer<typeof loginSchema>;

interface LoginPageProps {
  onEmailLogin?: (data: LoginFormData) => void;
  onGoogleLogin?: () => void;
  onFacebookLogin?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({
  onEmailLogin,
  onGoogleLogin,
  onFacebookLogin,
}) => {
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      phone: "",
      password: "",
    },
  });

  const handleEmailSubmit = (data: LoginFormData) => {
    onEmailLogin?.(data);
  };

  const handleGoogleLogin = () => {
    console.log("Google login clicked");
    onGoogleLogin?.();
  };

  const handleFacebookLogin = () => {
    console.log("Facebook login clicked");
    onFacebookLogin?.();
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 gradient-bg"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.6)), url(${sportsAcademyBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <Card className="w-full max-w-md card-gradient elegant-shadow backdrop-blur-sm border-white/20">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Sports Portal
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Welcome back! Sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Social Login Buttons */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full border-white/20 hover:bg-white/10 backdrop-blur-sm"
              onClick={handleGoogleLogin}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>
            
            <Button
              type="button"
              variant="outline"
              className="w-full border-white/20 hover:bg-white/10 backdrop-blur-sm"
              onClick={handleFacebookLogin}
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Continue with Facebook
            </Button>
          </div>

          <div className="relative">
            <Separator />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-card px-2 text-sm text-muted-foreground">or</span>
            </div>
          </div>

          {/* Email Login Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEmailSubmit)} className="space-y-4">
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

              <Button type="submit" className="w-full btn-gradient text-white font-semibold">
                Sign In
              </Button>
            </form>
          </Form>

          {/* Additional Links */}
          <div className="text-center space-y-2">
            <Button variant="link" className="text-sm text-muted-foreground">
              Forgot your password?
            </Button>
            <div className="text-sm">
              <span className="text-white/80">Don't have an account?{" "}</span>
              <a href="/signup" className="text-accent hover:text-accent/80 font-semibold transition-colors">
                Sign up
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;