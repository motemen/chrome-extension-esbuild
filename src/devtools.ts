import browser from "webextension-polyfill";
browser.devtools.panels.create("esbuild", "", "html/devtools_panel.html");
