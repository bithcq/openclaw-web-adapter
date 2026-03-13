export type Ali1688DetailPageHealthSnapshot = {
  hasTitle: boolean;
  hasPrice: boolean;
  isLoggedIn: boolean;
  domHealthy: boolean;
  warning?: string;
};

export type Ali1688DetailPageSnapshot = {
  title: string;
  url: string;
  frameUrl: string;
  productTitle: string;
  companyName?: string;
  priceText?: string;
  soldText?: string;
  skuHighlights: string[];
  attributes: Record<string, string>;
  imageUrls: string[];
  health: Ali1688DetailPageHealthSnapshot;
};
