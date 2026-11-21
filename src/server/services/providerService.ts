export const OFFICIAL_PROVIDER_URL = 'https://www.ffglory.pro/';

export function isOfficialProviderUrl(url: string): boolean {
  const trimmed = url.trim();
  return [
    'https://www.ffglory.pro/',
    'https://www.ffglory.pro',
    'https://ffglory.pro/',
    'https://ffglory.pro',
  ].includes(trimmed);
}

export function isValidProofUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  if (trimmed.length > 400) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export const DEFAULT_STOREFRONT_SETTINGS = {
  providerName: 'FFGlory',
  providerHomepage: OFFICIAL_PROVIDER_URL,
  providerTrackingUrl: OFFICIAL_PROVIDER_URL,
  supportedHandoffMethod: 'Second browser tab handoff + manual transaction & Group ID verification',
  providerTransactionFieldsNote:
    'Fields submitted on FFGlory: Transaction ID, Credits requested, Amount to pay, Binance Pay ID, optional Binance Order ID.',
  currency: 'USD',
  serviceInstructions:
    '1. Complete payment on the official FFGlory website (https://www.ffglory.pro/) and record your Transaction ID on Crazy.Org All in one.\n2. Once your FFGlory credits are active, open the FFGlory service panel in your browser tab.\n3. Select your exact Free Fire server Region and enter your numeric Guild/Clan ID.\n4. Click Start Group, carefully review Guild ID, Region, and credit cost, then click Launch Group.\n5. Open My Active Groups on FFGlory, wait at least 15 minutes to verify status and Glory gain, and submit your Provider Group ID back on Crazy.Org All in one.',
  paymentInstructions:
    '1. Click "CONTINUE TO OFFICIAL PROVIDER" to open https://www.ffglory.pro/ in a second browser tab while keeping Crazy.Org All in one open.\n2. Register or sign in to your own FFGlory account.\n3. Open the Buy Credits / Payment section, choose the credit amount needed for your selected package, and note the displayed Binance Pay ID and amount.\n4. Send the payment and submit your Transaction ID, Credits requested, Amount to pay, Binance Pay ID, and optional Binance Order ID on FFGlory, then click "I\'ve Sent the Payment".\n5. FFGlory payments require manual admin confirmation (never instant). Return to Crazy.Org All in one to submit your provider payment references for tracking and verification.',
  importantWarnings:
    'Third-Party Notice: Crazy.Org All in one and FFGlory are independent third-party services and are NOT affiliated with, endorsed by, or sponsored by Garena International.\nAccount Policy Risk: Automated bot/guild glory services carry third-party enforcement and game policy risks. No service can guarantee 100% ban-safety.\nCredential Security: We NEVER request your Free Fire password, OTP, Facebook login, Google login, or session token. Only provide your public Guild ID and contact number.\nManual Verification: Do not close your order tab until your Order Number and Private Tracking Code are safely saved.',
  refundConditions:
    'FFGlory supports refund checks primarily when a launched group runs continuously for more than 30 minutes with zero Glory progress recorded.\nNot every failure qualifies for a refund (for example: wrong Guild ID entered, wrong region selected, full/closed guild settings, or user-cancelled runs).\nProvider vs Store Distinction: Approved FFGlory refunds are normally issued by FFGlory as Provider Wallet Credits on your FFGlory account, not automatic cash refunds. Cash or Store Credit refunds from Crazy.Org All in one are evaluated separately by an Admin after verifying the provider outcome.',
  supportWhatsapp: '+880-000-000000',
  supportEmail: 'support@crazy-org.local',
  supportHours: 'Daily 10:00 – 23:00 UTC',
  updatedAt: new Date().toISOString(),
};
