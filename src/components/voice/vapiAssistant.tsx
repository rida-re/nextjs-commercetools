"use client";

import { useEffect, useRef, useState, useCallback, startTransition } from "react";
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
    console.log("🚀 Attempting to navigate to:", url);

    try {
      // Next.js router avec startTransition pour contexte React sécurisé
      startTransition(() => {
        router.push(url);
      });
      return true;
    } catch (err) {
      console.warn("Next.js router failed:", err);
    }

    // fallback avec window.location.href
    try {
      if (typeof window !== "undefined") {
        console.log("Using window.location.href as fallback");
        window.location.href = url;
        return true;
      }
    } catch (err) {
      console.error("Navigation failed:", err);
      return false;
    }
  }, [router]);

  // -------------------------------
  // Handle function calls
  // -------------------------------
  const handleFunctionCall = useCallback(async (functionCall: any) => {
    console.log("🔔 [vapi] function-call received:", functionCall);

    const functionName = functionCall?.functionCall?.name || functionCall?.name;
    const parameters = functionCall?.functionCall?.parameters || functionCall?.parameters || {};
    const functionCallId = functionCall?.functionCall?.id || functionCall?.id;

    console.log(`📞 Function: ${functionName}`, parameters);
    setStatus(`Executing: ${functionName}`);

    let result = { success: false, message: "" };

    try {
      switch (functionName) {
        case "navigate_to_cart":
          console.log("🛒 Navigating to cart");
          result = { success: true, message: "Taking you to your shopping cart" };
          navigateTo("/cart");
          break;

        case "navigate_to_home":
          console.log("🏠 Navigating to home");
          result = { success: true, message: "Going to the home page" };
          navigateTo("/");
          break;

        case "show_products":
          const category = parameters?.category;
          console.log("📦 Showing products, category:", category);
          const productUrl = category
            ? `/products?category=${encodeURIComponent(category)}`
            : "/products";
          result = {
            success: true,
            message: category ? `Showing ${category} products` : "Showing all products",
          };
          navigateTo(productUrl);
          break;

        case "search_products":
          const query = parameters?.query;
          console.log("🔍 Searching for:", query);
          const searchUrl = `/search?q=${encodeURIComponent(query)}`;
          result = { success: true, message: `Searching for "${query}"` };
          navigateTo(searchUrl);
          break;

        case "add_to_cart":
          const { productId, quantity = 1 } = parameters;
          console.log("➕ Adding to cart:", productId, quantity);
          try {
            const res = await fetch("/api/cart/add", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ productId, quantity }),
            });
            const data = await res.json();
            result = {
              success: data.success,
              message: data.success
                ? `Added ${quantity} item(s) to your cart`
                : "Failed to add item to cart",
            };
          } catch (err) {
            console.error("Cart API error:", err);
            result = { success: false, message: "Failed to add item to cart" };
          }
          break;

        default:
          console.warn("⚠️ Unknown function:", functionName);
          result = { success: false, message: "Unknown command" };
      }

      // Send result back to Vapi
      if (vapiRef.current?.send && functionCallId) {
        vapiRef.current.send({
          type: "function-call",
          functionCallId,
          result,
        });
      }

      setStatus(result.message);
    } catch (err) {
      console.error("❌ Command Error:", err);
      result = { success: false, message: `Error: ${err}` };
      if (vapiRef.current?.send && functionCallId) {
        vapiRef.current.send({
          type: "function-call",
          functionCallId,
          result,
        });
      }
      setStatus("Error");
    }
  }, [navigateTo]);

  // -------------------------------
  // Initialize VAPI instance
  // -------------------------------
  useEffect(() => {
    if (!PUBLIC_KEY || PUBLIC_KEY === "YOUR_PUBLIC_KEY") {
      console.error("❌ Missing NEXT_PUBLIC_VAPI_PUBLIC_KEY");
      return;
    }

    let vapi: VapiInstance;
    try {
      vapi = new Vapi(PUBLIC_KEY);
    } catch {
      vapi = new Vapi({ apiKey: PUBLIC_KEY });
    }

    vapiRef.current = vapi;

    vapi.on?.("call-start", () => { setIsListening(true); setStatus("Listening..."); });
    vapi.on?.("call-end", () => { setIsListening(false); setStatus("Call ended"); });
    vapi.on?.("speech-start", () => { setStatus("User speaking..."); });
    vapi.on?.("speech-end", () => { setStatus("Processing..."); });
    vapi.on?.("error", (err) => { console.error(err); setStatus("Error occurred"); });

    vapi.on?.("function-call", handleFunctionCall);
    vapi.on?.("message", (msg) => { console.log("📨 [vapi] message received", msg); });

    return () => {
      try { vapi.destroy?.(); } catch (e) { console.warn(e); }
      vapiRef.current = null;
    };
  }, [handleFunctionCall, PUBLIC_KEY]);

  // -------------------------------
  // Start / Stop Assistant
  // -------------------------------
  const startAssistant = async () => {
    const vapi = vapiRef.current;
    if (!vapi) { console.error("❌ Vapi not initialized"); return; }
    setStatus("Starting...");

    try {
      await vapi.start?.({
        model: { 
          provider: "openai", 
          model: "gpt-4o-mini",
          functions: [
            { name: "navigate_to_cart", description: "Go to cart", parameters: { type: "object", properties: {} } },
            { name: "navigate_to_home", description: "Go home", parameters: { type: "object", properties: {} } },
            { name: "show_products", description: "Show products", parameters: { type: "object", properties: { category: { type: "string" } } } },
            { name: "search_products", description: "Search products", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } }
          ]
        },
        voice: { provider: "openai", voiceId: "alloy" },
        firstMessage: "Hello! I can help you navigate the store. Try saying 'go to cart', 'show products', or 'go home'."
      });
      console.log("✅ Assistant started successfully");
    } catch (err) {
      console.error("❌ vapi.start failed", err);
      setStatus("Failed to start");
    }
  };

  const stopAssistant = async () => {
    const vapi = vapiRef.current;
    if (!vapi) return;
    setStatus("Stopping...");
    try { await vapi.stop?.(); console.log("✅ Assistant stopped"); } catch (err) { console.error(err); }
  };

  const toggleAssistant = () => { isListening ? stopAssistant() : startAssistant(); };

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
          isListening ? "bg-red-500 hover:bg-red-600 text-white" : "bg-black hover:bg-gray-800 text-white"
        }`}
      >
        {isListening ? "🔴 Stop Assistant" : "🎤 Talk to Assistant"}
      </button>

      <div className="mt-4 bg-gray-100 p-3 rounded-lg text-xs text-gray-600 max-w-xs">
        <div><strong>Status:</strong> {status}</div>
        <div><strong>Listening:</strong> {isListening ? "Yes" : "No"}</div>
        <div><strong>Assistant ID:</strong> {ASSISTANT_ID || "Inline"}</div>
      </div>
    </div>
  );
}
