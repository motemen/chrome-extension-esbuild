import { Main } from "./lib/ui";
import { initialize } from "./lib/api";
import * as React from "react";
import { render } from "react-dom";
import useSWR from "swr";

const Wrapper = () => {
  const { data: tab } = useSWR("tab", async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    return tab;
  });

  if (tab && tab.id) {
    const { sandboxRemote } = initialize(
      document.querySelector<HTMLIFrameElement>("#sandbox")!.contentWindow!,
      tab.id
    );

    return (
      <div style={{ width: 200 }}>
        <Main tabId={tab.id} sandboxRemote={sandboxRemote} />
      </div>
    );
  } else {
    return <>Loading</>;
  }
};

render(<Wrapper />, document.querySelector("#container"));
