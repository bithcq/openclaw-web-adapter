export type MailQqInboxItemSnapshot = {
  itemId: string;
  mailId: string;
  sender: string;
  senderEmail?: string;
  subject: string;
  previewText?: string;
  timeText: string;
  unread: boolean;
  hasAttachment: boolean;
  isAdvertisement: boolean;
};

export type MailQqInboxFolderSnapshot = {
  folderId: string | null;
  folderName: string;
  totalCount?: number;
  unreadCount?: number;
  starredCount?: number;
};

export type MailQqInboxPaginationSnapshot = {
  currentPage: number;
  totalPages?: number;
  hasNextPage: boolean;
  nextPageUrl?: string;
};

export type MailQqInboxPageHealthSnapshot = {
  hasMailList: boolean;
  hasToolbar: boolean;
  isLoggedIn: boolean;
  domHealthy: boolean;
  warning?: string;
};

export type MailQqInboxPageSnapshot = {
  title: string;
  url: string;
  frameUrl: string;
  folder: MailQqInboxFolderSnapshot;
  pagination: MailQqInboxPaginationSnapshot;
  items: MailQqInboxItemSnapshot[];
  health: MailQqInboxPageHealthSnapshot;
};

export type MailQqInboxClickItemArgs = {
  itemId?: string;
  mailId?: string;
  sender?: string;
  subject?: string;
};

export type MailQqInboxActionResult = {
  ok: boolean;
  confirmed: boolean;
  frameUrl: string;
  mailId?: string;
  currentPage?: number;
  nextPage?: number;
  error?: string;
};
