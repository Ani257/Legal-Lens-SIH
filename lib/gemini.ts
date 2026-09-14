import { GoogleGenerativeAI } from "@google/generative-ai";

const prompt = `Extract only information clearly visible on this packaged food image.
Return only compact valid JSON, without markdown or commentary, matching:
{"product_name":"String","brand_or_manufacturer":"String","net_quantity":"String","mrp":"String","declared_unit_sale_price":"String","manufacturer_details":"String","country_of_origin":"String","ingredients":["String"],"nutrition":{"energy":"String","protein":"String","total_sugars":"String","sodium":"String"},"extraction_confidence":{"product_name":"HIGH | MEDIUM | LOW","net_quantity":"HIGH | MEDIUM | LOW","mrp":"HIGH | MEDIUM | LOW","ingredients":"HIGH | MEDIUM | LOW","nutrition":"HIGH | MEDIUM | LOW"}}
Use exactly "Not clearly visible" for unreadable or absent string fields and [] for unreadable ingredients. Never guess. Do not calculate prices or provide a legal verdict.`;

export async function extractPackage(base64: string, mimeType: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("MISSING_API_KEY");
  const model = new GoogleGenerativeAI(key).getGenerativeModel({ model: "gemini-3.5-flash" });
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) =>
    { timeoutId = setTimeout(() => reject(new Error("GEMINI_TIMEOUT")), 25_000); }
  );
  try {
    const request = model.generateContent([
      prompt,
      { inlineData: { data: base64, mimeType } }
    ]);
    const result = await Promise.race([request, timeout]);
    return result.response.text();
  } finally {
    clearTimeout(timeoutId!);
  }
}