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

    // Ping Gemini 1.5 Flash
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${keyToTest}`;
    const testRes = await fetch(geminiUrl, {
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
      return NextResponse.json({ error: `Connection failed: ${parsedErr}` }, { status: 400 });
    }

    const data = await testRes.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "READY";

    return NextResponse.json({
      success: true,
      message: `Google Gemini 1.5 Flash Vision connected successfully! (Model response: ${reply})`,
    });
  } catch (error: any) {
    console.error("Gemini test failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to reach Google Gemini API." },
      { status: 500 }
    );
  }
}
