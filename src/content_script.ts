import { handleLogRequest } from "./lib/utils";

chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
  if (!handleLogRequest(request)) {
    console.debug("[esbuild] unknown message", request);
  }
});
