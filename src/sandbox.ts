import * as esbuild from "esbuild-wasm";
import type { FetchRequest, PanelRequest } from "./panel";

export type MessagePayload = BuildRequestPayload | FetchResult;

export interface FetchResult {
  type: "fetchResult";
  id: string;
  contents: string;
  contentType: string;
}

export interface BuildRequestPayload {
  type: "buildRequest";
  source: string;
  location: string;
  contentType: string;
}

const createID = () => Math.random().toString(36);

const ResultSlots: Record<string, (result: FetchResult) => void> = {};

async function build(
  _post: (r: PanelRequest) => void,
  { source, location, contentType }: BuildRequestPayload
) {
  console.log({ source, location, contentType });

  await esbuild.initialize({
    wasmURL: "../assets/esbuild.wasm",
  });
  // https://esbuild.github.io/plugins/#http-plugin
  const httpLoaderPlugin: esbuild.Plugin = {
    name: "http-loader",
    setup(build) {
      build.onResolve({ filter: /./ }, (args) => {
        console.log(args);

        return {
          path: new URL(args.path, location).toString(),
          namespace: "http-url",
        };
      });

      build.onLoad({ filter: /./, namespace: "http-url" }, async (args) => {
        const id = createID();
        const p = new Promise<FetchResult>((resolve) => {
          ResultSlots[id] = resolve;
        });
        _post({
          id,
          type: "fetch",
          url: args.path,
        } as FetchRequest);
        const result = await p;
        console.log({ result });
        return {
          contents: result.contents,
        };
      });
    },
  };
  const result = await esbuild.build({
    bundle: true,
    stdin: {
      contents: source,
    },
    plugins: [httpLoaderPlugin],
    // TODO: loader:
  });
  console.log({ result });
  (document.querySelector("#result") as HTMLTextAreaElement).value =
    JSON.stringify({
      result,
    });
}

addEventListener("message", async (ev) => {
  if (ev.data.type === "buildRequest") {
    await build((data: PanelRequest) => {
      ev.source!.postMessage(data, { targetOrigin: ev.origin });
    }, ev.data);
  } else if (ev.data.type === "fetchResult") {
    ResultSlots[ev.data.id](ev.data);
  } else {
    console.error("unknown payload", ev.data);
  }
});
