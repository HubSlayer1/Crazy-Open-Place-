export const CONTACT_FACEBOOK_URL = 'https://www.facebook.com/share/1DnqXXosMt/';

export type ProviderDestinationType = 'product_checkout' | 'product_page' | 'service_website';

export interface GuildGloryProvider {
  id: string;
  name: string;
  domain: string;
  url: string;
  destinationType: ProviderDestinationType;
  verificationStatus: 'product_candidate' | 'service_website_only';
  currency: 'BDT';
  packagesSummary: string;
  paymentMethodsLabel: string;
  checkoutNote: string;
  ctaLabel: string;
  lastCheckedDate: string;
  paymentSessionVerified: false;
  supportsOfficialReturnUrl: false;
  enabled: boolean;
}

export const EXTERNAL_PROVIDER_NOTICE =
  'You are leaving CrazyOpenPlace. Payment and service delivery are handled by the provider. Check the final package, price, fees and payment method on the provider website before paying.';

export const THANK_YOU_RETURN_NOTICE =
  'Thank you for visiting CrazyOpenPlace. Your payment and Guild Glory service are handled directly by the external provider you selected. Keep your provider transaction reference and payment receipt. Returning to CrazyOpenPlace does not confirm payment or service completion.';

export const GUILD_GLORY_PROVIDERS: GuildGloryProvider[] = [
  {
    id: 'ffibd-shop',
    name: 'FFIBD Shop',
    domain: 'ffibd.shop',
    url: 'https://ffibd.shop/topup/popular-item-1/ff-glory-bot-19',
    destinationType: 'product_checkout',
    verificationStatus: 'product_candidate',
    currency: 'BDT',
    packagesSummary: 'See current packages and payment methods at provider checkout.',
    paymentMethodsLabel: 'See current payment methods at provider checkout.',
    checkoutNote:
      'Product checkout destination on ffibd.shop. Prior check noted a redirect to ff-guild-glory-bot-19 and BDT checkout options; verify current live price and gateway fees on the provider site before paying.',
    ctaLabel: 'Buy from FFIBD Shop',
    lastCheckedDate: '2026-11-19',
    paymentSessionVerified: false,
    supportsOfficialReturnUrl: false,
    enabled: true,
  },
  {
    id: 'bd-games-topup',
    name: 'BD Games Topup',
    domain: 'bdgamestopup.com',
    url: 'https://bdgamestopup.com/topup/64/guild-glory-bot',
    destinationType: 'product_checkout',
    verificationStatus: 'product_candidate',
    currency: 'BDT',
    packagesSummary: 'See current packages and payment methods at provider checkout.',
    paymentMethodsLabel: 'See current payment methods at provider checkout.',
    checkoutNote:
      'Direct product page on bdgamestopup.com (BDT). Always confirm current package rates, availability, and payment options directly on bdgamestopup.com.',
    ctaLabel: 'Buy from BD Games Topup',
    lastCheckedDate: '2026-11-19',
    paymentSessionVerified: false,
    supportsOfficialReturnUrl: false,
    enabled: true,
  },
  {
    id: 'ff-topup-house',
    name: 'FF TopUp House',
    domain: 'fftopuphouse.com',
    url: 'https://fftopuphouse.com/product/guild-glory-bot',
    destinationType: 'product_page',
    verificationStatus: 'product_candidate',
    currency: 'BDT',
    packagesSummary: 'See current packages and payment methods at provider checkout.',
    paymentMethodsLabel: 'Packages and payment methods load dynamically on provider site.',
    checkoutNote:
      'Product page on fftopuphouse.com (BDT). Prices and payment methods load dynamically in your browser when visiting the site.',
    ctaLabel: 'Buy from FF TopUp House',
    lastCheckedDate: '2026-11-19',
    paymentSessionVerified: false,
    supportsOfficialReturnUrl: false,
    enabled: true,
  },
  {
    id: 'rio-game-shop',
    name: 'Rio Game Shop',
    domain: 'riogameshop.com',
    url: 'https://riogameshop.com/product/guild-bot',
    destinationType: 'product_page',
    verificationStatus: 'product_candidate',
    currency: 'BDT',
    packagesSummary: 'See current packages and payment methods at provider checkout.',
    paymentMethodsLabel: 'Packages and payment methods load dynamically on provider site.',
    checkoutNote:
      'Product page on riogameshop.com (BDT). Check live package options, supported regions, and payment methods directly on riogameshop.com.',
    ctaLabel: 'Buy from Rio Game Shop',
    lastCheckedDate: '2026-11-19',
    paymentSessionVerified: false,
    supportsOfficialReturnUrl: false,
    enabled: true,
  },
  {
    id: 'ffglory-site',
    name: 'FFGlory',
    domain: 'www.ffglory.pro',
    url: 'https://www.ffglory.pro/en/',
    destinationType: 'service_website',
    verificationStatus: 'service_website_only',
    currency: 'BDT',
    packagesSummary: 'See current packages and payment methods at provider checkout.',
    paymentMethodsLabel: 'External service website (not a direct product-only checkout URL).',
    checkoutNote:
      'General external service website. May show Cloudflare browser verification before loading. Not labeled as a direct payment URL.',
    ctaLabel: 'Continue to FFGlory',
    lastCheckedDate: '2026-11-19',
    paymentSessionVerified: false,
    supportsOfficialReturnUrl: false,
    enabled: true,
  },
];

const ALLOWLIST_MAP = new Map<string, GuildGloryProvider>(
  GUILD_GLORY_PROVIDERS.map((p) => [p.url, p])
);

export function validateAllowlistedProviderUrl(
  candidateUrl: string,
  expectedDomain?: string
): { valid: boolean; reason?: string } {
  try {
    const parsed = new URL(candidateUrl);
    if (parsed.protocol !== 'https:') {
      return { valid: false, reason: 'Provider link must use HTTPS.' };
    }
    const matched = ALLOWLIST_MAP.get(candidateUrl);
    if (!matched || !matched.enabled) {
      return { valid: false, reason: 'Provider destination is disabled or not in allowlist.' };
    }
    if (parsed.hostname !== matched.domain) {
      return { valid: false, reason: 'Provider hostname mismatch.' };
    }
    if (expectedDomain && parsed.hostname !== expectedDomain) {
      return { valid: false, reason: 'Unexpected domain.' };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: 'Invalid provider URL format.' };
  }
}
