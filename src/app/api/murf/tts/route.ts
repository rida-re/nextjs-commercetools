import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    // Check for Murf API key
    const murfApiKey = process.env.MURF_API_KEY;
    if (!murfApiKey) {
      console.error("MURF_API_KEY not configured");
      return NextResponse.json(
        { error: "TTS service not configured" },
        { status: 500 }
      );
    }

    // Call Murf API
    const response = await fetch("https://api.murf.ai/v1/speech/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": murfApiKey,
      },
      body: JSON.stringify({
        text,
        voiceId: "en-US-ken", // You can change this to any Murf voice
        format: "MP3",
        sampleRate: 48000,
        speed: 0,
        pitch: 0,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Murf API error:", errorData);
      return NextResponse.json(
        { error: "Failed to generate speech" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return the audio URL
    return NextResponse.json({
      audioUrl: data.audioFile || data.audioUrl || data.url,
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}