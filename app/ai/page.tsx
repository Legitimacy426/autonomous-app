import { AIInterface } from "@/components/ai/ai-interface";
import ConvexClientProvider from "@/components/convex-client-provider";

export default function AIPage() {
  return (
    <ConvexClientProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto p-4">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6 text-center">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Autonomous AI Backend
              </h1>
              <p className="text-gray-600">
                Natural language database management with LangChain & Convex
              </p>
            </div>
            <div className="h-[80vh]">
              <AIInterface />
            </div>
          </div>
        </div>
      </div>
    </ConvexClientProvider>
  );
}
