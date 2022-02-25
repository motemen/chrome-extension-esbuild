import browser from "webextension-polyfill";

export interface LogMessage {
  type: "log";
  level: "error" | "info" | "debug";
  message: string;
}

export function isLogMessage(obj: any): obj is LogMessage {
  return obj.type === "log" && "level" in obj && "message" in obj;
}

export function logContentScript(
  tabId: number,
  level: "error" | "info" | "debug",
  message: string
) {
  browser.tabs?.sendMessage(tabId, <LogMessage>{ type: "log", level, message });
}
