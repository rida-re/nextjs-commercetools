import { NextResponse } from "next/server";
import { headers } from "next/headers";

// Simple in-memory cache (use Redis in production)
const audioCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// Rate limiting (use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 50; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function getRateLimitKey(ip: string, userId?: string): string {
  return userId || ip || "anonymous";
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

function getCacheKey(text: string, voiceId: string): string {
  return `${voiceId}:${text.toLowerCase().trim()}`;
}

export async function POST(request: Request) {
  try {
    const { text, voiceId = "en-US-ken", userId } = await request.json();

    // Validation
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Valid text is required" },
        { status: 400 }
      );
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { error: "Text too long (max 5000 characters)" },
        { status: 400 }
      );
    }

    // Rate limiting
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0] || 
               headersList.get("x-real-ip") || 
               "unknown";
    const rateLimitKey = getRateLimitKey(ip, userId);

    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    // Check cache
    const cacheKey = getCacheKey(text, voiceId);
    const cached = audioCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("Cache hit for:", text.substring(0, 50));
      return NextResponse.json({
        audioUrl: cached.url,
        cached: true,
      });
    }

    // Check API key
    const murfApiKey = process.env.MURF_API_KEY;
    if (!murfApiKey) {
      console.error("MURF_API_KEY not configured");
      return NextResponse.json(
        { error: "TTS service not configured" },
        { status: 500 }
      );
    }

    // Call Murf API with retry logic
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch("https://api.murf.ai/v1/speech/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": murfApiKey,
          },
          body: JSON.stringify({
            text,
            voiceId,
            format: "MP3",
            sampleRate: 48000,
            speed: 0,
            pitch: 0,
            // Add these for better quality
            audioBitrate: 192,
            effect: "none",
          }),
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error(`Murf API error (attempt ${attempt + 1}):`, errorData);
          
          // Don't retry on client errors
          if (response.status >= 400 && response.status < 500) {
            return NextResponse.json(
              { error: "Invalid request to TTS service" },
              { status: response.status }
            );
          }
          
          lastError = new Error(`HTTP ${response.status}: ${errorData}`);
          
          // Wait before retry
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }
        } else {
          const data = await response.json();
          const audioUrl = data.audioFile || data.audioUrl || data.url;

          if (!audioUrl) {
            console.error("No audio URL in response:", data);
            return NextResponse.json(
              { error: "Invalid response from TTS service" },
              { status: 500 }
            );
          }

          // Cache the result
          audioCache.set(cacheKey, {
            url: audioUrl,
            timestamp: Date.now(),
          });

          // Clean old cache entries
          if (audioCache.size > 1000) {
            const now = Date.now();
            for (const [key, value] of audioCache.entries()) {
              if (now - value.timestamp > CACHE_TTL) {
                audioCache.delete(key);
              }
            }
          }

          return NextResponse.json({
            audioUrl,
            cached: false,
          });
        }
      } catch (fetchError: any) {
        console.error(`Fetch error (attempt ${attempt + 1}):`, fetchError);
        lastError = fetchError;
        
        // Wait before retry
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    // All retries failed
    throw lastError || new Error("Failed to generate speech after retries");

  } catch (error: any) {
    console.error("TTS error:", error);
    
    // Provide helpful error messages
    if (error.name === "AbortError") {
      return NextResponse.json(
        { error: "Request timeout. Please try again." },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { 
        error: "Failed to generate speech",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// Optional: Add a cleanup endpoint for the cache
export async function DELETE(request: Request) {
  try {
    const { key } = await request.json();
    
    if (key === "all") {
      audioCache.clear();
      rateLimitMap.clear();
      return NextResponse.json({ message: "Cache cleared" });
    }
    
    if (key) {
      audioCache.delete(key);
      return NextResponse.json({ message: "Entry removed" });
    }
    
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  } catch (error) {
    console.error("Cache cleanup error:", error);
    return NextResponse.json(
      { error: "Cleanup failed" },
      { status: 500 }
    );
  }
}