"use client";

import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, User, Mail, Calendar, Database, Globe } from 'lucide-react';

interface ApiResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    name?: string;
    email: string;
    isEmailVerified: boolean;
    emailVerificationTime?: number;
    createdAt: number;
    phone?: string;
    image?: string;
    isActive: boolean;
  };
  error?: string;
  debug?: {
    hasAuthToken: boolean;
    authTokenLength: number;
    timestamp: string;
  };
}

export default function TestUserPage() {
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Get user data directly from Convex (client-side)
  const convexUser = useQuery(api.users.currentUser);

  // Function to call the API route
  const fetchUserFromAPI = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/test-user', {
        method: 'GET',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: ApiResponse = await response.json();
      setApiResponse(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch user from API:', error);
      setApiResponse({
        success: false,
        message: 'Failed to fetch user data',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch on component mount
  useEffect(() => {
    fetchUserFromAPI();
  }, []);

  const formatDate = (timestamp: number | string) => {
    const date = new Date(typeof timestamp === 'number' ? timestamp : timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">User Authentication Test</h1>
            <p className="text-muted-foreground">
              Testing current user data from both Convex client and API route
            </p>
          </div>
          <Button 
            onClick={fetchUserFromAPI} 
            disabled={isLoading}
            variant="outline"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh API Data
          </Button>
        </div>

        {lastUpdated && (
          <p className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleString()}
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Convex Client Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Convex Client Data
              </CardTitle>
              <CardDescription>
                User data fetched directly from Convex using useQuery hook
              </CardDescription>
            </CardHeader>
            <CardContent>
              {convexUser === undefined ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : convexUser === null ? (
                <div className="text-center py-4">
                  <User className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No user authenticated</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">{convexUser.name || 'No name'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{convexUser.email}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">
                      Created: {formatDate(convexUser._creationTime)}
                    </span>
                  </div>

                  <Separator />
                  
                  <div className="text-xs text-muted-foreground">
                    <p>ID: {convexUser._id}</p>
                    <p>Email Verified: {convexUser.emailVerificationTime ? 'Yes' : 'No'}</p>
                    {convexUser.phone && <p>Phone: {convexUser.phone}</p>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* API Route Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                API Route Data
              </CardTitle>
              <CardDescription>
                User data fetched from Next.js API route (/api/auth/test-user)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!apiResponse ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : !apiResponse.success ? (
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <User className="h-8 w-8 mx-auto text-red-500 mb-2" />
                    <p className="text-red-600 font-medium">{apiResponse.message}</p>
                    {apiResponse.error && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Error: {apiResponse.error}
                      </p>
                    )}
                  </div>
                  
                  {apiResponse.debug && (
                    <div className="bg-muted p-3 rounded text-xs">
                      <p className="font-medium mb-2">Debug Info:</p>
                      <pre>{JSON.stringify(apiResponse.debug, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">{apiResponse.user?.name || 'No name'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{apiResponse.user?.email}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">
                      Created: {apiResponse.user?.createdAt ? formatDate(apiResponse.user.createdAt) : 'Unknown'}
                    </span>
                  </div>

                  <Separator />
                  
                  <div className="text-xs text-muted-foreground">
                    <p>ID: {apiResponse.user?.id}</p>
                    <p>Email Verified: {apiResponse.user?.isEmailVerified ? 'Yes' : 'No'}</p>
                  </div>

                  {apiResponse.debug && (
                    <div className="bg-muted p-3 rounded text-xs">
                      <p className="font-medium mb-2">Debug Info:</p>
                      <pre>{JSON.stringify(apiResponse.debug, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Data Comparison</CardTitle>
            <CardDescription>
              Comparing data consistency between Convex client and API route
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Convex User Status:</span>
                <Badge variant={convexUser ? "default" : "destructive"}>
                  {convexUser === undefined ? "Loading" : convexUser ? "Authenticated" : "Not Authenticated"}
                </Badge>
              </div>
              
              <div className="flex justify-between">
                <span>API Route Status:</span>
                <Badge variant={apiResponse?.success ? "default" : "destructive"}>
                  {!apiResponse ? "Loading" : apiResponse.success ? "Authenticated" : "Not Authenticated"}
                </Badge>
              </div>
              
              <div className="flex justify-between">
                <span>Data Consistency:</span>
                <Badge variant={
                  convexUser && apiResponse?.success && 
                  convexUser._id === apiResponse.user?.id ? "default" : "secondary"
                }>
                  {convexUser && apiResponse?.success && convexUser._id === apiResponse.user?.id 
                    ? "Consistent" : "Different"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
