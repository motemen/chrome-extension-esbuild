import { Main } from "./lib/ui";
import { initialize } from "./lib/api";
import * as React from "react";
import { render } from "react-dom";

const tabId = chrome.devtools.inspectedWindow.tabId;

const { sandboxRemote } = initialize(
  document.querySelector<HTMLIFrameElement>("#sandbox")!.contentWindow!,
  tabId
);

render(
  <Main tabId={tabId} sandboxRemote={sandboxRemote} />,
  document.querySelector("#container")
);
