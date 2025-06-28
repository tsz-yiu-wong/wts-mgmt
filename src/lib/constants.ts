export const WHATSAPP_WEB_URL = "https://web.whatsapp.com/";

export const ACCOUNT_STATUS = {
  ONLINE: "online",
  OFFLINE: "offline",
  CONNECTING: "connecting",
  ERROR: "error",
} as const;

export const WINDOW_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  MINIMIZED: "minimized",
  CLOSED: "closed",
} as const;

export type AccountStatus = typeof ACCOUNT_STATUS[keyof typeof ACCOUNT_STATUS];
export type WindowStatus = typeof WINDOW_STATUS[keyof typeof WINDOW_STATUS]; 