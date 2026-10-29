import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getGeminiApiKey, getAvailableGeminiModel } from "@/lib/geminiReceiptVerifier";

export async function POST(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized: Admin session required." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const keyToTest = body.apiKey?.trim() || (await getGeminiApiKey()).apiKey;

    if (!keyToTest) {
      return NextResponse.json(
        {
          error:
            "No Gemini API key provided. Please paste your key from Google AI Studio (aistudio.google.com).",
        },
        { status: 400 }
      );
    }

    // 1. Query Google to discover the best available model for this key
    const resolved = await getAvailableGeminiModel(keyToTest);

    if (!resolved) {
      return NextResponse.json(
        {
          error:
            "Could not discover any available Gemini models for this API key. Please ensure your key is active in Google AI Studio (aistudio.google.com).",
        },
        { status: 400 }
      );
    }

    // 2. Ping the discovered Gemini model
    const testRes = await fetch(resolved.endpointUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: "Hello! Confirm you are active by answering with 'READY'." }],
          },
        ],
      }),
    });

    if (!testRes.ok) {
      const errText = await testRes.text();
      let parsedErr = "Invalid API key or request rejected by Google.";
      try {
        const json = JSON.parse(errText);
        parsedErr = json.error?.message || parsedErr;
      } catch {}

      // If specific model failed, also fetch available models list to show in error for debugging
      let availableNames = "";
      try {
        const listRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${keyToTest}`
        );
        if (listRes.ok) {
          const listData = await listRes.json();
          const names = (listData.models || [])
            .map((m: any) => m.name?.replace("models/", ""))
            .filter((n: string) => n.includes("gemini"))
            .slice(0, 5);
          if (names.length > 0) {
            availableNames = ` (Available models for your key: ${names.join(", ")})`;
          }
        }
      } catch {}

      return NextResponse.json(
        { error: `Connection failed for ${resolved.modelName}: ${parsedErr}${availableNames}` },
        { status: 400 }
      );
    }

    const data = await testRes.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "READY";

    return NextResponse.json({
      success: true,
      message: `Google Gemini connected successfully! Using model: ${resolved.modelName} (${resolved.apiVersion}). Response: ${reply}`,
      model: resolved.modelName,
      apiVersion: resolved.apiVersion,
    });
  } catch (error: any) {
    console.error("Gemini test failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to reach Google Gemini API." },
      { status: 500 }
    );
  }
}
