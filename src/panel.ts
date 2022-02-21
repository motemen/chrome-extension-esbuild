import { build } from "esbuild-wasm";
import type { BuildRequestPayload, FetchResult } from "./sandbox";

export type PanelRequest = FetchRequest;

export interface FetchRequest {
  id: string;
  type: "fetch";
  url: string;
}

const sandbox =
  document.querySelector<HTMLIFrameElement>("#sandbox")!.contentWindow!;

function isFetchRequest(data: any): data is FetchRequest {
  return data.type === "fetch" && typeof data.url === "string";
}

addEventListener("message", async (ev) => {
  console.log(ev.data);

  if (isFetchRequest(ev.data)) {
    const resp = await fetch(ev.data.url, {
      credentials: "include",
    });
    // TODO: check resp.ok
    const contents = await resp.text();
    sandbox.postMessage(
      {
        type: "fetchResult",
        contents,
        contentType: resp.headers.get("Content-Type"),
        id: ev.data.id,
      } as FetchResult,
      "*"
    );
  }
});

const run = async () => {
  try {
    const { source, location, contentType } = await new Promise(
      (resolve, reject) => {
        chrome.devtools.inspectedWindow.eval(
          `({
						source: document.documentElement.textContent,
						location: location.href.toString(),
						contentType: document.contentType
					})`,
          {},
          (result, exceptionInfo) => {
            if (exceptionInfo) {
              reject(exceptionInfo);
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

    console.log({ source, location, contentType });

    const buildRequest: BuildRequestPayload = {
      type: "buildRequest",
      source,
      location,
      contentType,
    };
    sandbox.postMessage(buildRequest, "*");
  } catch (err) {
    console.error(err);
  }
};

document.querySelector("#run")?.addEventListener("click", run);
