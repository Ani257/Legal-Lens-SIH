import { NextResponse } from "next/server";
import { extractPackage } from "@/lib/gemini";
import { evaluateExtraction } from "@/lib/rules";
import { extractionSchema } from "@/lib/schema";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const supported = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body?.image || typeof body.image !== "string" || !supported.has(body.mimeType)) {
      return NextResponse.json({ error: "Please choose a JPG, PNG or WebP image." }, { status: 400 });
    }
    const base64 = body.image.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
    if (!base64 || base64.length * 0.75 > MAX_BYTES) {
      return NextResponse.json({ error: "This image is too large. Please choose a smaller photo." }, { status: 413 });
    }

    const raw = await extractPackage(base64, body.mimeType);
    const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    let json: unknown;
    try { json = JSON.parse(cleaned); }
    catch { return NextResponse.json({ error: "The package details could not be understood. Please try a clearer photo." }, { status: 502 }); }
    const parsed = extractionSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Some package details were returned in an unexpected format." }, { status: 502 });
    }
    return NextResponse.json(evaluateExtraction(parsed.data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "MISSING_API_KEY") {
      return NextResponse.json({ error: "Live scanning is not configured yet. You can still try the sample scan." }, { status: 503 });
    }
    if (message === "GEMINI_TIMEOUT") {
      return NextResponse.json({ error: "Reading this package took too long. Please try again." }, { status: 504 });
    }
    console.error("Package analysis failed:", message);
    return NextResponse.json({ error: "Something went wrong while reading this package." }, { status: 502 });
  }
}