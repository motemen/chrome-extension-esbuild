import type { Interface as SandboxInterface, BuildOptions } from "./sandbox";
import * as Comlink from "comlink";
import * as React from "react";
import { useState, useEffect } from "react";
import { render } from "react-dom";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import useSWR from "swr";

export type Interface = typeof API;

const sandbox =
  document.querySelector<HTMLIFrameElement>("#sandbox")!.contentWindow!;

const sandboxRemote = Comlink.wrap<SandboxInterface>(
  Comlink.windowEndpoint(sandbox)
);

let maybeAppendLog: (log: string) => void | undefined;

const fetchResource = async (url: string) => {
  maybeAppendLog?.call(null, `--> ${url}`);

  const resp = await fetch(url, {
    credentials: "include",
  });
  if (!resp.ok) {
    throw new Error(`GET ${url}: ${resp.status} ${resp.statusText}`);
  }

  const contents = await resp.text();
  return {
    contents,
    contentType: resp.headers.get("Content-Type") ?? "",
  };
};

interface DocumentInfo {
  source: string;
  location: string;
  contentType: string;
}

const getDocumentInfo = async (tab: chrome.tabs.Tab): Promise<DocumentInfo> => {
  return new Promise((resolve, reject) => {
    // XXX: use selection text?
    chrome.scripting.executeScript(
      {
        target: {
          tabId: tab.id!,
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

  const url = `data:${contentType};base64,${btoa(result.outputFiles![0].text)}`;
  chrome.tabs.create({ url, active: false });

  return result;

  // XXX: with createObjectURL users cannot download file.
  /*
    const blob = new Blob([result.outputFiles![0].text], {
      type: "text/javascript",
    });
    const url = URL.createObjectURL(blob);
    console.log({ url });
    chrome.tabs.create({ url });
    */
};

const API = { fetchResource };

Comlink.expose(API, Comlink.windowEndpoint(sandbox));

addEventListener("message", (ev) => {
  console.debug("[panel] onmessage", ev);
});

const useLogs = (): [string[], (log: string) => void] => {
  const [logs, setLogs] = useState<string[]>([]);
  return [logs, (log: string) => setLogs((logs) => [...logs, log])];
};

const Popup = () => {
  const { data: docInfo, error } = useSWR("docInfo", async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    return await getDocumentInfo(tab);
  });

  const [logs, appendLog] = useLogs();
  useEffect(() => {
    maybeAppendLog = appendLog;
  });

  const [minify, setMinify] = useState(true);
  const [inlineSourcemap, setInlineSourcemap] = useState(true);
  const [running, setRunning] = useState(false);

  if (!docInfo && !error) {
    return <>Unavailable</>;
  }
  if (!docInfo) {
    return <>{`Error: ${error}`}</>;
  }

  return (
    <>
      <div style={{ padding: "4 8", width: 300 }}>
        <FormControlLabel
          label="Minify"
          control={
            <Checkbox
              sx={{ padding: 1 }}
              checked={minify}
              onChange={(_, v) => setMinify(v)}
            ></Checkbox>
          }
        />
        <FormControlLabel
          label="Sourcemap"
          control={
            <Checkbox
              sx={{ padding: 1 }}
              checked={inlineSourcemap}
              onChange={(_, v) => setInlineSourcemap(v)}
            ></Checkbox>
          }
        />
        <div style={{ marginTop: 16 }}>
          <Button
            disabled={running}
            onClick={async () => {
              try {
                setRunning(true);
                await runBuild(docInfo, {
                  minify,
                  sourcemap: inlineSourcemap && "inline",
                });
              } catch (err) {
                appendLog(`${err}`);
              } finally {
                setRunning(false);
              }
            }}
            variant="contained"
            style={{ textTransform: "none" }}
            disableElevation
          >
            Build
          </Button>
        </div>
        <div style={{ overflow: "scroll", width: "100%" }}>
          <pre>{logs.join("\n")}</pre>
        </div>
      </div>
    </>
  );
};

render(<Popup />, document.querySelector("#container"));
