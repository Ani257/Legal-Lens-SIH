export type Confidence = "HIGH" | "MEDIUM" | "LOW";
export type CheckStatus = "COMPLIANT" | "NON_COMPLIANT" | "UNVERIFIED";

export interface Extraction {
  product_name: string;
  brand_or_manufacturer: string;
  net_quantity: string;
  mrp: string;
  declared_unit_sale_price: string;
  manufacturer_details: string;
  country_of_origin: string;
  ingredients: string[];
  nutrition: {
    energy: string;
    protein: string;
    total_sugars: string;
    sodium: string;
  };
  extraction_confidence: {
    product_name: Confidence;
    net_quantity: Confidence;
    mrp: Confidence;
    ingredients: Confidence;
    nutrition: Confidence;
  };
}

export interface LabelCheck {
  key: "netQuantity" | "mrp" | "unitPrice" | "nutrition";
  label: string;
  status: CheckStatus;
  explanation: string;
}

export interface SugarNotice { name: string; explanation: string; }

export interface PriceResult {
  mrp: string;
  netQuantity: string;
  declared: string;
  calculated: string;
  difference: string;
  state: "MATCH" | "DIFFERENT" | "UNVERIFIED";
  amount?: number;
  quantity?: number;
  normalizedUnit?: "g" | "ml";
}

export interface AnalysisResult {
  extraction: Extraction;
  overall: "LEGAL" | "WARNING_FLAGS";
  checks: LabelCheck[];
  price: PriceResult;
  sugars: SugarNotice[];
}