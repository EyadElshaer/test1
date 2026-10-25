export interface ProductConfiguration {
  id: string;
  name: string; // e.g. "1 PC Retail License", "3 PCs License", "1 Year Subscription"
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  stockQuantity?: number;
  isAvailable?: boolean;
}

/**
 * Calculates discount percent: ((original - sale) / original) * 100
 */
export function calculateDiscount(originalPrice: number, salePrice: number): number {
  if (!originalPrice || originalPrice <= 0 || salePrice >= originalPrice) return 0;
  return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
}

/**
 * Extracts configurations from product data (e.g. from product.configurations or product.attributeValues).
 */
export function extractConfigurations(product: any): ProductConfiguration[] {
  if (!product) return [];

  // 1. Direct configurations array if already attached
  if (Array.isArray(product.configurations) && product.configurations.length > 0) {
    return product.configurations;
  }

  // 2. Check in attributeValues array
  if (Array.isArray(product.attributeValues) && product.attributeValues.length > 0) {
    const configAttr = product.attributeValues.find(
      (a: any) => a.attributeKey === "configurations" || a.attributeKey === "configuration"
    );
    if (configAttr && configAttr.value) {
      try {
        const parsed = JSON.parse(configAttr.value);
        if (Array.isArray(parsed)) {
          return parsed.map((item, idx) => ({
            id: item.id || `cfg_${idx}`,
            name: item.name || `Option ${idx + 1}`,
            originalPrice: Number(item.originalPrice) || 0,
            salePrice: Number(item.salePrice) || Number(item.originalPrice) || 0,
            discountPercent:
              typeof item.discountPercent === "number"
                ? item.discountPercent
                : calculateDiscount(Number(item.originalPrice) || 0, Number(item.salePrice) || 0),
            stockQuantity: item.stockQuantity !== undefined ? Number(item.stockQuantity) : 999,
            isAvailable: item.isAvailable !== undefined ? Boolean(item.isAvailable) : true,
          }));
        }
      } catch (err) {
        console.error("Failed to parse product configurations:", err);
      }
    }
  }

  return [];
}

/**
 * Returns configurations with a fallback default configuration if none are explicitly defined.
 */
export function getProductConfigurationsWithDefault(product: any): ProductConfiguration[] {
  const custom = extractConfigurations(product);
  if (custom.length > 0) {
    return custom;
  }

  const orig = Number(product?.originalPrice) || 0;
  const sale = Number(product?.salePrice) || orig;

  return [
    {
      id: "default",
      name: "Standard",
      originalPrice: orig,
      salePrice: sale,
      discountPercent: product?.discountPercent || calculateDiscount(orig, sale),
      stockQuantity: product?.stockQuantity !== undefined ? Number(product.stockQuantity) : 999,
      isAvailable: product?.availability !== "OUT_OF_STOCK",
    },
  ];
}
