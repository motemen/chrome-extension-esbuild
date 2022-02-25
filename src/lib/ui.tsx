import type { API as SandboxInterface, BuildOptions } from "../sandbox";
import * as Comlink from "comlink";
import * as React from "react";
import { useState } from "react";
import useSWR from "swr";
import { Base64 } from "js-base64";
import { logContentScript } from "./utils";

interface DocumentInfo {
  source: string;
  location: string;
  contentType: string;
}

const getDocumentInfo = async (tabId: number): Promise<DocumentInfo> => {
  return new Promise((resolve, reject) => {
    // XXX: use selection text?
    chrome.scripting.executeScript(
      {
        target: {
          tabId,
        },
        func: () => ({
          source: document.documentElement.textContent,
          location: location.href,
          contentType: document.contentType,
        }),
      },
      ([{ result }]) => {
        if (!result) {
          reject(new Error("executeScript failed"));
        } else {
          resolve(result as DocumentInfo);
        }
      }
    );
  });
};

const runBuild = async (
  sandboxRemote: Comlink.Remote<typeof SandboxInterface>,
  { source, location, contentType }: DocumentInfo,
  buildOptions: BuildOptions
) => {
  const result = await sandboxRemote.build({
    source,
    location,
    contentType,
    options: buildOptions,
  });

  if (result.errors.length > 0) {
    throw new Error(result.errors.map((e) => e.text).join("\n"));
  }
  if ((result.outputFiles?.length ?? 0) < 1) {
    throw new Error("esbuild emitted no result");
  }

  const url = `data:${contentType};base64,${Base64.fromUint8Array(
    result.outputFiles![0].contents
  )}`;

  return url;

  // XXX: with createObjectURL users cannot download file.
  /*
    const blob = new Blob([result.outputFiles![0].text], {
      type: "text/javascript",
    });
    const url = URL.createObjectURL(blob);
    chrome.tabs.create({ url });
  */
};

addEventListener("message", (ev) => {
  console.debug("[ui] onmessage", ev);
});

interface Props {
  sandboxRemote: Comlink.Remote<typeof SandboxInterface>;
  tabId: number;
}

export const Main = ({ sandboxRemote, tabId }: Props) => {
  const { data: docInfo, error } = useSWR("docInfo", async () => {
    return await getDocumentInfo(tabId);
  });

  const [minify, setMinify] = useState(true);
  const [inlineSourcemap, setInlineSourcemap] = useState(true);
  const [running, setRunning] = useState(false);
  const [resultURL, setResultURL] = useState<string | null>(null);

  if (!docInfo && !error) {
    return <></>;
  }
  if (!docInfo) {
    return <>{`Error: ${error}`}</>;
  }

  return (
    <>
      <div style={{ padding: 8 }}>
        <label>
          <input
            type="checkbox"
            checked={minify}
            onChange={(ev) => setMinify(ev.target.checked)}
          />
          Minify
        </label>
        <label>
          <input
            type="checkbox"
            checked={inlineSourcemap}
            onChange={(ev) => setInlineSourcemap(ev.target.checked)}
          />
          Sourcemap
        </label>
        <div style={{ marginTop: 16 }}>
          <button
            disabled={running}
            onClick={async () => {
              try {
                setRunning(true);
                const u = await runBuild(sandboxRemote, docInfo, {
                  minify,
                  sourcemap: inlineSourcemap && "inline",
                });
                setResultURL(u);
              } catch (err) {
                // appendLog(`${err}`);
              } finally {
                logContentScript(tabId, "info", "finished");
                setRunning(false);
              }
            }}
          >
            Build
          </button>
        </div>
        <p>
          {resultURL && (
            <a target="_blank" href={resultURL}>
              Open Result
            </a>
          )}
        </p>
      </div>
    </>
  );
};
