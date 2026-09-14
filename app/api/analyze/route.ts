import { NextResponse } from "next/server";
import { extractPackage } from "@/lib/gemini";
import { evaluateExtraction } from "@/lib/rules";
import { extractionSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 1_500_000;
const MAX_REQUEST_BYTES = 2_100_000;
const supported = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || "0");
    if (contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "This photo is too large to upload. Please take a closer photo of the label." }, { status: 413 });
    }
    let body: { image?: unknown; mimeType?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "The photo upload could not be read. Please choose the photo again." }, { status: 400 });
    }
    if (!body?.image || typeof body.image !== "string" || typeof body.mimeType !== "string" || !supported.has(body.mimeType)) {
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
      return NextResponse.json({ error: "Reading this package took too long. Please try again when your connection is stable." }, { status: 504 });
    }
    if (/\[(429|500|503)\b|too many requests|internal server error|high demand|resource exhausted|service unavailable/i.test(message)) {
      return NextResponse.json({ error: "The scan service is temporarily overloaded, not a problem with your photo. Please wait a moment, then tap Try Again." }, { status: 503 });
    }
    if (/\[(400)\b|invalid argument|unsupported image/i.test(message)) {
      return NextResponse.json({ error: "This photo could not be read by the scan service. Please choose a JPG, PNG or WebP photo." }, { status: 400 });
    }
    if (/\[(401|403)\b|api key|permission denied/i.test(message)) {
      return NextResponse.json({ error: "Live scanning is temporarily unavailable because its secure connection could not be verified." }, { status: 503 });
    }
    console.error("Package analysis failed:", message);
    return NextResponse.json({ error: "Something went wrong while reading this package." }, { status: 502 });
  }
}