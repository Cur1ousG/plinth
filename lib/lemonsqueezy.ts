const VARIANT_ID = process.env.EXPO_PUBLIC_LEMONSQUEEZY_VARIANT_ID ?? '';

export function getVariantId(): string | null {
  return VARIANT_ID.length > 0 ? VARIANT_ID : null;
}
