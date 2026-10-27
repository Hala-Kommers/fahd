export type PricingTier = {
  qty: number;
  label?: string;
  originalPrice: number;
  finalPrice: number;
  bundlePrice?: number;
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
      bundlePrice: tier?.bundlePrice == null ? undefined : Number(tier.bundlePrice),
    }))
    .filter((tier: PricingTier) => tier.qty > 0)
    .sort((a: PricingTier, b: PricingTier) => a.qty - b.qty);
}

export function getTierTotal(tier: PricingTier): number {
  return tier.bundlePrice ?? Math.round(tier.finalPrice * tier.qty * 100) / 100;
}

export function getTierUnitPrice(tier: PricingTier): number {
  return tier.bundlePrice == null ? tier.finalPrice : tier.bundlePrice / tier.qty;
}

export function getPurchaseOffers(product: any, variantPrice?: number | null): PricingTier[] {
  const { tiers } = getUnitPricingForQuantity(product, 1, variantPrice);
  if (product?.bundleOnly) return tiers.filter(tier => tier.bundlePrice != null);
  const single: PricingTier = {
    qty: 1, label: "قطعة واحدة",
    originalPrice: Number(product?.pricing?.compareAt ?? product?.compareAt ?? getBasePrice(product)),
    finalPrice: variantPrice ?? getBasePrice(product),
  };
  return [tiers.find(tier => tier.qty === 1) ?? single, ...tiers.filter(tier => tier.qty !== 1)];
}

export function getUnitPricingForQuantity(
  product: any,
  quantity: number,
  variantPrice?: number | null,
): { unitPrice: number; lineTotal: number; activeTier: PricingTier | null; tiers: PricingTier[] } {
  if (typeof variantPrice === "number" && variantPrice > 0) {
    return { unitPrice: variantPrice, lineTotal: Math.round(variantPrice * quantity * 100) / 100, activeTier: null, tiers: [] };
  }

  const tiers = getPricingTiers(product);
  let activeTier: PricingTier | null = null;

  for (const tier of tiers) {
    if (quantity >= tier.qty) {
      if (product?.bundleOnly ? quantity === tier.qty && tier.bundlePrice != null : tier.bundlePrice == null || quantity === tier.qty) {
        activeTier = tier;
      }
    } else {
      break;
    }
  }

  const unitPrice = activeTier ? getTierUnitPrice(activeTier) : getBasePrice(product);
  return {
    unitPrice,
    lineTotal: activeTier?.bundlePrice ?? Math.round(unitPrice * quantity * 100) / 100,
    activeTier,
    tiers,
  };
}
