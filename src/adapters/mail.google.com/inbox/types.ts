export type MailGoogleInboxItemSnapshot = {
  itemId: string;
  threadId: string;
  legacyThreadId?: string;
  sender: string;
  senderEmail?: string;
  subject: string;
  snippet?: string;
  timeText: string;
  unread: boolean;
  starred: boolean;
  important: boolean;
  hasAttachment: boolean;
};

export type MailGoogleInboxFolderSnapshot = {
  folderId: string;
  folderName: string;
  unreadCount?: number;
  visibleItemCount: number;
};

export type MailGoogleInboxPaginationSnapshot = {
  visibleStart?: number;
  visibleEnd?: number;
  totalItems?: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type MailGoogleInboxPageHealthSnapshot = {
  hasMailList: boolean;
  hasToolbar: boolean;
  isLoggedIn: boolean;
  domHealthy: boolean;
  warning?: string;
};

export type MailGoogleInboxPageSnapshot = {
  title: string;
  url: string;
  frameUrl: string;
  folder: MailGoogleInboxFolderSnapshot;
  pagination: MailGoogleInboxPaginationSnapshot;
  items: MailGoogleInboxItemSnapshot[];
  health: MailGoogleInboxPageHealthSnapshot;
};

export type MailGoogleInboxClickItemArgs = {
  itemId?: string;
  threadId?: string;
  legacyThreadId?: string;
  sender?: string;
  subject?: string;
};

export type MailGoogleInboxActionResult = {
  ok: boolean;
  confirmed: boolean;
  pageUrl: string;
  threadId?: string;
  firstItemId?: string;
  error?: string;
};
