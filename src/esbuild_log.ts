// This file is a content script, whose name is visible to users
// in devtools console via sourcemap.

import browser from "webextension-polyfill";
import { isLogMessage } from "./lib/utils";

browser.runtime.onMessage.addListener((request) => {
  if (isLogMessage(request)) {
    console[request.level](`[esbuild] ${request.message}`);
  } else {
    console.debug("[esbuild] unknown message", request);
  }
});
