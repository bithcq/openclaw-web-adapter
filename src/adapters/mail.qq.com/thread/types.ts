export type MailQqThreadPageHealthSnapshot = {
  hasSubject: boolean;
  hasBody: boolean;
  isLoggedIn: boolean;
  domHealthy: boolean;
  warning?: string;
};

export type MailQqThreadPageSnapshot = {
  title: string;
  url: string;
  frameUrl: string;
  subject: string;
  sender: string;
  senderEmail?: string;
  recipients: string[];
  timeText: string;
  bodyText: string;
  quickReplyAvailable: boolean;
  health: MailQqThreadPageHealthSnapshot;
};

export type MailQqThreadActionArgs = {
  text?: string;
};

export type MailQqThreadActionResult = {
  ok: boolean;
  confirmed: boolean;
  frameUrl: string;
  error?: string;
};
