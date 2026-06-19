/* eslint-disable no-console */
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Vapi from "@vapi-ai/web";
import { useCartStore } from "@/store/cartStore";

type VapiInstance = any;

interface ConversationMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: number;
}

export default function VapiAssistant() {
    const vapiRef = useRef<VapiInstance | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [status, setStatus] = useState("Ready");
    const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
    const [lastResponse, setLastResponse] = useState<string>("");
    const router = useRouter();
    const { cart, setCart, cartId, setCartId } = useCartStore();

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
    // Cart Operations
    // -------------------------------
    const ensureCartExists = useCallback(async () => {
        if (cartId && cart) return cart;

        try {
            const res = await fetch("/api/cart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "create", currency: "EUR" }),
            });

            if (!res.ok) throw new Error("Failed to create cart");

            const newCart = await res.json();
            setCart(newCart);
            setCartId(newCart.id);
            return newCart;
        } catch (error) {
            console.error("Error creating cart:", error);
            return null;
        }
    }, [cartId, cart, setCart, setCartId]);

    const addToCart = useCallback(async (productName: string, quantity: number = 1) => {
        try {
            const currentCart = await ensureCartExists();
            if (!currentCart) {
                return { success: false, message: "Failed to access cart" };
            }

            // Fetch products to find matching product
            const productsRes = await fetch("/api/products");
            if (!productsRes.ok) {
                return { success: false, message: "Failed to fetch products" };
            }

            const products = await productsRes.json();
            
            // Find matching product (simple name matching)
            const matchedProduct = products.find((p: any) => 
                p.name?.['en-GB']?.toLowerCase().includes(productName.toLowerCase()) ||
                p.name?.['en-US']?.toLowerCase().includes(productName.toLowerCase()) ||
                p.slug?.['en-GB']?.toLowerCase().includes(productName.toLowerCase()) ||
                p.slug?.['en-US']?.toLowerCase().includes(productName.toLowerCase())
            );

            if (!matchedProduct) {
                return { success: false, message: `Could not find product: ${productName}` };
            }

            // Add to cart
            const addRes = await fetch("/api/cart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "add",
                    cartId: currentCart.id,
                    version: currentCart.version,
                    productId: matchedProduct.id,
                    quantity,
                }),
            });

            if (!addRes.ok) {
                return { success: false, message: "Failed to add item to cart" };
            }

            const updatedCart = await addRes.json();
            setCart(updatedCart);

            const productNameDisplay = matchedProduct.name?.['en-GB'] || matchedProduct.name?.['en-US'] || productName;
            return { 
                success: true, 
                message: `Added ${quantity} ${productNameDisplay}${quantity > 1 ? 's' : ''} to your cart` 
            };
        } catch (error) {
            console.error("Error adding to cart:", error);
            return { success: false, message: "Error adding item to cart" };
        }
    }, [ensureCartExists, setCart]);

    const removeFromCart = useCallback(async (productName: string) => {
        try {
            if (!cart || !cart.lineItems || cart.lineItems.length === 0) {
                return { success: false, message: "Your cart is empty" };
            }

            // Find matching line item
            const matchedItem = cart.lineItems.find((item: any) =>
                item.name?.toLowerCase().includes(productName.toLowerCase()) ||
                item.productId?.toLowerCase().includes(productName.toLowerCase())
            );

            if (!matchedItem) {
                return { success: false, message: `Could not find ${productName} in your cart` };
            }

            const removeRes = await fetch("/api/cart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "remove",
                    cartId: cart.id,
                    version: cart.version,
                    lineItemId: matchedItem.id,
                }),
            });

            if (!removeRes.ok) {
                return { success: false, message: "Failed to remove item from cart" };
            }

            const updatedCart = await removeRes.json();
            setCart(updatedCart);

            return { success: true, message: `Removed ${matchedItem.name} from your cart` };
        } catch (error) {
            console.error("Error removing from cart:", error);
            return { success: false, message: "Error removing item from cart" };
        }
    }, [cart, setCart]);

    const getCartContents = useCallback(async () => {
        try {
            if (!cart || !cart.lineItems || cart.lineItems.length === 0) {
                return { success: true, message: "Your cart is empty", items: [], total: 0 };
            }

            const itemCount = cart.lineItems?.reduce((sum: number, item: any) => sum + item.quantity, 0);
            const items = cart.lineItems.map((item: any) => `${item.quantity} ${item.name}`).join(", ");
            const total = cart.totalPrice?.centAmount ? (cart.totalPrice.centAmount / 100).toFixed(2) : "0.00";

            return { 
                success: true, 
                message: `You have ${itemCount} items in your cart: ${items}. Total: €${total}`,
                items: cart.lineItems,
                total
            };
        } catch (error) {
            console.error("Error getting cart contents:", error);
            return { success: false, message: "Error retrieving cart contents" };
        }
    }, [cart]);

    const clearCart = useCallback(async () => {
        try {
            if (!cart || !cart.lineItems || cart.lineItems.length === 0) {
                return { success: true, message: "Your cart is already empty" };
            }

            // Remove all items one by one
            let updatedCart = cart;
            for (const item of cart.lineItems) {
                const removeRes = await fetch("/api/cart", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "remove",
                        cartId: updatedCart.id,
                        version: updatedCart.version,
                        lineItemId: item.id,
                    }),
                });

                if (removeRes.ok) {
                    updatedCart = await removeRes.json();
                }
            }

            setCart(updatedCart);
            return { success: true, message: "Cleared all items from your cart" };
        } catch (error) {
            console.error("Error clearing cart:", error);
            return { success: false, message: "Error clearing cart" };
        }
    }, [cart, setCart]);

    // -------------------------------
    // Product Recommendations
    // -------------------------------
    const getRecommendedProducts = useCallback(async (category?: string) => {
        try {
            let url = "/api/products";
            if (category) {
                url = `/api/products?category=${encodeURIComponent(category)}`;
            }

            const res = await fetch(url);
            if (!res.ok) {
                return { success: false, message: "Failed to fetch recommendations" };
            }

            const products = await res.json();
            const topProducts = products.slice(0, 5);
            const productNames = topProducts.map((p: any) => p.name?.['en-GB'] || p.name?.['en-US'] || p.name).join(", ");

            return { 
                success: true, 
                message: `Here are some popular products: ${productNames}`,
                products: topProducts
            };
        } catch (error) {
            console.error("Error getting recommendations:", error);
            return { success: false, message: "Error fetching recommendations" };
        }
    }, []);

    // -------------------------------
    // Order Operations
    // -------------------------------
    const createOrder = useCallback(async () => {
        try {
            if (!cart || !cart.lineItems || cart.lineItems.length === 0) {
                return { success: false, message: "Your cart is empty. Add items before creating an order" };
            }

            const res = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "create",
                    cartId: cart.id,
                    cartVersion: cart.version,
                }),
            });

            if (!res.ok) {
                return { success: false, message: "Failed to create order" };
            }

            const order = await res.json();
            
            // Clear cart after successful order creation
            await clearCart();

            return { 
                success: true, 
                message: `Order created successfully! Order ID: ${order.id}`,
                orderId: order.id
            };
        } catch (error) {
            console.error("Error creating order:", error);
            return { success: false, message: "Error creating order" };
        }
    }, [cart, clearCart]);

    const getOrderStatus = useCallback(async (orderId: string) => {
        try {
            const res = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "get",
                    orderId,
                }),
            });

            if (!res.ok) {
                return { success: false, message: "Failed to fetch order status" };
            }

            const order = await res.json();
            const status = order.orderState || "Unknown";
            const total = order.totalPrice?.centAmount ? (order.totalPrice.centAmount / 100).toFixed(2) : "0.00";

            return { 
                success: true, 
                message: `Order ${orderId} status: ${status}. Total: €${total}`,
                order
            };
        } catch (error) {
            console.error("Error fetching order status:", error);
            return { success: false, message: "Error fetching order status" };
        }
    }, []);

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
                case "add_to_cart":
                    const productName = parameters?.product_name;
                    const qty = parameters?.quantity || 1;
                    if (!productName) {
                        result = { success: false, message: "Product name is required" };
                    } else {
                        result = await addToCart(productName, qty);
                    }
                    break;
                case "remove_from_cart":
                    const removeName = parameters?.product_name;
                    if (!removeName) {
                        result = { success: false, message: "Product name is required" };
                    } else {
                        result = await removeFromCart(removeName);
                    }
                    break;
                case "get_cart_contents":
                    result = await getCartContents();
                    break;
                case "clear_cart":
                    result = await clearCart();
                    break;
                case "get_recommendations":
                    const recCategory = parameters?.category;
                    result = await getRecommendedProducts(recCategory);
                    break;
                case "navigate_to_checkout":
                    result = { success: await navigateTo("/checkout"), message: "Navigated to checkout" };
                    break;
                case "create_order":
                    result = await createOrder();
                    break;
                case "get_order_status":
                    const orderId = parameters?.order_id;
                    if (!orderId) {
                        result = { success: false, message: "Order ID is required" };
                    } else {
                        result = await getOrderStatus(orderId);
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
    }, [navigateTo, addToCart, removeFromCart, getCartContents, clearCart, getRecommendedProducts, createOrder, getOrderStatus]);


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
                            content: `You are a helpful shopping assistant. Your job is to help users navigate an e-commerce website, manage their shopping cart, and track orders.

IMPORTANT: You MUST use the provided functions to help users. When a user asks to:
- Go to cart, view cart, or check their cart → use navigate_to_cart()
- Go home, go to homepage, or return to main page → use navigate_to_home()
- Go to checkout → use navigate_to_checkout()
- See products, browse items → use show_products()
- See category, browse items, or view a category → use show_category() with category parameter
- Search for something, find a product → use search_products() with the search query
- Add a product to cart → use add_to_cart() with product_name and optional quantity
- Remove a product from cart → use remove_from_cart() with product_name
- Get cart contents → use get_cart_contents()
- Clear cart → use clear_cart()
- Get recommendations → use get_recommendations() with optional category
- Create order from cart → use create_order()
- Check order status → use get_order_status() with order_id

Always use these functions when appropriate. After calling a function, confirm to the user what action was taken based on the result.

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
                                name: "navigate_to_checkout",
                                description: "Navigate to the checkout page",
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
                        {
                            type: "function",
                            function: {
                                name: "add_to_cart",
                                description: "Add a product to the shopping cart",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        product_name: {
                                            type: "string",
                                            description: "The name of the product to add to cart",
                                        },
                                        quantity: {
                                            type: "number",
                                            description: "The quantity to add (default: 1)",
                                        },
                                    },
                                    required: ["product_name"],
                                },
                            },
                        },
                        {
                            type: "function",
                            function: {
                                name: "remove_from_cart",
                                description: "Remove a product from the shopping cart",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        product_name: {
                                            type: "string",
                                            description: "The name of the product to remove from cart",
                                        },
                                    },
                                    required: ["product_name"],
                                },
                            },
                        },
                        {
                            type: "function",
                            function: {
                                name: "get_cart_contents",
                                description: "Get the current contents of the shopping cart",
                                parameters: {
                                    type: "object",
                                    properties: {},
                                },
                            },
                        },
                        {
                            type: "function",
                            function: {
                                name: "clear_cart",
                                description: "Clear all items from the shopping cart",
                                parameters: {
                                    type: "object",
                                    properties: {},
                                },
                            },
                        },
                        {
                            type: "function",
                            function: {
                                name: "get_recommendations",
                                description: "Get product recommendations, optionally filtered by category",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        category: {
                                            type: "string",
                                            description: "Optional category to filter recommendations",
                                        },
                                    },
                                },
                            },
                        },
                        {
                            type: "function",
                            function: {
                                name: "create_order",
                                description: "Create an order from the current cart contents",
                                parameters: {
                                    type: "object",
                                    properties: {},
                                },
                            },
                        },
                        {
                            type: "function",
                            function: {
                                name: "get_order_status",
                                description: "Get the status of a specific order by order ID",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        order_id: {
                                            type: "string",
                                            description: "The order ID to check status for",
                                        },
                                    },
                                    required: ["order_id"],
                                },
                            },
                        },
                    ],
                },
                voice: {
                    provider: "openai",
                    voiceId: "alloy",
                },
                firstMessage: "Hi! I'm your shopping assistant. How can I help you today? You can ask me to add products to your cart, show your cart, remove items, browse categories, search for products, or get recommendations.",
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

            // Track conversation
            if (msg.type === "conversation-item" && msg.conversationItem) {
                const item = msg.conversationItem;
                if (item.type === "message" && item.content) {
                    const role = item.role === "user" ? "user" : "assistant";
                    setConversationHistory(prev => [
                        ...prev.slice(-9), // Keep last 10 messages
                        { role, content: item.content, timestamp: Date.now() }
                    ]);
                    if (role === "assistant") {
                        setLastResponse(item.content);
                    }
                }
            }

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
        <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-50">
            {isListening && (
                <>
                    <div className="bg-white px-4 py-2 rounded-lg shadow-lg text-sm text-gray-700 border border-gray-200">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span>{status}</span>
                        </div>
                    </div>

                    {lastResponse && (
                        <div className="bg-white p-4 rounded-lg shadow-lg text-sm text-gray-700 border border-gray-200 max-w-md">
                            <div className="flex items-start gap-2">
                                <span className="text-lg">🤖</span>
                                <p className="flex-1">{lastResponse}</p>
                            </div>
                        </div>
                    )}

                    {conversationHistory.length > 0 && (
                        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-w-md max-h-64 overflow-y-auto">
                            <h4 className="text-xs font-semibold text-gray-500 mb-2">Conversation History</h4>
                            <div className="space-y-2">
                                {conversationHistory.map((msg, idx) => (
                                    <div key={idx} className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                        <span className="text-sm">{msg.role === 'user' ? '👤' : '🤖'}</span>
                                        <div className={`flex-1 p-2 rounded-lg text-sm ${
                                            msg.role === 'user' 
                                                ? 'bg-blue-50 text-blue-900' 
                                                : 'bg-gray-50 text-gray-900'
                                        }`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
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

            <div className="bg-gray-100 p-3 rounded-lg text-xs text-gray-600 max-w-xs">
                <div>
                    <strong>Status:</strong> {status}
                </div>
                <div>
                    <strong>Listening:</strong> {isListening ? "Yes" : "No"}
                </div>
                {cart && cart.lineItems && cart.lineItems.length > 0 && (
                    <div>
                        <strong>Cart Items:</strong> {cart.lineItems.length}
                    </div>
                )}
            </div>
        </div>
    );
}