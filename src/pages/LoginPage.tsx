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
import bgLogin1 from "@/assets/bg-login-1.png";
import bgLogin2 from "@/assets/bg-login-2.png";
import bgLogin3 from "@/assets/bg-login-3.png";
import bgLogin4 from "@/assets/bg-login-4.png";
import bgLogin5 from "@/assets/bg-login-5.png";
import bgLogin6 from "@/assets/bg-login-6.png";

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

  const backgrounds = [bgLogin1, bgLogin2, bgLogin3, bgLogin4, bgLogin5, bgLogin6];
  const backgroundImage = React.useMemo(
    () => backgrounds[Math.floor(Math.random() * backgrounds.length)],
    []
  );

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
    <div className="min-h-screen relative overflow-hidden bg-slate-50 text-slate-950">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      <div className="absolute inset-0 bg-transparent" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-12">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div className="hidden lg:block" />
          <div className="flex justify-end">
            <Card className="w-full max-w-xl rounded-[32px] border border-slate-200 bg-white shadow-2xl">
            <CardHeader className="text-center px-8 pt-10">
              <CardTitle className="text-3xl font-bold text-slate-950">Sign in</CardTitle>
              <CardDescription className="text-slate-500">
                Enter your email or phone number to continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-8 pb-10">
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-slate-300 bg-slate-100 text-slate-900 hover:bg-slate-200"
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
                  className="w-full border-slate-300 bg-slate-100 text-slate-900 hover:bg-slate-200"
                  onClick={handleFacebookLogin}
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Continue with Facebook
                </Button>
              </div>

              <div className="relative">
                <Separator />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-slate-100 px-3 text-sm text-slate-500">or</span>
                </div>
              </div>

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

                  <Button type="submit" className="w-full bg-blue-600 text-white hover:bg-blue-700">
                    Sign In
                  </Button>
                </form>
              </Form>

              <div className="text-center space-y-3">
                <Button variant="link" className="text-sm text-slate-500 hover:text-slate-900">
                  Forgot your password?
                </Button>
                <div className="text-sm text-slate-400">
                  Don't have an account?{" "}
                  <a href="/signup" className="text-slate-950 font-semibold hover:text-accent">
                    Sign up
                  </a>
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

export default LoginPage;