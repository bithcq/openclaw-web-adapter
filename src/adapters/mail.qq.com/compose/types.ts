export type MailQqComposeDraftSnapshot = {
  title: string;
  url: string;
  frameUrl: string;
  recipients: string[];
  subject: string;
  bodyText: string;
  composerVisible: boolean;
  sendEnabled: boolean;
  health: {
    hasComposer: boolean;
    isLoggedIn: boolean;
    domHealthy: boolean;
    warning?: string;
  };
};

export type MailQqComposeActionArgs = {
  to?: string | string[];
  subject?: string;
  text?: string;
};

export type MailQqComposeActionResult = {
  ok: boolean;
  confirmed: boolean;
  frameUrl: string;
  recipientCount?: number;
  error?: string;
};
