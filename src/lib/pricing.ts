export type PricingTier = {
  qty: number;
  label?: string;
  originalPrice: number;
  finalPrice: number;
};

function getBasePrice(product: any) {
  return Number(product?.pricing?.price ?? product?.price ?? 0);
}

function getPricingTiers(product: any): PricingTier[] {
  return (Array.isArray(product?.pricingTiers) ? product.pricingTiers : [])
    .map((tier: any) => ({
      qty: Number(tier?.qty ?? 0),
      label: tier?.label,
      originalPrice: Number(tier?.originalPrice ?? 0),
      finalPrice: Number(tier?.finalPrice ?? 0),
    }))
    .filter((tier: PricingTier) => tier.qty > 0)
    .sort((a: PricingTier, b: PricingTier) => a.qty - b.qty);
}

export function getUnitPricingForQuantity(
  product: any,
  quantity: number,
  variantPrice?: number | null,
): { unitPrice: number; activeTier: PricingTier | null; tiers: PricingTier[] } {
  if (typeof variantPrice === "number" && variantPrice > 0) {
    return { unitPrice: variantPrice, activeTier: null, tiers: [] };
  }

  const tiers = getPricingTiers(product);
  let activeTier: PricingTier | null = null;

  for (const tier of tiers) {
    if (quantity >= tier.qty) {
      activeTier = tier;
    } else {
      break;
    }
  }

  return {
    unitPrice: activeTier?.finalPrice ?? getBasePrice(product),
    activeTier,
    tiers,
  };
}
