import { evaluateExtraction } from "./rules";

export const sampleResult = evaluateExtraction({
  product_name: "Oat & Almond Breakfast Bites",
  brand_or_manufacturer: "Grain & Grove Foods",
  net_quantity: "200 g",
  mrp: "₹100",
  declared_unit_sale_price: "₹0.50/g",
  manufacturer_details: "Grain & Grove Foods Pvt. Ltd., Bengaluru, India",
  country_of_origin: "India",
  ingredients: ["Rolled oats", "Almonds", "Brown sugar", "Rice syrup", "Cocoa", "Sunflower oil", "Sea salt"],
  nutrition: {
    energy: "438 kcal per 100 g",
    protein: "9.2 g per 100 g",
    total_sugars: "18 g per 100 g",
    sodium: "160 mg per 100 g"
  },
  extraction_confidence: {
    product_name: "HIGH",
    net_quantity: "HIGH",
    mrp: "HIGH",
    ingredients: "HIGH",
    nutrition: "HIGH"
  }
});