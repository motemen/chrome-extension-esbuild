import * as esbuild from "esbuild-wasm";

export function guessLoader({
  location,
  contentType,
}: {
  location: string;
  contentType: string;
}): esbuild.Loader | null {
  const ct = contentType.replace(/\s*;.*$/, "");
  switch (ct) {
    case "application/javascript":
    case "text/javascript":
      return "js";

    case "text/css":
      return "css";

    default:
      return null;
  }
}

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
  chrome.tabs?.sendMessage(tabId, <LogMessage>{ type: "log", level, message });
}
