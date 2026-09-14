import { GoogleGenerativeAI } from "@google/generative-ai";

const prompt = `Extract only information clearly visible on this packaged food image.
Return only compact valid JSON, without markdown or commentary, matching:
{"product_name":"String","brand_or_manufacturer":"String","net_quantity":"String","mrp":"String","declared_unit_sale_price":"String","manufacturer_details":"String","country_of_origin":"String","ingredients":["String"],"nutrition":{"energy":"String","protein":"String","total_sugars":"String","sodium":"String"},"extraction_confidence":{"product_name":"HIGH | MEDIUM | LOW","net_quantity":"HIGH | MEDIUM | LOW","mrp":"HIGH | MEDIUM | LOW","ingredients":"HIGH | MEDIUM | LOW","nutrition":"HIGH | MEDIUM | LOW"}}
Use exactly "Not clearly visible" for unreadable or absent string fields and [] for unreadable ingredients. Never guess. Do not calculate prices or provide a legal verdict.`;

const ATTEMPT_TIMEOUT_MS = 25_000;
const RETRY_BASE_DELAY_MS = 250;
const RETRY_JITTER_MS = 250;

function isTransientOverload(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const status = typeof error === "object" && error !== null && "status" in error
    ? (error as { status?: unknown }).status
    : undefined;
  return status === 429 || status === 500 || status === 503 ||
    /\[(429|500|503)\b|too many requests|internal server error|service unavailable|resource exhausted|high demand/i.test(message);
}

function waitForRetry(attempt: number) {
  const delay = RETRY_BASE_DELAY_MS * (2 ** attempt) + Math.random() * RETRY_JITTER_MS;
  return new Promise<void>(resolve => setTimeout(resolve, delay));
}

export async function extractPackage(base64: string, mimeType: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("MISSING_API_KEY");
  const model = new GoogleGenerativeAI(key).getGenerativeModel({ model: "gemini-3.5-flash" });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("GEMINI_TIMEOUT")), ATTEMPT_TIMEOUT_MS);
      });
      const request = model.generateContent([
        prompt,
        { inlineData: { data: base64, mimeType } }
      ]);
      const result = await Promise.race([request, timeout]);
      return result.response.text();
    } catch (error) {
      if (attempt === 0 && isTransientOverload(error)) {
        await waitForRetry(attempt);
        continue;
      }
      throw error;
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    }
  }

  throw new Error("GEMINI_UNEXPECTED_RETRY_EXIT");
}