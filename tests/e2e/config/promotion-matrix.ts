export type PromotionFlowType = 'direct-offers' | 'card-selection';

export type PromoConfig = {
  name: string;
  baseURL: string;
  locale: string;
  year: string;
  vehicleType: string;
  promoFlowType: PromotionFlowType;
  searchText: string;
  vehicleModelName: string;
  offerDetailsModelName: string;
  setLocationSlug: string;
  promotionCardName?: string;
  dictionaryBaseURL?: string;
  promotionBaseSlug: string;
};

const brands = {
  seaDoo: 'https://sea-doo.brp.com',
  canAmOffRoad: 'https://can-am.brp.com/off-road',
  canAmOnRoad: 'https://can-am.brp.com/on-road',
  lynx: 'https://www.brplynx.com',
  skiDoo: 'https://ski-doo.brp.com',
};

const setLocationSlugByLocale: Record<string, string> = {
  'ca/en': 'set-your-location',
  'us/en': 'set-your-location',
  'us/es': 'set-your-location',
  'ca/fr': 'choisir-un-emplacement',
};

function slugFor(locale: string): string {
  return setLocationSlugByLocale[locale] || 'set-your-location';
}

function promo(config: Omit<PromoConfig, 'setLocationSlug'>): PromoConfig {
  return {
    ...config,
    setLocationSlug: slugFor(config.locale),
  };
}

export const promotionMatrix: PromoConfig[] = [
  promo({
    name: 'Sea-Doo CA EN 2026 Spark',
    baseURL: brands.seaDoo,
    locale: 'ca/en',
    year: '2026',
    vehicleType: 'personal-watercraft',
    promoFlowType: 'card-selection',
    searchText: 'Montreal',
    promotionCardName: 'Personal Watercraft',
    vehicleModelName: 'Spark',
    offerDetailsModelName: 'Spark for 2',
    promotionBaseSlug: 'promotions'
  }),

  promo({
    name: 'Sea-Doo CA EN 2026 Switch Fish',
    baseURL: brands.seaDoo,
    locale: 'ca/en',
    year: '2026',
    vehicleType: 'pontoons',
    promoFlowType: 'card-selection',
    searchText: 'Montreal',
    promotionCardName: 'Pontoons',
    vehicleModelName: 'Switch Fish',
    offerDetailsModelName: 'Switch Fish 21 - 300 hp',
    promotionBaseSlug: 'promotions'
  }),

  promo({
    name: 'Sea-Doo CA FR 2026 Switch Sport',
    baseURL: brands.seaDoo,
    locale: 'ca/fr',
    year: '2026',
    vehicleType: 'pontoons',
    promoFlowType: 'card-selection',
    searchText: 'Bridle Path',
    promotionCardName: 'Pontons',
    vehicleModelName: 'Switch Sport',
    offerDetailsModelName: 'Switch Sport Compact - 170 hp',
    promotionBaseSlug: 'promotions'
  }),

  // promo({
  //   name: 'Can-Am Off-Road CA EN 2026 Outlander PRO',
  //   baseURL: brands.canAmOffRoad,
  //   locale: 'ca/en',
  //   year: '2026',
  //   dictionaryBaseURL: 'https://can-am.brp.com',
  //   vehicleType: 'atv',
  //   promoFlowType: 'card-selection',
  //   searchText: 'Montreal',
  //   promotionCardName: 'ATV',
  //   vehicleModelName: 'Outlander PRO',
  //   offerDetailsModelName: 'Outlander PRO Hunting Edition HD7',
  // }),

  // promo({
  //   name: 'Can-Am Off-Road CA EN 2026 Maverick X3',
  //   baseURL: brands.canAmOffRoad,
  //   locale: 'ca/en',
  //   year: '2026',
  //   dictionaryBaseURL: 'https://can-am.brp.com',
  //   vehicleType: 'sxs',
  //   promoFlowType: 'card-selection',
  //   searchText: 'Montreal',
  //   promotionCardName: 'SXS',
  //   vehicleModelName: 'Maverick X3',
  //   offerDetailsModelName: 'Maverick X3 X Turbo',
  // }),

  //   promo({
  //   name: 'Can-Am Off-Road US EN 2026 Outlander PRO',
  //   baseURL: brands.canAmOffRoad,
  //   locale: 'us/en',
  //   year: '2026',
  //   dictionaryBaseURL: 'https://can-am.brp.com',
  //   vehicleType: 'atv',
  //   promoFlowType: 'card-selection',
  //   searchText: 'California',
  //   promotionCardName: 'ATV',
  //   vehicleModelName: 'Outlander PRO',
  //   offerDetailsModelName: 'Outlander PRO Hunting Edition HD7',
  // }),

  // promo({
  //   name: 'Can-Am Off-Road US EN 2026 Maverick X3',
  //   baseURL: brands.canAmOffRoad,
  //   locale: 'us/en',
  //   year: '2026',
  //   dictionaryBaseURL: 'https://can-am.brp.com',
  //   vehicleType: 'sxs',
  //   promoFlowType: 'card-selection',
  //   searchText: 'New York',
  //   promotionCardName: 'SXS',
  //   vehicleModelName: 'Maverick X3',
  //   offerDetailsModelName: 'Maverick X3 X Turbo',
  // }),

  //   promo({
  //   name: 'Can-Am Off-Road US ES 2026 Outlander PRO',
  //   baseURL: brands.canAmOffRoad,
  //   locale: 'us/es',
  //   year: '2026',
  //   dictionaryBaseURL: 'https://can-am.brp.com',
  //   vehicleType: 'atv',
  //   promoFlowType: 'card-selection',
  //   searchText: 'California',
  //   promotionCardName: 'ATV',
  //   vehicleModelName: 'Outlander PRO',
  //   offerDetailsModelName: 'Outlander PRO Hunting Edition HD7',
  //   promotionBaseSlug: 'promociones'
  // }),

  // promo({
  //   name: 'Can-Am Off-Road US ES 2026 Maverick X3',
  //   baseURL: brands.canAmOffRoad,
  //   locale: 'us/es',
  //   year: '2026',
  //   dictionaryBaseURL: 'https://can-am.brp.com',
  //   vehicleType: 'sxs',
  //   promoFlowType: 'card-selection',
  //   searchText: 'New York',
  //   promotionCardName: 'SXS',
  //   vehicleModelName: 'Maverick X3',
  //   offerDetailsModelName: 'Maverick X3 X Turbo',
  // }),

  // promo({
  //   name: 'Can-Am On-Road CA EN 2026 Can-Am Pulse',
  //   baseURL: brands.canAmOnRoad,
  //   locale: 'ca/en',
  //   year: '2026',
  //   dictionaryBaseURL: 'https://can-am.brp.com',
  //   vehicleType: 'motorcycles',
  //   promoFlowType: 'card-selection',
  //   searchText: 'Montreal',
  //   promotionCardName: 'Motorcycle',
  //   vehicleModelName: 'Can-Am Pulse',
  //   offerDetailsModelName: 'PULSE',
  // }),

  promo({
    name: 'BRP Lynx CA EN 2027 SHREDDER RE',
    baseURL: brands.lynx,
    locale: 'ca/en',
    year: '2027',
    vehicleType: 'snowmobiles',
    promoFlowType: 'direct-offers',
    searchText: 'Montreal',
    vehicleModelName: 'SHREDDER',
    offerDetailsModelName: 'SHREDDER RE',
    promotionBaseSlug: 'promotions'
  }),

  promo({
    name: 'BRP Lynx CA FR 2027 XTERRAIN RE',
    baseURL: brands.lynx,
    locale: 'ca/fr',
    year: '2027',
    vehicleType: 'snowmobiles',
    promoFlowType: 'direct-offers',
    searchText: 'Montreal',
    vehicleModelName: 'XTERRAIN',
    offerDetailsModelName: 'XTERRAIN RE',
    promotionBaseSlug: 'promotions'
  }),

  promo({
    name: 'Ski-Doo CA EN 2027 MXZ X',
    baseURL: brands.skiDoo,
    locale: 'ca/en',
    year: '2027',
    vehicleType: 'snowmobiles',
    promoFlowType: 'direct-offers',
    searchText: 'Ontario',
    vehicleModelName: 'MXZ',
    offerDetailsModelName: 'MXZ X',
    promotionBaseSlug: 'promotions'
  }),

  promo({
    name: 'Ski-Doo CA FR 2027 Summit HCE',
    baseURL: brands.skiDoo,
    locale: 'ca/fr',
    year: '2027',
    vehicleType: 'snowmobiles',
    promoFlowType: 'direct-offers',
    searchText: 'Shawinigan',
    vehicleModelName: 'SUMMIT',
    offerDetailsModelName: 'Summit HCE',
    promotionBaseSlug: 'promotions'
  }),
];