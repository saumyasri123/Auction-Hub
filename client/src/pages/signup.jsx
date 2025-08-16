import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { authManager } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { Gavel, User, Mail, Lock, ArrowRight, UserCheck, Store } from "lucide-react";

const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    role: z.enum(["buyer", "seller"], {
      required_error: "Please select your account type",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export default function Signup() {
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "buyer",
    },
  });

  useEffect(() => {
    if (authManager.isAuthenticated()) {
      navigate("/");
    }
  }, [navigate]);

  const onSubmit = async (data) => {
    setIsLoading(true);

    try {
      const success = await authManager.signup(
        data.name,
        data.email,
        data.password,
        data.role
      );

      if (success) {
        toast({
          title: "Account Created!",
          description: `Welcome to AuctionHub! Your ${data.role} account has been created successfully.`,
        });
        navigate("/");
      } else {
        toast({
          title: "Signup Failed",
          description:
            "An account with this email already exists or there was an error creating your account.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Signup Error",
        description: error?.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full">
              <Gavel className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Join AuctionHub</h1>
          <p className="mt-2 text-gray-600">
            Create your account to start bidding or selling
          </p>
        </div>

        {/* Signup Form */}
        <Card>
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Account Type Selection */}
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>I want to...</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-2 gap-4"
                        >
                          <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                            <RadioGroupItem value="buyer" id="buyer" />
                            <Label
                              htmlFor="buyer"
                              className="flex items-center space-x-2 cursor-pointer flex-1"
                            >
                              <UserCheck className="w-5 h-5 text-primary" />
                              <div>
                                <div className="font-medium">Buy Items</div>
                                <div className="text-xs text-gray-500">
                                  Bid on auctions
                                </div>
                              </div>
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                            <RadioGroupItem value="seller" id="seller" />
                            <Label
                              htmlFor="seller"
                              className="flex items-center space-x-2 cursor-pointer flex-1"
                            >
                              <Store className="w-5 h-5 text-primary" />
                              <div>
                                <div className="font-medium">Sell Items</div>
                                <div className="text-xs text-gray-500">
                                  Create auctions
                                </div>
                              </div>
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <Input
                            placeholder="Enter your full name"
                            className="pl-10 focus:ring-2 focus:ring-primary"
                            {...field}
                          />
                        </div>
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
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <Input
                            type="email"
                            placeholder="Enter your email"
                            className="pl-10 focus:ring-2 focus:ring-primary"
                            {...field}
                          />
                        </div>
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
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <Input
                            type="password"
                            placeholder="Create a password"
                            className="pl-10 focus:ring-2 focus:ring-primary"
                            {...field}
                          />
                        </div>
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
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <Input
                            type="password"
                            placeholder="Confirm your password"
                            className="pl-10 focus:ring-2 focus:ring-primary"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isLoading} size="lg">
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Sign In Link */}
        <div className="text-center">
          <p className="text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:text-primary/80 font-medium">
              Sign in here
            </Link>
          </p>
        </div>

        {/* Terms Notice */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            By creating an account, you agree to our{" "}
            <a href="#" className="text-primary hover:text-primary/80">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="text-primary hover:text-primary/80">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
