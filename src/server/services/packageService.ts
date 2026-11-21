import { dispatchToD1, isD1Configured } from './d1Bridge.ts';
import { DEFAULT_STOREFRONT_SETTINGS, OFFICIAL_PROVIDER_URL } from './providerService.ts';

export const DEFAULT_GUILD_PACKAGES = [
  {
    id: 'pkg-gg-starter',
    slug: 'guild-glory-starter-bot',
    name: 'FF Guild Glory Bot — Starter Pack',
    botQuantity: 2,
    sellingPriceMinor: 350,
    priceAmount: 3.5,
    providerPriceNote: 'Store selling rate shown. FFGlory credit pricing is billed separately on www.ffglory.pro.',
    estimatedDelivery: 'Manual verification ~15–60 min after provider submission',
    currency: 'USD',
    durationLabel: 'Standard Session · 2 Coordinated Bots',
    supportedRegions: ['BD', 'IND', 'SG', 'ID', 'BR', 'TH', 'VN', 'ME', 'PK', 'EU', 'NA'],
    description:
      'Entry-tier Guild Glory bot allocation routed through FFGlory service panels. Designed for small guilds testing regional delivery and monitoring initial Glory ticks.',
    instructions:
      'Confirm your Guild ID is public/joinable or accepts automated squad entries according to FFGlory panel guidance before clicking Launch Group.',
    warnings:
      'Requires active FFGlory account credits. Always double-check Guild ID and Region before launching on FFGlory.',
    refundNote:
      'Eligible for FFGlory refund review only if the active group runs >30 minutes with zero Glory recorded.',
    enabled: true,
    sortOrder: 1,
    updatedAt: '2026-11-18T18:18:00.351Z',
  },
  {
    id: 'pkg-gg-squad',
    slug: 'guild-glory-standard-squad',
    name: 'FF Guild Glory Bot — Standard Squad',
    botQuantity: 4,
    sellingPriceMinor: 650,
    priceAmount: 6.5,
    providerPriceNote: 'Store selling rate shown. FFGlory credit pricing is billed separately on www.ffglory.pro.',
    estimatedDelivery: 'Manual verification ~15–60 min after provider submission',
    currency: 'USD',
    durationLabel: 'Standard Session · 4 Coordinated Bots',
    supportedRegions: ['BD', 'IND', 'SG', 'ID', 'BR', 'TH', 'VN', 'ME', 'PK', 'EU', 'NA'],
    description:
      'Balanced 4-bot Guild Glory formation for consistent clan Glory progression. Matches standard FFGlory group launch workflow with manual verification tracking.',
    instructions:
      'Wait at least 15 minutes inside FFGlory My Active Groups after clicking Launch Group to confirm status & Glory updates.',
    warnings: 'Third-party automation carries Garena policy risk. Never share passwords or OTPs.',
    refundNote:
      'Zero-Glory runs lasting >30 minutes qualify for provider verification; provider wallet credit vs store refund tracked separately.',
    enabled: true,
    sortOrder: 2,
    updatedAt: '2026-11-18T18:18:00.351Z',
  },
  {
    id: 'pkg-gg-platoon',
    slug: 'guild-glory-platoon-surge',
    name: 'FF Guild Glory Bot — High-Capacity Surge',
    botQuantity: 8,
    sellingPriceMinor: 1200,
    priceAmount: 12,
    providerPriceNote: 'Store selling rate shown. FFGlory credit pricing is billed separately on www.ffglory.pro.',
    estimatedDelivery: 'Manual verification ~15–60 min after provider submission',
    currency: 'USD',
    durationLabel: 'Extended Session · 8 Coordinated Bots',
    supportedRegions: ['BD', 'IND', 'SG', 'ID', 'BR', 'TH', 'VN', 'ME', 'PK'],
    description:
      'High-capacity 8-bot Guild Glory allocation built for competitive guild pushes. Tracked end-to-end from provider payment confirmation through Group ID verification.',
    instructions:
      'Verify credit balance on https://www.ffglory.pro/ before starting the group. Keep your Provider Transaction ID and Group ID recorded.',
    warnings: 'Verify your Guild capacity has open slots if required by your selected FFGlory configuration.',
    refundNote: 'Refund eligibility requires >30 min runtime with 0 Glory and valid Group ID evidence.',
    enabled: true,
    sortOrder: 3,
    updatedAt: '2026-11-18T18:18:00.351Z',
  },
  {
    id: 'pkg-gg-full',
    slug: 'guild-glory-full-dominion',
    name: 'FF Guild Glory Bot — Full Guild Unit',
    botQuantity: 12,
    sellingPriceMinor: 1750,
    priceAmount: 17.5,
    providerPriceNote: 'Store selling rate shown. FFGlory credit pricing is billed separately on www.ffglory.pro.',
    estimatedDelivery: 'Priority manual verification ~15–45 min',
    currency: 'USD',
    durationLabel: 'Priority Session · 12 Coordinated Bots',
    supportedRegions: ['BD', 'IND', 'SG', 'ID', 'BR', 'TH', 'VN', 'ME'],
    description:
      'Maximum 12-bot Guild Glory deployment with priority admin verification on Crazy.Org All in one and full timeline audit logging.',
    instructions:
      'Submit Binance Pay / FFGlory transaction reference immediately after payment, then wait for Admin verification before launching.',
    warnings: 'Editable package pricing in Admin Console must mirror current FFGlory credit rates. Zero ban-safety guarantees.',
    refundNote:
      'FFGlory issues approved refunds as provider credits unless store cash refund is explicitly authorized by Admin.',
    enabled: true,
    sortOrder: 4,
    updatedAt: '2026-11-18T18:18:00.351Z',
  },
];

export async function getStorefrontCatalog() {
  if (!isD1Configured()) {
    return {
      packages: DEFAULT_GUILD_PACKAGES,
      settings: DEFAULT_STOREFRONT_SETTINGS,
      providerUrl: OFFICIAL_PROVIDER_URL,
      d1Connected: false,
    };
  }

  try {
    const data = await dispatchToD1<{
      packages?: typeof DEFAULT_GUILD_PACKAGES;
      settings?: typeof DEFAULT_STOREFRONT_SETTINGS;
    }>('storefront.get', {});
    return {
      packages: data.packages && data.packages.length > 0 ? data.packages : DEFAULT_GUILD_PACKAGES,
      settings: data.settings || DEFAULT_STOREFRONT_SETTINGS,
      providerUrl: OFFICIAL_PROVIDER_URL,
      d1Connected: true,
    };
  } catch {
    return {
      packages: DEFAULT_GUILD_PACKAGES,
      settings: DEFAULT_STOREFRONT_SETTINGS,
      providerUrl: OFFICIAL_PROVIDER_URL,
      d1Connected: false,
    };
  }
}

export async function listPublicPackages() {
  const catalog = await getStorefrontCatalog();
  return catalog.packages;
}
