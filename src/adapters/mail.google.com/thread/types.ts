export type MailGoogleThreadMessageSnapshot = {
  messageId: string;
  legacyMessageId?: string;
  senderName: string;
  senderEmail?: string;
  timeText: string;
  bodyText: string;
  attachmentNames: string[];
};

export type MailGoogleThreadPageHealthSnapshot = {
  hasThreadSubject: boolean;
  hasMessages: boolean;
  isLoggedIn: boolean;
  domHealthy: boolean;
  warning?: string;
};

export type MailGoogleThreadPageSnapshot = {
  title: string;
  url: string;
  frameUrl: string;
  subject: string;
  messages: MailGoogleThreadMessageSnapshot[];
  replyAvailable: boolean;
  composerVisible: boolean;
  health: MailGoogleThreadPageHealthSnapshot;
};

export type MailGoogleThreadActionArgs = {
  text?: string;
};

export type MailGoogleThreadActionResult = {
  ok: boolean;
  confirmed: boolean;
  pageUrl: string;
  error?: string;
};
