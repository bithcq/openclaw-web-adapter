import type { Ali1688ChatSelectorConfig } from "./types.js";

export const DEFAULT_ALI1688_CHAT_SELECTORS: Ali1688ChatSelectorConfig = {
  pageUrlPattern: "def_cbu_web_im",
  frameUrlPattern: "def_cbu_web_im_core",
  conversationItems: [".conversation-list .conversation-item", ".conversation-item"],
  conversationTitle: [".conversation .name", ".name"],
  conversationUnread: [".unread-badge", ".badge", "[data-unread='true']"],
  messageItems: [".message-list .message-item", ".message-item"],
  messageText: [".content pre.edit", ".content .edit", ".content"],
  messageAuthor: [".nick", ".first-line .nick"],
  messageTimestamp: [".time", ".first-line .time"],
  messageIncomingMarker: [".message-item:not(.self)"],
  input: [
    ".ww_input pre.edit[contenteditable='true']",
    ".text-panel pre.edit[contenteditable='true']",
    "textarea",
    "[contenteditable='true']",
  ],
  sendButton: [".send-btn", "button.send-btn", "[data-role='send']"],
};
