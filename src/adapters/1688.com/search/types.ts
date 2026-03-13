export type Ali1688SearchItemSnapshot = {
  itemId: string;
  productUrl: string;
  title: string;
  priceText?: string;
  soldText?: string;
  companyName?: string;
  tags: string[];
};

export type Ali1688SearchPageHealthSnapshot = {
  hasResultList: boolean;
  isLoggedIn: boolean;
  domHealthy: boolean;
  warning?: string;
};

export type Ali1688SearchPageSnapshot = {
  title: string;
  url: string;
  frameUrl: string;
  keyword?: string;
  items: Ali1688SearchItemSnapshot[];
  health: Ali1688SearchPageHealthSnapshot;
};

export type Ali1688SearchActionArgs = {
  itemId?: string;
  productUrl?: string;
};

export type Ali1688SearchActionResult = {
  ok: boolean;
  confirmed: boolean;
  pageUrl: string;
  productUrl?: string;
  error?: string;
};
