import { z } from "zod";

const visible = z.string().catch("Not clearly visible");
const confidence = z.enum(["HIGH", "MEDIUM", "LOW"]).catch("LOW");

export const extractionSchema = z.object({
  product_name: visible,
  brand_or_manufacturer: visible,
  net_quantity: visible,
  mrp: visible,
  declared_unit_sale_price: visible,
  manufacturer_details: visible,
  country_of_origin: visible,
  ingredients: z.array(z.string()).catch([]),
  nutrition: z.object({
    energy: visible,
    protein: visible,
    total_sugars: visible,
    sodium: visible
  }).catch({
    energy: "Not clearly visible",
    protein: "Not clearly visible",
    total_sugars: "Not clearly visible",
    sodium: "Not clearly visible"
  }),
  extraction_confidence: z.object({
    product_name: confidence,
    net_quantity: confidence,
    mrp: confidence,
    ingredients: confidence,
    nutrition: confidence
  }).catch({
    product_name: "LOW",
    net_quantity: "LOW",
    mrp: "LOW",
    ingredients: "LOW",
    nutrition: "LOW"
  })
});