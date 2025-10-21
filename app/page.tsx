"use client";

import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { LogIn, LogOut, User, TestTube, Shield } from "lucide-react";

export default function Home() {
  const currentUser = useQuery(api.users.currentUser);
  const { signOut } = useAuthActions();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-xs">
              C
            </div>
            <span>Convex Auth Starter</span>
          </div>

          <div className="flex items-center gap-4">
            {currentUser === undefined ? (
              <div className="h-8 w-20 bg-muted animate-pulse rounded" />
            ) : currentUser === null ? (
              <div className="flex gap-2">
                <Button asChild variant="ghost">
                  <Link href="/auth/sign-in">
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/sign-up">Sign Up</Link>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium">{currentUser.name || currentUser.email}</span>
                </div>
                <Button onClick={handleSignOut} variant="outline" size="sm">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Convex Auth Starter
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A fully functional authentication starter built with Next.js and Convex Auth.
              Features password authentication, protected routes, and consistent client/server state.
            </p>

            {currentUser === undefined ? (
              <div className="h-10 w-32 bg-muted animate-pulse rounded mx-auto" />
            ) : currentUser === null ? (
              <div className="flex gap-4 justify-center">
                <Button asChild size="lg">
                  <Link href="/auth/sign-up">Get Started</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/auth/sign-in">Sign In</Link>
                </Button>
              </div>
            ) : (
              <div className="flex gap-4 justify-center">
                <Button asChild size="lg">
                  <Link href="/test-user">
                    <TestTube className="h-4 w-4 mr-2" />
                    Test Authentication
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {/* Authentication Status */}
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Authentication Status
              </CardTitle>
              <CardDescription>
                Current authentication state and user information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentUser === undefined ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-muted animate-pulse rounded-full" />
                  <span>Checking authentication...</span>
                </div>
              ) : currentUser === null ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Not Authenticated</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You are not currently signed in. Sign up or sign in to access protected features.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Authenticated</Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">{currentUser.name || 'No name set'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Email:</span>
                      <span className="text-sm">{currentUser.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">User ID:</span>
                      <span className="text-sm font-mono">{currentUser._id}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Password Authentication</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Secure email/password authentication powered by Convex Auth with automatic user management.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Protected Routes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Middleware-based route protection that automatically redirects unauthenticated users.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Client/Server Consistency</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Consistent authentication state between client-side and server-side code.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold">Quick Actions</h2>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button asChild variant="outline">
                <Link href="/test-user">
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Authentication
                </Link>
              </Button>
              {currentUser === null && (
                <>
                  <Button asChild variant="outline">
                    <Link href="/auth/sign-in">
                      <LogIn className="h-4 w-4 mr-2" />
                      Sign In
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href="/auth/sign-up">Sign Up</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
