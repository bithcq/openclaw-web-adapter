export type Ali1688ChatSelectorConfig = {
  pageUrlPattern?: string;
  frameUrlPattern?: string;
  conversationItems: string[];
  conversationTitle: string[];
  conversationUnread: string[];
  messageItems: string[];
  messageText: string[];
  messageAuthor?: string[];
  messageTimestamp?: string[];
  messageIncomingMarker?: string[];
  messageIdAttribute?: string;
  messageTimestampAttribute?: string;
  input: string[];
  sendButton: string[];
};

export type Ali1688ChatMessageAttachment = {
  id: string;
  kind: "image" | "file" | "other";
  url?: string;
  localPath?: string;
  mimeType?: string;
  name?: string;
  previewText?: string;
};

export type Ali1688ChatConversationSnapshot = {
  conversationId: string;
  customerId: string;
  customerName: string;
  unread: boolean;
  active: boolean;
};

export type Ali1688ChatMessageSnapshot = {
  messageId: string;
  text: string;
  rawText: string;
  timestamp: number;
  timestampText: string;
  author: string;
  isIncoming: boolean;
  isSystem: boolean;
  messageType: "text" | "image" | "file" | "system" | "mixed";
  attachments: Ali1688ChatMessageAttachment[];
};

export type Ali1688ChatPageHealthSnapshot = {
  hasConversationList: boolean;
  hasMessageList: boolean;
  hasComposer: boolean;
  isLoggedIn: boolean;
  domHealthy: boolean;
  warning?: string;
};

export type Ali1688ChatPageSnapshot = {
  title: string;
  url: string;
  frameUrl: string;
  activeConversationId: string | null;
  conversations: Ali1688ChatConversationSnapshot[];
  messages: Ali1688ChatMessageSnapshot[];
  health: Ali1688ChatPageHealthSnapshot;
};

export type Ali1688ChatOutboundResult = {
  ok: boolean;
  confirmed: boolean;
  attempt: number;
  responseText: string;
};
