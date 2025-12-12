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
    const navigateTo = useCallback(async (url: string) => {
        if (typeof window !== "undefined") {
            try {
                await router.push(url); // wait until navigation completes
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
    const handleFunctionCall = useCallback(async (toolCall: any) => {
        const functionName = toolCall?.function?.name || toolCall?.name;
        const parameters = toolCall?.function?.arguments || toolCall?.parameters || {};
        const toolCallId = toolCall?.toolCallId || toolCall?.id;

        let result: any = { success: false, message: "Unknown error" };

        try {
            switch (functionName) {
                case "navigate_to_cart":
                    result = { success: await navigateTo("/cart"), message: "Navigated to cart" };
                    break;
                case "navigate_to_home":
                    result = { success: await navigateTo("/"), message: "Navigated to home" };
                    break;
                case "show_products":
                    const productUrl = "/products";
                    result = { success: await navigateTo(productUrl), message:  "Showing all products" };
                    break;
                case "show_category":
                    const category = parameters?.category;
                    const categoryUrl = `/categories/${encodeURIComponent(category)}`
                    result = { success: await navigateTo(categoryUrl), message: category ? `Showing category: ${category}` : "Showing all categories"  };
                    break;
                case "search_products":
                    const query = parameters?.query;
                    if (!query) {
                        result = { success: false, message: "Search query is required" };
                    } else {
                        result = { success: await navigateTo(`/search?q=${encodeURIComponent(query)}`), message: `Searching for: ${query}` };
                    }
                    break;
                default:
                    result = { success: false, message: `Unknown function: ${functionName}` };
            }
        } catch (err) {
            console.error(err);
            result = { success: false, message: `Error: ${err}` };
        }

        // Send result back to Vapi
        if (vapiRef.current && toolCallId) {
            vapiRef.current.send({
                type: "tool-calls-result",
                toolCallId,
                result
            });
        }

        return result;
    }, [navigateTo]);


    // -------------------------------
    // Start / Stop Assistant
    // -------------------------------
    const startAssistant = useCallback(async () => {
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
                    messages: [
                        {
                            role: "system",
                            content: `You are a helpful shopping assistant. Your job is to help users navigate an e-commerce website.

IMPORTANT: You MUST use the provided functions to help users navigate. When a user asks to:
- Go to cart, view cart, or check their cart → use navigate_to_cart()
- Go home, go to homepage, or return to main page → use navigate_to_home()
- See products, browse items → use show_products()
- See category, browse items, or view a category → use show_category() with category parameter
- Search for something, find a product → use search_products() with the search query

Always use these functions when appropriate. After calling a function, confirm to the user what action was taken.

Be conversational and friendly. Ask clarifying questions if needed.`
                        }
                    ],
                    tools: [
                        {
                            type: "function",
                            function: {
                                name: "navigate_to_cart",
                                description: "Navigate to the shopping cart page",
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
                                description: "Navigate to the home page",
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
                                description: "Show products page",
                                parameters: {
                                    type: "object",
                                    properties: {},
                                },
                            },
                        },
                        {
                            type: "function",
                            function: {
                                name: "show_category",
                                description: "Show categories page, filtered by category",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        category: {
                                            type: "string",
                                            description: "Category name to filter products (e.g., 'electronics', 'clothing', 'books')",
                                        },
                                    },
                                },
                            },
                        },
                        {
                            type: "function",
                            function: {
                                name: "search_products",
                                description: "Search for specific products by keyword",
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
                firstMessage: "Hi! I'm your shopping assistant. How can I help you today? You can ask me to go to your cart,browse categories, browse products, or search for something specific.",
            });
            console.log("✅ Assistant started successfully");
            setStatus("Listening...");
        } catch (err) {
            console.error("❌ Failed to start assistant:", err);
            setStatus("Failed to start");
        }
    }, []);

    const stopAssistant = useCallback(async () => {
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
    }, []);

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

        // FIXED: Handle tool calls from message event
        vapi.on("message", (msg: any) => {
            console.log("📨 Vapi message:", msg);

            // Check if this message contains tool calls
            if (msg.type === "tool-calls" && msg.toolCalls) {
                console.log("🎯 Tool calls detected in message!");
                // Process each tool call
                msg.toolCalls.forEach((toolCall: any) => {
                    handleFunctionCall(toolCall);
                });
            }
        });

        vapi.on("status-update", (msg: any) => {
            if (msg.status === "ended" && msg.endedReason === "silence-timed-out") {
                console.log("⏱ Restarting assistant after silence timeout...");
                setTimeout(() => startAssistant(), 1000); // 1-second delay to avoid tight loop
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
    }, [handleFunctionCall, startAssistant, PUBLIC_KEY]);

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
                className={`px-6 py-3 rounded-full shadow-lg font-medium transition-all transform hover:scale-105 ${isListening
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