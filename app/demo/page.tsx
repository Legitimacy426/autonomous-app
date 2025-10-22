"use client";

import { useState } from "react";
import { AIInterface } from "@/components/ai/ai-interface";
import ConvexClientProvider from "@/components/convex-client-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Bot, 
  Database, 
  Users, 
  Terminal,
  RefreshCw,
  Sparkles,
  Code2,
  Settings,
  Activity
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function UsersDashboard() {
  const users = useQuery(api.functions.users.listUsers);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Parse the users string response into structured data
  const parseUsers = (usersString: string) => {
    if (!usersString || usersString.includes("No users found")) {
      return [];
    }

    const lines = usersString.split('\n').slice(1); // Skip the first line (header)
    return lines
      .filter(line => line.trim().startsWith('-'))
      .map(line => {
        const match = line.match(/- (.+) \((.+)\)/);
        if (match) {
          return { name: match[1], email: match[2] };
        }
        return null;
      })
      .filter(Boolean);
  };

  const usersList = users ? parseUsers(users) : [];

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Database className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Users Database</CardTitle>
              <CardDescription>Real-time view of all users</CardDescription>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            className="hover:bg-blue-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {usersList.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No users in the database yet</p>
              <p className="text-xs mt-1">Use the AI console to create some users</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-gray-600 mb-3">
                Total users: <Badge variant="secondary">{usersList.length}</Badge>
              </div>
              {usersList.map((user: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SystemStatus() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Activity className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Service health & configuration</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Convex Database</span>
            <Badge className="bg-green-500">Connected</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">OpenAI API</span>
            <Badge className="bg-green-500">Active</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">LangChain Agent</span>
            <Badge className="bg-green-500">Ready</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Model</span>
            <Badge variant="outline">GPT-4o-mini</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ApiDocumentation() {
  const endpoints = [
    {
      method: "POST",
      path: "/api/ai",
      description: "Process natural language commands"
    }
  ];

  const functions = [
    { name: "createUser", params: "name, email" },
    { name: "getUser", params: "email" },
    { name: "deleteUser", params: "email" },
    { name: "listUsers", params: "none" },
    { name: "updateUser", params: "email, name?, bio?, location?, website?" }
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Code2 className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <CardTitle>API Documentation</CardTitle>
            <CardDescription>Available endpoints & functions</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">REST Endpoint</h3>
          {endpoints.map((endpoint, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-blue-500">{endpoint.method}</Badge>
                <code className="text-sm font-mono text-gray-700">{endpoint.path}</code>
              </div>
              <p className="text-xs text-gray-600 mt-1">{endpoint.description}</p>
            </div>
          ))}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Database Functions</h3>
          <div className="space-y-2">
            {functions.map((func, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <code className="text-xs font-mono text-blue-600">{func.name}</code>
                <span className="text-xs text-gray-500">{func.params}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-gray-500 pt-2 border-t">
          <strong>Example Request:</strong>
          <pre className="mt-2 p-2 bg-gray-900 text-gray-100 rounded overflow-x-auto">
{`{
  "text": "Create a user named Alice with email alice@example.com"
}`}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DemoPage() {
  return (
    <ConvexClientProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
        <div className="container mx-auto p-4">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6 text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-lg">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Autonomous AI Backend Demo
              </h1>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Experience natural language database management powered by LangChain agents and Convex.
                Ask the AI to create, read, update, or delete users using plain English commands.
              </p>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="console" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
                <TabsTrigger value="console" className="flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  Console
                </TabsTrigger>
                <TabsTrigger value="dashboard" className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="docs" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  System
                </TabsTrigger>
              </TabsList>

              <TabsContent value="console" className="space-y-4">
                <div className="h-[75vh]">
                  <AIInterface />
                </div>
              </TabsContent>

              <TabsContent value="dashboard" className="space-y-4">
                <div className="h-[75vh]">
                  <UsersDashboard />
                </div>
              </TabsContent>

              <TabsContent value="docs" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SystemStatus />
                  <ApiDocumentation />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </ConvexClientProvider>
  );
}
