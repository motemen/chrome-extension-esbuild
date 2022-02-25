import { isLogMessage } from "./lib/utils";

chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
  if (isLogMessage(request)) {
    console[request.level](`[esbuild] ${request.message}`);
  } else {
    console.debug("[esbuild] unknown message", request);
  }
});
