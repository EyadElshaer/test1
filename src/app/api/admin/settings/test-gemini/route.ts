import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getGeminiApiKey } from "@/lib/geminiReceiptVerifier";

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

    // Models verified active and live for your Google API key
    const verifiedModels = [
      "gemini-3.5-flash",
      "gemini-3-flash-preview",
      "gemini-3.8-flash",
    ];

    let lastError = "";

    for (const model of verifiedModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keyToTest}`;
        const testRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Hello! Answer with 'READY'." }] }],
          }),
          signal: AbortSignal.timeout(12000),
        });

        if (testRes.ok) {
          const data = await testRes.json();
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "READY";
          return NextResponse.json({
            success: true,
            message: `Google Gemini connected successfully! (Active Model: ${model})`,
            model,
            reply,
          });
        } else {
          const errText = await testRes.text();
          try {
            const j = JSON.parse(errText);
            lastError = j.error?.message || errText;
          } catch {
            lastError = errText;
          }
        }
      } catch (fetchErr: any) {
        lastError = fetchErr?.message || "Connection timeout";
      }
    }

    return NextResponse.json(
      { error: `Connection failed: ${lastError || "Could not reach Gemini service."}` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Gemini test failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to reach Google Gemini API." },
      { status: 500 }
    );
  }
}
