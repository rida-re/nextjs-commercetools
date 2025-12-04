"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";

export default function VoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<any>(null);
  const { cart, setCart } = useCartStore();
  const router = useRouter();

  // --- Murf TTS ---
  const speak = async (text: string) => {
    if (isMuted) return; // Don't speak if muted
    
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
        console.error("No audio returned from Murf", data);
        return;
      }

      const audio = new Audio(data.audioUrl);
      await audio.play();
      await new Promise((resolve) => (audio.onended = resolve));
    } catch (err) {
      console.error("Murf TTS error:", err);
      setError("Failed to speak");
    }
  };

  // --- Start listening ---
  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Speech Recognition");
      return;
    }

    const newRecognition = new SpeechRecognition();
    newRecognition.lang = "en-US";
    newRecognition.continuous = true; // Changed to true for continuous listening
    newRecognition.interimResults = false;

    newRecognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
      console.log("User said:", transcript);
      handleCommand(transcript);
    };

    newRecognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setError(`Recognition error: ${event.error}`);
    };

    newRecognition.onend = () => {
      console.log("Recognition ended");
      setIsListening(false);
    };

    newRecognition.start();
    setRecognition(newRecognition);
    setIsListening(true);
    setError(null);
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
      setRecognition(null);
    }
    setIsListening(false);
  };

  // --- Fuzzy matching for product names ---
  const levenshteinDistance = (str1: string, str2: string): number => {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[len1][len2];
  };

  // --- Find similar product from available products ---
  const findSimilarProduct = (spokenWord: string, availableProducts: string[]): string | null => {
    const normalized = spokenWord.toLowerCase().trim();
    
    // First try exact match
    const exactMatch = availableProducts.find(p => p.toLowerCase() === normalized);
    if (exactMatch) return exactMatch;

    // Then try fuzzy matching
    let bestMatch = null;
    let bestScore = Infinity;
    
    for (const product of availableProducts) {
      const distance = levenshteinDistance(normalized, product.toLowerCase());
      const similarity = distance / Math.max(normalized.length, product.length);
      
      // If similarity is good (less than 30% different)
      if (similarity < 0.3 && distance < bestScore) {
        bestScore = distance;
        bestMatch = product;
      }
    }
    
    return bestMatch;
  };

  // --- Extract product names/IDs from command ---
  const extractProduct = (command: string): string | null => {
    // Try to find product after common phrases
    const patterns = [
      /(?:add|remove|delete|put|place|insert|take)\s+(?:product\s+|item\s+)?(\w+)/i,
      /(\w+)\s+(?:to|from|in|into)\s+(?:the\s+)?(?:cart|basket|bag)/i,
      /(?:product|item)\s+(?:called|named)?\s*(\w+)/i,
      /(?:want|need|get)\s+(?:the\s+)?(\w+)/i,
    ];
    
    for (const pattern of patterns) {
      const match = command.match(pattern);
      if (match && match[1]) {
        const word = match[1];
        // Filter out common words that aren't products
        const stopWords = ['cart', 'basket', 'bag', 'product', 'item', 'the', 'a', 'an'];
        if (!stopWords.includes(word.toLowerCase())) {
          return word;
        }
      }
    }
    return null;
  };

  // --- Detect intent from command ---
  const detectIntent = (command: string) => {
    const lowerCmd = command.toLowerCase();
    
    // Add to cart intents
    if (/(add|put|place|insert|include)/.test(lowerCmd) && 
        /(cart|basket|bag|order)/.test(lowerCmd)) {
      return "add";
    }
    
    // Remove from cart intents
    if (/(remove|delete|take|clear|drop)/.test(lowerCmd) && 
        /(cart|basket|bag|order)/.test(lowerCmd)) {
      return "remove";
    }
    
    // Navigation intents
    if (/(go|navigate|take|show|open)/.test(lowerCmd)) {
      if (/(home|main|start|beginning)/.test(lowerCmd)) return "home";
      if (/(product|shop|store|catalog|browse)/.test(lowerCmd)) return "products";
      if (/(cart|basket|bag|checkout)/.test(lowerCmd)) return "cart";
    }
    
    // Help intent
    if (/(help|what|how|can you)/.test(lowerCmd)) return "help";
    
    // Stop intent
    if (/(stop|exit|quit|close|bye|goodbye)/.test(lowerCmd)) return "stop";
    
    return "unknown";
  };

  // --- Handle voice commands ---
  const handleCommand = async (command: string) => {
    try {
      const intent = detectIntent(command);
      
      // Mock available products - replace with actual product fetch
      const availableProducts = ['shoes', 'laptop', 'headphones', 'watch', 'phone', 'tablet', 'camera', 'keyboard'];
      
      switch (intent) {
        case "add": {
          const spokenProduct = extractProduct(command);
          if (spokenProduct) {
            // Try to find similar product
            const matchedProduct = findSimilarProduct(spokenProduct, availableProducts);
            
            if (matchedProduct && cart) {
              const res = await fetch("/api/cart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "add",
                  cartId: cart.id,
                  version: cart.version,
                  productId: matchedProduct,
                  quantity: 1,
                }),
              });
              
              if (!res.ok) throw new Error("Failed to add product");
              
              const updatedCart = await res.json();
              setCart(updatedCart);
              
              // Confirm what was understood
              if (spokenProduct.toLowerCase() !== matchedProduct.toLowerCase()) {
                await speak(`I heard ${spokenProduct}. Adding ${matchedProduct} to your cart`);
              } else {
                await speak(`Added ${matchedProduct} to your cart`);
              }
            } else {
              await speak(`I heard ${spokenProduct}, but I couldn't find a matching product. Available products include shoes, laptop, headphones, watch, phone, tablet, camera, and keyboard`);
            }
          } else {
            await speak("Which product would you like to add? Please say add followed by the product name");
          }
          break;
        }
        
        case "remove": {
          const spokenProduct = extractProduct(command);
          if (spokenProduct && cart) {
            // Try to find similar product in cart
            const cartProducts = cart.lineItems.map((i: any) => i.variant?.sku || '');
            const matchedProduct = findSimilarProduct(spokenProduct, cartProducts);
            
            if (matchedProduct) {
              const lineItem = cart.lineItems.find((i: any) => i.variant?.sku === matchedProduct);
              if (lineItem) {
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
                
                if (!res.ok) throw new Error("Failed to remove product");
                
                const updatedCart = await res.json();
                setCart(updatedCart);
                
                // Confirm what was understood
                if (spokenProduct.toLowerCase() !== matchedProduct.toLowerCase()) {
                  await speak(`I heard ${spokenProduct}. Removing ${matchedProduct} from your cart`);
                } else {
                  await speak(`Removed ${matchedProduct} from your cart`);
                }
              }
            } else {
              await speak(`I heard ${spokenProduct}, but I couldn't find it in your cart`);
            }
          } else {
            await speak("Which product would you like to remove?");
          }
          break;
        }
        
        case "home":
          router.push("/");
          await speak("Taking you to the home page");
          break;
        
        case "products":
          router.push("/products");
          await speak("Here are all our products");
          break;
        
        case "cart":
          router.push("/cart");
          await speak("Opening your shopping cart");
          break;
        
        case "help":
          await speak("You can ask me to add or remove products, go to the home page, show products, or view your cart. What would you like to do?");
          break;
        
        case "stop":
          await speak("Goodbye! Have a great day!");
          stopListening();
          break;
        
        default:
          await speak("I'm not sure what you want to do. You can say things like: add product, remove product, show cart, go home, or show products");
          break;
      }
    } catch (err) {
      console.error("Command error:", err);
      setError("Failed to process command");
      await speak("Sorry, something went wrong. Please try again");
    }
  };

  // --- Start conversation ---
  const startConversation = async () => {
    await speak("Hello! I am your shopping assistant. What would you like me to do?");
    startListening();
  };

  // --- Mute / unmute ---
  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isListening ? (
        <button
          onClick={startConversation}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full shadow-lg transition-colors"
        >
          🎤 Start Voice Assistant
        </button>
      ) : (
        <div className="bg-white shadow-lg rounded-lg p-4 w-64">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">
              {isMuted ? "🔇 Muted" : "🎤 Listening..."}
            </span>
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={toggleMute}
              className="flex-1 border border-gray-300 px-3 py-2 rounded hover:bg-gray-50 transition-colors text-sm"
            >
              {isMuted ? "Unmute" : "Mute"}
            </button>
            <button
              onClick={stopListening}
              className="flex-1 bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 transition-colors text-sm"
            >
              Stop
            </button>
          </div>
          
          {error && (
            <div className="mt-2 text-red-600 text-xs">{error}</div>
          )}
        </div>
      )}
    </div>
  );
}