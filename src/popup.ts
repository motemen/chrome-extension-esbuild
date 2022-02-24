import type { Interface as SandboxInterface } from "./sandbox";
import * as Comlink from "comlink";

export type Interface = typeof API;

const sandbox =
  document.querySelector<HTMLIFrameElement>("#sandbox")!.contentWindow!;

const sandboxRemote = Comlink.wrap<SandboxInterface>(
  Comlink.windowEndpoint(sandbox)
);

const fetchResource = async (url: string) => {
  console.log("fetchResource", { url });

  const resp = await fetch(url, {
    credentials: "include",
  });
  // TODO: check resp.ok
  const contents = await resp.text();
  return {
    contents,
    contentType: resp.headers.get("Content-Type") ?? "",
  };
};

const run = async () => {
  const [tab] = await chrome.tabs.query({ active: true });

  try {
    const { source, location, contentType } = await new Promise(
      (resolve, reject) => {
        chrome.scripting.executeScript(
          {
            target: {
              tabId: tab.id!,
            },
            func: () => ({
              source: document.documentElement.textContent,
              location: location.href.toString(),
              contentType: document.contentType,
            }),
          },
          ([{ result }]) => {
            if (!result) {
              reject(new Error("execution failed"));
            } else {
              resolve(
                result as {
                  source: string;
                  location: string;
                  contentType: string;
                }
              );
            }
          }
        );
      }
    );

    const result = await sandboxRemote.build({
      source,
      location,
      contentType,
    });
    console.log({ result });
    console.log(result.outputFiles![0].text);
  } catch (err) {
    console.error(err);
  }
};

document.querySelector("#run")?.addEventListener("click", run);

const API = { fetchResource };

Comlink.expose(API, Comlink.windowEndpoint(sandbox));

addEventListener("message", (ev) => {
  console.debug("[panel] onmessage", ev);
});
