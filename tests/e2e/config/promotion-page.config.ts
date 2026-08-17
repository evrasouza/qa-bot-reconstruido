export type PromotionFlowType = 'direct-offers' | 'card-selection';

export type PromotionExecutionConfig = {
  baseURL: string;
  locale: string;
  year: string;
  vehicleType: string;
  promoFlowType: PromotionFlowType;
  searchText: string;
  menuContainerSelector: string;
  menuLabel: RegExp;
};

export function getPromotionExecutionConfig(): PromotionExecutionConfig {
  const baseURL = process.env.BASE_URL || 'https://www.brplynx.com';
  const locale = process.env.LOCALE || 'ca/en';
  const year = process.env.PROMO_YEAR || '2027';
  const vehicleType = process.env.PROMO_VEHICLE_TYPE || 'snowmobiles';
  const promoFlowType =
    (process.env.PROMO_FLOW_TYPE as PromotionFlowType) || 'direct-offers';
  const searchText = process.env.PROMO_SEARCH_TEXT || 'Montreal';

  return {
    baseURL,
    locale,
    year,
    vehicleType,
    promoFlowType,
    searchText,
    menuContainerSelector: '.navbar-nav',
    menuLabel: /promotions/i,
  };
}