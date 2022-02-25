import { Main } from "./lib/ui";
import { initialize } from "./lib/api";
import * as React from "react";
import { render } from "react-dom";

const { sandboxRemote } = initialize(
  document.querySelector<HTMLIFrameElement>("#sandbox")!.contentWindow!
);

render(
  <Main
    tabId={chrome.devtools.inspectedWindow.tabId}
    sandboxRemote={sandboxRemote}
  />,
  document.querySelector("#container")
);
