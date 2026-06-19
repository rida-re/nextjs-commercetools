"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { ProductProjection } from "@commercetools/platform-sdk";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { parseCommand } from "@/utils/voiceCommandParser";
import { findBestMatch } from "@/utils/fuzzyMatcher";

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export default function VoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCommand, setLastCommand] = useState<string>("");
  const [lastResponse, setLastResponse] = useState<string>("");
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [language, setLanguage] = useState<string>('en');
  
  const { cart, setCart } = useCartStore();
  const router = useRouter();
  const handleCommandRef = useRef<(command: string) => Promise<void>>();

  const { speak, stop: stopSpeaking, isPlaying } = useTextToSpeech({
    onSpeakStart: () => {},
    onSpeakEnd: () => {},
    onError: setError,
  });

  // Add message to conversation history
  const addToHistory = useCallback((role: "user" | "assistant", content: string) => {
    setConversationHistory(prev => [
      ...prev.slice(-10), // Keep last 10 messages
      { role, content, timestamp: Date.now() }
    ]);
    if (role === "assistant") {
      setLastResponse(content);
    }
  }, []);

  // Fetch available products from API
  const fetchProducts = useCallback(async (): Promise<ProductProjection[]> => {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      const products = await res.json();
      return products;
    } catch (err) {
      console.error("Product fetch error:", err);
      return [];
    }
  }, []);

  // Order operations
  const createOrder = useCallback(async () => {
    try {
      if (!cart || !cart.lineItems || cart.lineItems.length === 0) {
        const errorMsg = "Your cart is empty. Add items before creating an order";
        addToHistory("assistant", errorMsg);
        if (!isMuted) await speak(errorMsg);
        return;
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
        const errorMsg = "Failed to create order";
        addToHistory("assistant", errorMsg);
        if (!isMuted) await speak(errorMsg);
        return;
      }

      const order = await res.json();
      
      // Clear cart after successful order creation
      const clearRes = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove",
          cartId: cart.id,
          version: cart.version,
          lineItemId: cart.lineItems[0].id,
        }),
      });

      const successMsg = `Order created successfully! Order ID: ${order.id}`;
      addToHistory("assistant", successMsg);
      if (!isMuted) await speak(successMsg);
    } catch (error) {
      console.error("Error creating order:", error);
      const errorMsg = "Error creating order";
      addToHistory("assistant", errorMsg);
      if (!isMuted) await speak(errorMsg);
    }
  }, [cart, isMuted, addToHistory, speak]);

  const checkOrderStatus = useCallback(async (orderId?: string) => {
    try {
      if (!orderId) {
        const errorMsg = "Please provide an order ID to check status";
        addToHistory("assistant", errorMsg);
        if (!isMuted) await speak(errorMsg);
        return;
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get",
          orderId,
        }),
      });

      if (!res.ok) {
        const errorMsg = "Failed to fetch order status";
        addToHistory("assistant", errorMsg);
        if (!isMuted) await speak(errorMsg);
        return;
      }

      const order = await res.json();
      const status = order.orderState || "Unknown";
      const total = order.totalPrice?.centAmount ? (order.totalPrice.centAmount / 100).toFixed(2) : "0.00";

      const statusMsg = `Order ${orderId} status: ${status}. Total: €${total}`;
      addToHistory("assistant", statusMsg);
      if (!isMuted) await speak(statusMsg);
    } catch (error) {
      console.error("Error checking order status:", error);
      const errorMsg = "Error checking order status";
      addToHistory("assistant", errorMsg);
      if (!isMuted) await speak(errorMsg);
    }
  }, [isMuted, addToHistory, speak]);

  const clearCart = useCallback(async () => {
    try {
      if (!cart || !cart.lineItems || cart.lineItems.length === 0) {
        const errorMsg = "Your cart is already empty";
        addToHistory("assistant", errorMsg);
        if (!isMuted) await speak(errorMsg);
        return;
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
      const successMsg = "Cleared all items from your cart";
      addToHistory("assistant", successMsg);
      if (!isMuted) await speak(successMsg);
    } catch (error) {
      console.error("Error clearing cart:", error);
      const errorMsg = "Error clearing cart";
      addToHistory("assistant", errorMsg);
      if (!isMuted) await speak(errorMsg);
    }
  }, [cart, setCart, isMuted, addToHistory, speak]);

  // Main command handler
  const handleCommand = useCallback(async (command: string) => {
    try {
      setLastCommand(command);
      addToHistory("user", command);

      const { intent, product, quantity } = parseCommand(command, language);
      
      switch (intent) {
        case "add_to_cart": {
          if (!product) {
            await speak("What product would you like to add to your cart?");
            return;
          }

          const products : ProductProjection[] = await fetchProducts();
          const productNames = products.map(p => p.name?.['en-GB'] || p.name?.['en-US'] || '').filter(Boolean);
          const matchedName = findBestMatch(product, productNames, 0.5);
          
          if (!matchedName) {
            await speak(`I couldn't find ${product}. Would you like me to show you available products?`);
            return;
          }

          const matchedProduct = products.find(p => p.name?.['en-GB'] === matchedName);
          if (!matchedProduct || !cart) {
            await speak("Sorry, I encountered an error. Please try again.");
            return;
          }

          const res = await fetch("/api/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "add",
              cartId: cart.id,
              version: cart.version,
              productId: matchedProduct.id,
              quantity,
            }),
          });
          
          if (!res.ok) {
            await speak("I couldn't add that item. Please check your cart.");
            return;
          }
          
          const updatedCart = await res.json();
          setCart(updatedCart);
          
          const confirmMsg = quantity > 1
            ? `Added ${quantity} ${matchedName}s to your cart`
            : `Added ${matchedName} to your cart`;
          addToHistory("assistant", confirmMsg);
          if (!isMuted) await speak(confirmMsg);
          break;
        }

        case "remove_from_cart": {
          if (!cart || cart.lineItems.length === 0) {
            if (!isMuted) await speak("Your cart is empty");
            return;
          }

          if (!product) {
            const items = cart.lineItems.map((item: any) => item.name).join(", ");
            if (!isMuted) await speak(`Your cart contains: ${items}. Which item would you like to remove?`);
            return;
          }

          const cartItemNames = cart.lineItems.map((item: any) => item.name);
          const matchedName = findBestMatch(product, cartItemNames, 0.5);
          
          if (!matchedName) {
            if (!isMuted) await speak(`I couldn't find ${product} in your cart`);
            return;
          }

          const lineItem = cart.lineItems.find((item: any) => item.name === matchedName);
          if (!lineItem) {
            if (!isMuted) await speak("Sorry, something went wrong");
            return;
          }

          const res = await fetch("/api/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "remove",
              cartId: cart.id,
              version: cart.version,
              lineItemId: lineItem.id,
            }),
          });
          
          if (!res.ok) {
            if (!isMuted) await speak("I couldn't remove that item");
            return;
          }
          
          const updatedCart = await res.json();
          setCart(updatedCart);
          const removeMsg = `Removed ${matchedName} from your cart`;
          addToHistory("assistant", removeMsg);
          if (!isMuted) await speak(removeMsg);
          break;
        }

        case "view_cart": {
          if (!cart || cart.lineItems.length === 0) {
            if (!isMuted) await speak("Your cart is currently empty");
            return;
          }

          const itemCount = cart.lineItems?.reduce((sum: number, item: any) => sum + item.quantity, 0);
          const items = cart.lineItems
            .map((item: any) => `${item.quantity} ${item.name}`)
            .join(", ");
          
          const cartMsg = `You have ${itemCount} items in your cart: ${items}`;
          addToHistory("assistant", cartMsg);
          if (!isMuted) await speak(cartMsg);
          router.push("/cart");
          break;
        }

        case "checkout": {
          if (!cart || cart.lineItems.length === 0) {
            if (!isMuted) await speak("Your cart is empty. Add some products before checking out");
            return;
          }
          
          const checkoutMsg = "Taking you to checkout";
          addToHistory("assistant", checkoutMsg);
          if (!isMuted) await speak(checkoutMsg);
          router.push("/checkout");
          break;
        }

        case "search_products":
        case "navigate_products": {
          const productsMsg = "Here are our products. You can ask me to add any of them to your cart";
          addToHistory("assistant", productsMsg);
          if (!isMuted) await speak(productsMsg);
          router.push("/products");
          break;
        }

        case "navigate_home": {
          const homeMsg = "Taking you to the home page";
          addToHistory("assistant", homeMsg);
          if (!isMuted) await speak(homeMsg);
          router.push("/");
          break;
        }

        case "clear_cart": {
          await clearCart();
          break;
        }

        case "help": {
          const helpMsg = "I can help you shop! Try saying: add product to cart, show my cart, remove item from cart, go to checkout, or show me products";
          addToHistory("assistant", helpMsg);
          if (!isMuted) await speak(helpMsg);
          break;
        }

        case "repeat": {
          if (conversationHistory.length > 0) {
            const lastAssistantMsg = [...conversationHistory]
              .reverse()
              .find(msg => msg.role === "assistant");
            if (lastAssistantMsg && !isMuted) {
              addToHistory("assistant", lastAssistantMsg.content);
              await speak(lastAssistantMsg.content);
            }
          }
          break;
        }

        case "cancel": {
          const cancelMsg = "Okay, cancelled";
          addToHistory("assistant", cancelMsg);
          if (!isMuted) await speak(cancelMsg);
          break;
        }

        case "create_order": {
          await createOrder();
          break;
        }

        case "check_order_status": {
          // Extract order ID from command (simple pattern matching)
          const orderIdMatch = command.match(/order\s+([a-zA-Z0-9-]+)/i);
          const orderId = orderIdMatch ? orderIdMatch[1] : undefined;
          await checkOrderStatus(orderId);
          break;
        }

        default: {
          const unknownMsg = "I'm not sure what you mean. Try saying: add product, show cart, or say help for more options";
          addToHistory("assistant", unknownMsg);
          if (!isMuted) await speak(unknownMsg);
          break;
        }
      }
    } catch (err) {
      console.error("Command error:", err);
      setError("Command processing failed");
      if (!isMuted) await speak("Sorry, something went wrong. Please try again");
    }
  }, [isMuted, cart, router, fetchProducts, addToHistory, speak, createOrder, checkOrderStatus, clearCart, language]);

  // Update ref whenever handleCommand changes
  handleCommandRef.current = handleCommand;

  const { startListening: startSpeechRecognition, stopListening: stopSpeechRecognition } = useSpeechRecognition({
    onResult: (command: string) => handleCommandRef.current?.(command),
    onError: setError,
    onSpeechStart: () => {},
    onSpeechEnd: () => {},
    silenceTimeout: 1500,
    language: language === 'de' ? 'de-DE' : language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-US',
  });

  const startListening = useCallback(() => {
    startSpeechRecognition();
    setIsListening(true);
  }, [startSpeechRecognition]);

  const stopListening = useCallback(() => {
    stopSpeechRecognition();
    setIsListening(false);
  }, [stopSpeechRecognition]);

  const startConversation = useCallback(async () => {
    const greeting = "Hello! I'm your shopping assistant. How can I help you today?";
    addToHistory("assistant", greeting);
    if (!isMuted) await speak(greeting);
    startListening();
    setIsListening(true);
  }, [isMuted, speak, startListening, addToHistory]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    if (isPlaying && !isMuted) {
      stopSpeaking();
    }
  }, [isPlaying, isMuted, stopSpeaking]);

  return (
    <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-50">
      {isListening && (
        <>
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

      {!isListening ? (
        <button
          onClick={startConversation}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 rounded-full shadow-2xl transition-all transform hover:scale-105 flex items-center gap-3 font-medium"
        >
          <span className="text-2xl">🎤</span>
          <span>Start Voice Shopping</span>
        </button>
      ) : (
        <div className="bg-white shadow-2xl rounded-2xl p-5 w-80 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-blue-500' : 'bg-red-500'} animate-pulse`}></div>
              <span className="text-sm font-semibold text-gray-700">
                {isPlaying ? "🔊 Speaking..." : isMuted ? "🔇 Listening (Muted)" : "🎤 Listening..."}
              </span>
            </div>
          </div>
          
          {lastCommand && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Last command:</p>
              <p className="text-sm text-gray-800 font-medium">"{lastCommand}"</p>
            </div>
          )}
          
          <div className="flex gap-2 mb-3">
            <button
              onClick={toggleMute}
              className="flex-1 border-2 border-gray-200 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"
            >
              {isMuted ? "🔊 Unmute" : "🔇 Mute"}
            </button>
            <button
              onClick={stopListening}
              className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition-all text-sm font-medium"
            >
              ⏹ Stop
            </button>
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-xs font-medium">{error}</p>
            </div>
          )}
          
          {cart && cart.lineItems && cart.lineItems.length > 0 && (
            <div className="mt-3 p-2 bg-blue-50 rounded-lg text-xs text-blue-900">
              🛒 {cart.lineItems.length} items in cart
            </div>
          )}
          
          <div className="mt-3">
            <label className="text-xs text-gray-500 mb-1 block">Language:</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded px-2 py-1"
            >
              <option value="en">English</option>
              <option value="de">Deutsch</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
            </select>
          </div>
          
          <div className="text-xs text-gray-500 text-center mt-3">
            Try: "Add headphones to cart" or "Show my cart"
          </div>
        </div>
      )}
    </div>
  );
}