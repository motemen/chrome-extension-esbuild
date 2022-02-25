import browser from "webextension-polyfill";
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
  // XXX: use selection text?
  const [{ result }] = await browser.scripting.executeScript({
    target: {
      tabId,
    },
    func: () => ({
      source: document.documentElement.textContent,
      location: location.href,
      contentType: document.contentType,
    }),
  });
  return result as DocumentInfo;
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

  const handleRun = async (docInfo: DocumentInfo) => {
    try {
      setRunning(true);
      const u = await runBuild(sandboxRemote, docInfo, {
        minify,
        sourcemap: inlineSourcemap && "inline",
      });
      setResultURL(u);
    } catch (err: any) {
      console.error(err);
      logContentScript(
        tabId,
        "error",
        `${err}${"stack" in err ? "\n" + err.stack : ""}`
      );
    } finally {
      logContentScript(tabId, "info", "build finished");
      setRunning(false);
    }
  };

  const handleOpenResult = (url: string) => {
    console.log(url);
    browser.tabs.create({ url });
  };

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
          <button disabled={running} onClick={() => handleRun(docInfo)}>
            Build
          </button>
        </div>
        <p>
          {resultURL && (
            <a
              href={resultURL}
              onClick={(ev) => {
                ev.preventDefault();
                handleOpenResult(resultURL);
              }}
            >
              Open Result
            </a>
          )}
        </p>
      </div>
    </>
  );
};
