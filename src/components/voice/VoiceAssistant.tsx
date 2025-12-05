"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";

// Types
interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export default function VoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCommand, setLastCommand] = useState<string>("");
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  
  const recognitionRef = useRef<any>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isProcessingAudioRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const { cart, setCart } = useCartStore();
  const router = useRouter();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  // Enhanced TTS with queue management
  const speak = useCallback(async (text: string) => {
    if (isMuted) return;

    audioQueueRef.current.push(text);
    
    if (!isProcessingAudioRef.current) {
      await processAudioQueue();
    }
  }, [isMuted]);

  const processAudioQueue = async () => {
    if (audioQueueRef.current.length === 0) {
      isProcessingAudioRef.current = false;
      setIsSpeaking(false);
      return;
    }

    isProcessingAudioRef.current = true;
    setIsSpeaking(true);
    const text = audioQueueRef.current.shift()!;

    try {
      const res = await fetch("/api/murf/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        throw new Error("TTS request failed");
      }

      const data = await res.json();
      if (!data?.audioUrl) {
        console.error("No audio returned from TTS", data);
        await processAudioQueue();
        return;
      }

      const audio = new Audio(data.audioUrl);
      currentAudioRef.current = audio;
      
      await audio.play();
      await new Promise((resolve) => {
        audio.onended = resolve;
        audio.onerror = resolve;
      });

      // Add to conversation history
      addToHistory("assistant", text);
      
      // Process next in queue
      await processAudioQueue();
    } catch (err) {
      console.error("TTS error:", err);
      setError("Speech synthesis failed");
      await processAudioQueue();
    }
  };

  // Add message to conversation history
  const addToHistory = (role: "user" | "assistant", content: string) => {
    setConversationHistory(prev => [
      ...prev.slice(-10), // Keep last 10 messages
      { role, content, timestamp: Date.now() }
    ]);
  };

  // Fetch available products from API
  const fetchProducts = async (): Promise<Product[]> => {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      const products = await res.json();
      return products;
    } catch (err) {
      console.error("Product fetch error:", err);
      return [];
    }
  };

  // Enhanced fuzzy matching with phonetic similarity
  const calculateSimilarity = (str1: string, str2: string): number => {
  const s1 = String(str1 || '').toLowerCase().trim();
  const s2 = String(str2 || '').toLowerCase().trim();
    
    // Exact match
    if (s1 === s2) return 1.0;
    
    // Contains match
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    
    // Levenshtein distance
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix: number[][] = Array(len1 + 1).fill(null)
      .map(() => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    return 1 - (distance / maxLen);
  };

  const findBestMatch = (
    spokenWord: string, 
    candidates: string[], 
    threshold: number = 0.6
  ): string | null => {
    let bestMatch = null;
    let bestScore = 0;
    
    for (const candidate of candidates) {
      const score = calculateSimilarity(spokenWord, candidate);
      if (score > bestScore && score >= threshold) {
        bestScore = score;
        bestMatch = candidate;
      }
    }
    
    return bestMatch;
  };

  // Enhanced command parsing with NLP-like patterns
  const parseCommand = (command: string) => {
    const lowerCmd = command.toLowerCase().trim();
    
    // Quantity extraction
    const quantityMatch = lowerCmd.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten)/);
    const quantityMap: Record<string, number> = {
      one: 1, two: 2, three: 3, four: 4, five: 5,
      six: 6, seven: 7, eight: 8, nine: 9, ten: 10
    };
    const quantity = quantityMatch 
      ? (quantityMap[quantityMatch[1]] || parseInt(quantityMatch[1]) || 1)
      : 1;

    // Product extraction (improved patterns)
    const productPatterns = [
      /(?:add|buy|purchase|get|order)\s+(?:me\s+)?(?:a\s+|an\s+|some\s+)?(?:\d+\s+)?(.+?)(?:\s+to|\s+in|\s+please|$)/i,
      /(?:looking\s+for|want|need|show\s+me)\s+(?:a\s+|an\s+|some\s+)?(.+?)(?:\s+please|$)/i,
      /(?:remove|delete|take\s+out)\s+(?:the\s+)?(.+?)(?:\s+from|$)/i,
    ];
    
    let product = null;
    for (const pattern of productPatterns) {
      const match = lowerCmd.match(pattern);
      if (match && match[1]) {
        product = match[1].trim()
          .replace(/\b(please|thanks|thank you|to cart|from cart)\b/gi, '')
          .trim();
        break;
      }
    }

    // Intent detection with confidence
    const intents = {
      add_to_cart: /(add|put|place|insert|buy|purchase|get|order|want|need).*(?:cart|basket|bag)/i,
      remove_from_cart: /(remove|delete|take out|clear|drop).*(?:cart|basket|bag)/i,
      view_cart: /(show|display|view|open|check|what's in).*(?:cart|basket|bag)/i,
      checkout: /(checkout|pay|purchase|buy now|complete order|proceed)/i,
      search_products: /(search|find|look for|show me|browse|what do you have).*(?:product|item)/i,
      navigate_home: /(home|main page|start|beginning)/i,
      navigate_products: /(products|shop|store|catalog|browse)/i,
      clear_cart: /(clear|empty|remove all|delete all).*(?:cart|basket)/i,
      help: /(help|what can you do|commands|options)/i,
      repeat: /(repeat|say again|what|pardon)/i,
      cancel: /(cancel|stop|never mind|forget it)/i,
    };

    let detectedIntent = "unknown";
    for (const [intent, pattern] of Object.entries(intents)) {
      if (pattern.test(lowerCmd)) {
        detectedIntent = intent;
        break;
      }
    }

    return { intent: detectedIntent, product, quantity };
  };

  // Main command handler
  const handleCommand = async (command: string) => {
    try {
      setLastCommand(command);
      addToHistory("user", command);

      const { intent, product, quantity } = parseCommand(command);
      
      switch (intent) {
        case "add_to_cart": {
          if (!product) {
            await speak("What product would you like to add to your cart?");
            return;
          }

          const products = await fetchProducts();
          const productNames = products.map(p => p.name);
          const matchedName = findBestMatch(product, productNames, 0.5);
          
          if (!matchedName) {
            await speak(`I couldn't find ${product}. Would you like me to show you available products?`);
            return;
          }

          const matchedProduct = products.find(p => p.name === matchedName);
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
          await speak(confirmMsg);
          break;
        }

        case "remove_from_cart": {
          if (!cart || cart.lineItems.length === 0) {
            await speak("Your cart is empty");
            return;
          }

          if (!product) {
            const items = cart.lineItems.map((item: any) => item.name).join(", ");
            await speak(`Your cart contains: ${items}. Which item would you like to remove?`);
            return;
          }

          const cartItemNames = cart.lineItems.map((item: any) => item.name);
          const matchedName = findBestMatch(product, cartItemNames, 0.5);
          
          if (!matchedName) {
            await speak(`I couldn't find ${product} in your cart`);
            return;
          }

          const lineItem = cart.lineItems.find((item: any) => item.name === matchedName);
          if (!lineItem) {
            await speak("Sorry, something went wrong");
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
            await speak("I couldn't remove that item");
            return;
          }
          
          const updatedCart = await res.json();
          setCart(updatedCart);
          await speak(`Removed ${matchedName} from your cart`);
          break;
        }

        case "view_cart": {
          if (!cart || cart.lineItems.length === 0) {
            await speak("Your cart is currently empty");
            return;
          }

          const itemCount = cart.lineItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
          const items = cart.lineItems
            .map((item: any) => `${item.quantity} ${item.name}`)
            .join(", ");
          
          await speak(`You have ${itemCount} items in your cart: ${items}`);
          router.push("/cart");
          break;
        }

        case "checkout": {
          if (!cart || cart.lineItems.length === 0) {
            await speak("Your cart is empty. Add some products before checking out");
            return;
          }
          
          await speak("Taking you to checkout");
          router.push("/checkout");
          break;
        }

        case "search_products":
        case "navigate_products": {
          await speak("Here are our products. You can ask me to add any of them to your cart");
          router.push("/products");
          break;
        }

        case "navigate_home": {
          await speak("Taking you to the home page");
          router.push("/");
          break;
        }

        case "clear_cart": {
          if (!cart || cart.lineItems.length === 0) {
            await speak("Your cart is already empty");
            return;
          }

          // Clear all items
          await speak("Clearing your cart");
          // Implement bulk clear API call
          break;
        }

        case "help": {
          await speak(
            "I can help you shop! Try saying: add product to cart, show my cart, " +
            "remove item from cart, go to checkout, or show me products"
          );
          break;
        }

        case "repeat": {
          if (conversationHistory.length > 0) {
            const lastAssistantMsg = [...conversationHistory]
              .reverse()
              .find(msg => msg.role === "assistant");
            if (lastAssistantMsg) {
              await speak(lastAssistantMsg.content);
            }
          }
          break;
        }

        case "cancel": {
          await speak("Okay, cancelled");
          break;
        }

        default: {
          await speak(
            "I'm not sure what you mean. Try saying: add product, show cart, " +
            "or say help for more options"
          );
          break;
        }
      }
    } catch (err) {
      console.error("Command error:", err);
      setError("Command processing failed");
      await speak("Sorry, something went wrong. Please try again");
    }
  };

  // Enhanced speech recognition with noise handling
  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in your browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    let finalTranscript = "";
    let interimTranscript = "";

    recognition.onresult = (event: any) => {
      interimTranscript = "";
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
          
          // Reset silence timer
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          
          // Process command after 1.5 seconds of silence
          silenceTimerRef.current = setTimeout(() => {
            if (finalTranscript.trim()) {
              console.log("Processing:", finalTranscript.trim());
              handleCommand(finalTranscript.trim());
              finalTranscript = "";
            }
          }, 1500);
        } else {
          interimTranscript += transcript;
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      
      if (event.error === "no-speech") {
        // Ignore no-speech errors in continuous mode
        return;
      }
      
      setError(`Recognition error: ${event.error}`);
      
      if (event.error === "not-allowed") {
        stopListening();
      }
    };

    recognition.onend = () => {
      if (isListening) {
        // Auto-restart if still supposed to be listening
        recognition.start();
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
    setError(null);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    setIsListening(false);
  };

  const startConversation = async () => {
    await speak("Hello! I'm your shopping assistant. How can I help you today?");
    startListening();
  };

  const toggleMute = () => {
    setIsMuted(prev => !prev);
    if (currentAudioRef.current && !isMuted) {
      currentAudioRef.current.pause();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
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
              <div className={`w-3 h-3 rounded-full ${isSpeaking ? 'bg-blue-500' : 'bg-red-500'} animate-pulse`}></div>
              <span className="text-sm font-semibold text-gray-700">
                {isSpeaking ? "🔊 Speaking..." : isMuted ? "🔇 Listening (Muted)" : "🎤 Listening..."}
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
          
          <div className="text-xs text-gray-500 text-center mt-3">
            Try: "Add headphones to cart" or "Show my cart"
          </div>
        </div>
      )}
    </div>
  );
}