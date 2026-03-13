export type Ali1688FactorySearchItemSnapshot = {
  itemId: string;
  companyName: string;
  city?: string;
  yearsText?: string;
  businessTags: string[];
  serviceTags: string[];
  detailUrl?: string;
  supportsBatchInquiry: boolean;
};

export type Ali1688FactorySearchPageHealthSnapshot = {
  hasFactoryCards: boolean;
  isLoggedIn: boolean;
  domHealthy: boolean;
  warning?: string;
};

export type Ali1688FactorySearchPaginationSnapshot = {
  currentPage?: number;
  totalPages?: number;
};

export type Ali1688FactorySearchPageSnapshot = {
  title: string;
  url: string;
  frameUrl: string;
  keyword?: string;
  items: Ali1688FactorySearchItemSnapshot[];
  pagination?: Ali1688FactorySearchPaginationSnapshot;
  health: Ali1688FactorySearchPageHealthSnapshot;
};

export type Ali1688FactorySearchActionArgs = {
  itemId?: string;
  companyName?: string;
  detailUrl?: string;
  keyword?: string;
};

export type Ali1688FactorySearchActionResult = {
  ok: boolean;
  confirmed: boolean;
  pageUrl: string;
  detailUrl?: string;
  itemId?: string;
  error?: string;
};
