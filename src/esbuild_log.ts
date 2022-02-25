// This file is a content script, whose name is visible to users
// in devtools console via sourcemap.

import { isLogMessage } from "./lib/utils";

chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
  if (isLogMessage(request)) {
    console[request.level](`[esbuild] ${request.message}`);
  } else {
    console.debug("[esbuild] unknown message", request);
  }
});
