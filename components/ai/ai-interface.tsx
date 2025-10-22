"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  AlertCircle, 
  Database,
  Terminal,
  Sparkles,
  Clock,
  RefreshCw
} from "lucide-react";
import { useConversation } from "./conversation-provider";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  reasoning?: Array<{
    action: string;
    input: Record<string, unknown>;
    observation: string;
  }>;
  error?: string;
}

interface AIInterfaceProps {
  className?: string;
}

export function AIInterface({ className }: AIInterfaceProps) {
  const { sessionId, resetSession } = useConversation();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "system",
      content: "👋 Welcome! I'm your AI assistant for managing users. Try asking me to:",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Example prompts
  const examplePrompts = [
    "Create a user named John Doe with email john@example.com",
    "List all users",
    "Find user with email alice@example.com",
    "Delete user bob@demo.com",
    "Update user sarah@test.com with new name Sarah Johnson"
  ];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const handleResetSession = () => {
    resetSession();
    setMessages([
      {
        id: "welcome",
        role: "system",
        content: "🔄 Started a new conversation. How can I help you?",
        timestamp: new Date(),
      },
    ]);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: input, sessionId }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.result,
          timestamp: new Date(),
          reasoning: data.reasoning,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "I encountered an error while processing your request.",
          error: data.error,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Failed to communicate with the AI service.",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleExampleClick = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <Card className="flex-1 flex flex-col shadow-xl border-2">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-2xl">AI Agent Console</CardTitle>
                <CardDescription className="text-gray-100">
                  Natural language database management powered by LangChain
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={handleResetSession}
              title="Start new conversation"
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 flex flex-col">
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="animate-in fade-in slide-in-from-bottom-2">
                  {message.role === "system" && (
                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-900">
                        {message.content}
                        <div className="mt-3 space-y-2">
                          <div className="text-sm text-blue-700 font-medium">Example commands:</div>
                          <div className="flex flex-wrap gap-2">
                            {examplePrompts.map((prompt, idx) => (
                              <Button
                                key={idx}
                                variant="outline"
                                size="sm"
                                className="text-xs hover:bg-blue-100 hover:text-blue-700 transition-colors"
                                onClick={() => handleExampleClick(prompt)}
                              >
                                {prompt}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {message.role === "user" && (
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">You</span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimestamp(message.timestamp)}
                          </span>
                        </div>
                        <div className="bg-gray-100 rounded-lg p-3">
                          <p className="text-gray-800">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {message.role === "assistant" && (
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">AI Assistant</span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimestamp(message.timestamp)}
                          </span>
                        </div>
                        
                        {message.error && (
                          <Alert className="bg-red-50 border-red-200">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-800">
                              <strong>Error:</strong> {message.error}
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="bg-white border rounded-lg p-3">
                          <p className="text-gray-800 whitespace-pre-wrap">{message.content}</p>
                        </div>

                        {message.reasoning && message.reasoning.length > 0 && (
                          <div className="mt-2">
                            <details className="group">
                              <summary className="cursor-pointer flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                                <Terminal className="h-3 w-3" />
                                <span>View reasoning steps ({message.reasoning.length})</span>
                              </summary>
                              <div className="mt-2 space-y-2 pl-5">
                                {message.reasoning.map((step, idx) => (
                                  <div key={idx} className="bg-gray-50 rounded-md p-2 text-xs">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Database className="h-3 w-3 text-blue-600" />
                                      <Badge variant="outline" className="text-xs">
                                        {step.action}
                                      </Badge>
                                    </div>
                                    <div className="text-gray-600 font-mono">
                                      Input: {JSON.stringify(step.input, null, 2)}
                                    </div>
                                    <div className="text-gray-800 mt-1">
                                      {step.observation}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3 animate-pulse">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-white border rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <Separator />

          {/* Input Area */}
          <div className="p-4 bg-gray-50">
            <div className="flex gap-2">
              <Input
                placeholder="Ask me to create, update, list, or delete users..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="flex-1 bg-white"
              />
              <Button 
                onClick={sendMessage} 
                disabled={!input.trim() || isLoading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Press Enter to send • Powered by OpenAI GPT-4o-mini & Convex
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
