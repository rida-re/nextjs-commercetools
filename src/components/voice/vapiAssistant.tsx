/* eslint-disable no-console */
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Vapi from "@vapi-ai/web";

type VapiInstance = any;

export default function VapiAssistant() {
  const vapiRef = useRef<VapiInstance | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState("Ready");
  const router = useRouter();

  const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
  const ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

  // -------------------------------
  // Navigation Helper
  // -------------------------------
  const navigateTo = useCallback((url: string) => {
    if (typeof window !== "undefined") {
      try {
        router.push(url);
        console.log("✅ Navigation executed:", url);
        return true;
      } catch (err) {
        console.error("❌ Navigation failed:", err);
        return false;
      }
    }
    console.warn("⚠️ Navigation skipped - window is undefined");
    return false;
  }, [router]);

  // -------------------------------
  // Handle Tool Calls from Vapi
  // -------------------------------
  const handleFunctionCall = useCallback((toolCall: any) => {
    console.log("🛠️ Tool call received:", JSON.stringify(toolCall, null, 2));

    const functionName = toolCall?.function?.name || toolCall?.name;
    const parameters = toolCall?.function?.arguments || toolCall?.parameters || {};
    const toolCallId = toolCall?.toolCallId || toolCall?.id;

    console.log(`📞 Executing: ${functionName}`, parameters);

    let result: any = { success: false, message: "Unknown error" };
    let navigationSuccess = false;

    try {
      switch (functionName) {
        case "navigate_to_cart":
          navigationSuccess = navigateTo("/cart");
          result = { 
            success: navigationSuccess, 
            output: navigationSuccess 
              ? "Successfully navigated to cart page" 
              : "Failed to navigate to cart"
          };
          break;

        case "navigate_to_home":
          console.log("🏠 navigate_to_home triggered!");
          navigationSuccess = navigateTo("/");
          result = { 
            success: navigationSuccess, 
            output: navigationSuccess
              ? "Successfully navigated to home page" 
              : "Failed to navigate to home"
          };
          break;

        case "show_products":
          const category = parameters?.category;
          const productUrl = category
            ? `/products?category=${encodeURIComponent(category)}`
            : "/products";
          navigationSuccess = navigateTo(productUrl);
          result = { 
            success: navigationSuccess, 
            output: navigationSuccess
              ? (category 
                  ? `Showing products in category: ${category}` 
                  : "Showing all products")
              : "Failed to show products"
          };
          break;

        case "search_products":
          const query = parameters?.query;
          if (!query) {
            result = { 
              success: false, 
              output: "Search query is required" 
            };
          } else {
            navigationSuccess = navigateTo(`/search?q=${encodeURIComponent(query)}`);
            result = { 
              success: navigationSuccess, 
              output: navigationSuccess
                ? `Searching for: ${query}`
                : "Failed to search products"
            };
          }
          break;

        default:
          console.warn("⚠️ Unknown function:", functionName);
          result = { 
            success: false, 
            output: `Unknown function: ${functionName}` 
          };
      }
    } catch (error) {
      console.error("❌ Error executing function:", error);
      result = { 
        success: false, 
        output: `Error: ${error}` 
      };
    }

    console.log("📤 Sending result to Vapi:", result);

    // Send result back to Vapi
    if (vapiRef.current && toolCallId) {
      try {
        vapiRef.current.send({
          type: "tool-calls-result",
          toolCallId,
          result: result
        });
        console.log("✅ Result sent successfully");
      } catch (sendError) {
        console.error("❌ Failed to send result:", sendError);
      }
    } else {
      console.warn("⚠️ Cannot send result - Vapi not initialized or missing toolCallId");
    }

    return result;
  }, [navigateTo]);

  // -------------------------------
  // Initialize VAPI instance
  // -------------------------------
  useEffect(() => {
    if (!PUBLIC_KEY || PUBLIC_KEY === "YOUR_PUBLIC_KEY") {
      console.error("❌ Missing NEXT_PUBLIC_VAPI_PUBLIC_KEY");
      setStatus("Missing API Key");
      return;
    }

    console.log("🔧 Initializing Vapi...");
    let vapi: VapiInstance = new Vapi(PUBLIC_KEY);
    vapiRef.current = vapi;

    // Event listeners
    vapi.on("call-start", () => {
      console.log("📞 Call started");
      setIsListening(true);
      setStatus("Listening...");
    });

    vapi.on("call-end", () => {
      console.log("📞 Call ended");
      setIsListening(false);
      setStatus("Call ended");
    });

    vapi.on("speech-start", () => {
      console.log("🗣️ User speaking...");
      setStatus("User speaking...");
    });

    vapi.on("speech-end", () => {
      console.log("🤐 Speech ended");
      setStatus("Processing...");
    });

    vapi.on("error", (err: any) => {
      console.error("❌ Vapi error:", err);
      setStatus("Error occurred");
    });

    // Listen for tool calls
    vapi.on("tool-calls", handleFunctionCall);

    vapi.on("message", (msg: any) => {
      console.log("📨 Vapi message:", msg);
    });

    vapi.on("status-update", (msg: any) => {
        if(msg.status === "ended" && msg.endedReason === "silence-timed-out") {
            console.log("⏱ Restarting assistant after silence timeout...");
            startAssistant();
        }
    });

    console.log("✅ Vapi initialized");

    return () => {
      console.log("🧹 Cleaning up Vapi...");
      try {
        vapi.stop();
      } catch (e) {
        console.warn("Cleanup warning:", e);
      }
      vapiRef.current = null;
    };
  }, [handleFunctionCall, PUBLIC_KEY]);

  // -------------------------------
  // Start / Stop Assistant
  // -------------------------------
  const startAssistant = async () => {
    const vapi = vapiRef.current;
    if (!vapi) {
      console.error("❌ Vapi not initialized");
      return;
    }

    setStatus("Starting...");
    console.log("🚀 Starting assistant...");

    try {
      await vapi.start({
        model: {
          provider: "openai",
          model: "gpt-4o-mini",
          tools: [
            {
              type: "function",
              function: {
                name: "navigate_to_cart",
                description: "Navigate to the shopping cart page when user asks to go to cart, view cart, or check cart",
                parameters: {
                  type: "object",
                  properties: {},
                },
              },
            },
            {
              type: "function",
              function: {
                name: "navigate_to_home",
                description: "Navigate to the home page when user asks to go home, go to homepage, or return to main page",
                parameters: {
                  type: "object",
                  properties: {},
                },
              },
            },
            {
              type: "function",
              function: {
                name: "show_products",
                description: "Show products page, optionally filtered by category when user asks to see products, browse items, or view specific category",
                parameters: {
                  type: "object",
                  properties: {
                    category: {
                      type: "string",
                      description: "Optional category name to filter products (e.g., 'electronics', 'clothing', 'books')",
                    },
                  },
                },
              },
            },
            {
              type: "function",
              function: {
                name: "search_products",
                description: "Search for specific products by keyword when user asks to find or search for something",
                parameters: {
                  type: "object",
                  properties: {
                    query: {
                      type: "string",
                      description: "The search term or keywords to find products",
                    },
                  },
                  required: ["query"],
                },
              },
            },
          ],
        },
        voice: {
          provider: "openai",
          voiceId: "alloy",
        },
        firstMessage: "Hello! I'm your shopping assistant. You can ask me to go home, go to cart, show products, or search for products. Use the tool functions provided to navigate.",
      });
      console.log("✅ Assistant started successfully");
      setStatus("Listening...");
    } catch (err) {
      console.error("❌ Failed to start assistant:", err);
      setStatus("Failed to start");
    }
  };

  const stopAssistant = async () => {
    const vapi = vapiRef.current;
    if (!vapi) return;

    setStatus("Stopping...");
    console.log("🛑 Stopping assistant...");

    try {
      await vapi.stop();
      console.log("✅ Assistant stopped");
      setStatus("Stopped");
    } catch (err) {
      console.error("❌ Error stopping assistant:", err);
    }
  };

  const toggleAssistant = () => {
    if (isListening) {
      stopAssistant();
    } else {
      startAssistant();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 flex flex-col items-end gap-2 z-50">
      {isListening && (
        <div className="bg-white px-4 py-2 rounded-lg shadow-lg text-sm text-gray-700 border border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>{status}</span>
          </div>
        </div>
      )}

      <button
        onClick={toggleAssistant}
        className={`px-6 py-3 rounded-full shadow-lg font-medium transition-all transform hover:scale-105 ${
          isListening
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-black hover:bg-gray-800 text-white"
        }`}
      >
        {isListening ? "🔴 Stop Assistant" : "🎤 Talk to Assistant"}
      </button>

      <div className="mt-4 bg-gray-100 p-3 rounded-lg text-xs text-gray-600 max-w-xs">
        <div>
          <strong>Status:</strong> {status}
        </div>
        <div>
          <strong>Listening:</strong> {isListening ? "Yes" : "No"}
        </div>
        <div>
          <strong>Mode:</strong> {ASSISTANT_ID ? "Assistant ID" : "Inline"}
        </div>
      </div>
    </div>
  );
}