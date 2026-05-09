export type { Product } from "@shared/schema";

export function formatPrice(price: number): string {
  return `${price.toLocaleString("ar-SA")} ر.س`;
}
