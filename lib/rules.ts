import type { AnalysisResult, CheckStatus, Extraction, PriceResult, SugarNotice } from "./types";

const unreadable = (value: string) =>
  !value || /not clearly visible|could not verify|unreadable|unknown|not visible/i.test(value);

const parseMoney = (value: string) => {
  if (unreadable(value)) return null;
  const match = value.replace(/,/g, "").match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)/i);
  return match ? Number(match[1]) : null;
};

const parseQuantity = (value: string) => {
  if (unreadable(value)) return null;
  const match = value.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === "kg") return { quantity: amount * 1000, unit: "g" as const };
  if (unit === "l") return { quantity: amount * 1000, unit: "ml" as const };
  return { quantity: amount, unit: unit as "g" | "ml" };
};

const parseDeclaredUnitPrice = (value: string) => {
  if (unreadable(value)) return null;
  const money = parseMoney(value);
  const basis = value.match(/(?:per|\/)\s*(\d+(?:\.\d+)?)?\s*(kg|g|ml|l)\b/i);
  if (money === null || !basis) return null;
  const rawBasis = basis[1] ? Number(basis[1]) : 1;
  const unit = basis[2].toLowerCase();
  const normalizedBasis = unit === "kg" || unit === "l" ? rawBasis * 1000 : rawBasis;
  return money / normalizedBasis;
};

export function calculatePrice(extraction: Extraction): PriceResult {
  const amount = parseMoney(extraction.mrp);
  const quantity = parseQuantity(extraction.net_quantity);
  const unavailable: PriceResult = {
    mrp: extraction.mrp,
    netQuantity: extraction.net_quantity,
    declared: extraction.declared_unit_sale_price,
    calculated: "Could not calculate",
    difference: "Could not verify",
    state: "UNVERIFIED"
  };
  if (amount === null || !quantity || quantity.quantity <= 0) return unavailable;

  const perUnit = amount / quantity.quantity;
  const declared = parseDeclaredUnitPrice(extraction.declared_unit_sale_price);
  const state = declared === null ? "UNVERIFIED" : Math.abs(declared - perUnit) <= Math.max(0.005, perUnit * 0.02) ? "MATCH" : "DIFFERENT";
  return {
    mrp: extraction.mrp,
    netQuantity: extraction.net_quantity,
    declared: extraction.declared_unit_sale_price,
    calculated: `₹${perUnit.toFixed(2)}/${quantity.unit}`,
    difference: declared === null ? "Could not verify" : `₹${Math.abs(declared - perUnit).toFixed(2)}/${quantity.unit}`,
    state,
    amount,
    quantity: quantity.quantity,
    normalizedUnit: quantity.unit
  };
}

const sugarTerms: Record<string, string> = {
  "glucose syrup": "An added-sugar ingredient commonly used for sweetness or texture.",
  "invert sugar syrup": "A sweet syrup used to help foods stay smooth and moist.",
  "invert sugar": "A form of added sugar often used for sweetness and texture.",
  "corn syrup": "A syrup made from corn that adds sweetness or texture.",
  "malt syrup": "A sweet syrup made from grains.",
  "rice syrup": "A sweet syrup made from rice.",
  "cane sugar": "Sugar made from sugar cane.",
  "brown sugar": "Sugar containing molasses, used for sweetness and flavour.",
  sucrose: "The common table-sugar molecule.",
  dextrose: "A form of glucose used as an added sweetener.",
  maltose: "A sugar commonly formed from grains.",
  fructose: "A simple sugar used for sweetness.",
  glucose: "A simple sugar that may be added for sweetness.",
  honey: "A naturally derived sweetener that still contributes sugars.",
  sugar: "An added ingredient used for sweetness."
};

export function findSugars(ingredients: string[]): SugarNotice[] {
  const text = ingredients.join(" ").toLowerCase();
  const found: SugarNotice[] = [];
  const matchedRanges: Array<[number, number]> = [];
  Object.entries(sugarTerms).sort(([a], [b]) => b.length - a.length).forEach(([term, explanation]) => {
    const index = text.search(new RegExp(`\\b${term.replace(/\s+/g, "\\s+")}\\b`, "i"));
    if (index >= 0 && !matchedRanges.some(([start, end]) => index >= start && index < end)) {
      found.push({ name: term.replace(/\b\w/g, char => char.toUpperCase()), explanation });
      matchedRanges.push([index, index + term.length]);
    }
  });
  return found;
}

function statusFor(value: string, confidence: "HIGH" | "MEDIUM" | "LOW"): CheckStatus {
  return unreadable(value) || confidence === "LOW" ? "UNVERIFIED" : "COMPLIANT";
}

export function evaluateExtraction(extraction: Extraction): AnalysisResult {
  const price = calculatePrice(extraction);
  const netStatus = statusFor(extraction.net_quantity, extraction.extraction_confidence.net_quantity);
  const mrpStatus = statusFor(extraction.mrp, extraction.extraction_confidence.mrp);
  const nutritionVisible = extraction.ingredients.length > 0 &&
    Object.values(extraction.nutrition).some(value => !unreadable(value));
  const nutritionStatus: CheckStatus =
    extraction.extraction_confidence.nutrition === "LOW" || !nutritionVisible ? "UNVERIFIED" : "COMPLIANT";
  const priceStatus: CheckStatus = price.state === "MATCH" ? "COMPLIANT" : price.state === "DIFFERENT" ? "NON_COMPLIANT" : "UNVERIFIED";

  const checks = [
    { key: "netQuantity" as const, label: "Net Quantity", status: netStatus, explanation: netStatus === "COMPLIANT" ? "Net quantity was clearly visible." : "Net quantity could not be read clearly." },
    { key: "mrp" as const, label: "MRP", status: mrpStatus, explanation: mrpStatus === "COMPLIANT" ? "MRP was clearly visible." : "MRP could not be read clearly." },
    { key: "unitPrice" as const, label: "Unit Price", status: priceStatus, explanation: priceStatus === "COMPLIANT" ? "The declared price matches our calculation." : priceStatus === "NON_COMPLIANT" ? "The declared price differs from our calculation." : "The unit price could not be fully verified." },
    { key: "nutrition" as const, label: "Nutrition & Ingredients", status: nutritionStatus, explanation: nutritionStatus === "COMPLIANT" ? "Nutrition and ingredients were visible." : "Nutrition or ingredients could not be read clearly." }
  ];
  return {
    extraction,
    price,
    checks,
    sugars: findSugars(extraction.ingredients),
    overall: checks.every(check => check.status === "COMPLIANT") ? "LEGAL" : "WARNING_FLAGS"
  };
}