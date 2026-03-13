export type MailGoogleComposeDraftSnapshot = {
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

export type MailGoogleComposeActionArgs = {
  to?: string | string[];
  subject?: string;
  text?: string;
};

export type MailGoogleComposeActionResult = {
  ok: boolean;
  confirmed: boolean;
  pageUrl: string;
  recipientCount?: number;
  error?: string;
};
