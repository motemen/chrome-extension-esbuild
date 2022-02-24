import * as esbuild from "esbuild-wasm";
import type { Interface as ParentInterface } from "./panel";
import * as Comlink from "comlink";

const parentRemote = Comlink.wrap<ParentInterface>(
  Comlink.windowEndpoint(window.parent)
);

export type Interface = typeof API;

let initialized = false;

function guessLoader({
  location,
  contentType,
}: {
  location: string;
  contentType: string;
}): esbuild.Loader | null {
  const ct = contentType.replace(/\s+;.*$/, "");
  switch (ct) {
    case "application/javascript":
      return "js";

    case "text/css":
      return "css";

    default:
      const m = /\.(jsx?|tsx?|[cm]js|[cm]ts|css|html|json)(?:$|\?)/.exec(
        location
      );
      if (m) {
        const loader =
          { cjs: "js", mjs: "js", cts: "ts", mts: "ts" }[m[1]] ?? m[1];
        return loader as esbuild.Loader;
      }

      return null;
  }
}

async function build({
  source,
  location,
  contentType,
}: {
  source: string;
  location: string;
  contentType: string;
}): Promise<esbuild.BuildResult> {
  console.log("sandbox: build", { source, location, contentType });

  if (!initialized) {
    initialized = true;

    await esbuild.initialize({
      wasmURL: "../assets/esbuild.wasm",
    });
  }

  const loader = guessLoader({ location, contentType });

  // https://esbuild.github.io/plugins/#http-plugin
  const httpLoaderPlugin: esbuild.Plugin = {
    name: "http-loader",
    setup(build) {
      build.onResolve({ filter: /./ }, (args) => {
        console.debug("esbuild onResolve", args);

        return {
          path: new URL(args.path, location).toString(),
          namespace: "external",
        };
      });

      build.onLoad({ filter: /./, namespace: "external" }, async (args) => {
        try {
          console.log("onLoad");
          const { contents, contentType } = await parentRemote.fetchResource(
            args.path
          );
          console.log("onLoad fetch");
          return {
            contents,
            ...(loader && { loader }),
          };
        } catch (err) {
          console.error(err);
        }
      });
    },
  };

  const result = await esbuild.build({
    bundle: true,
    stdin: {
      contents: source,
      ...(loader && { loader }),
    },
    plugins: [httpLoaderPlugin],
    // TODO: loader:
    // TODO: minify:
    // TODO: sourcemap:
  });

  return result;
}

addEventListener("message", (ev) => {
  console.debug("[sandbox] onmessage", ev);
});

const API = { build };

Comlink.expose(API, Comlink.windowEndpoint(window.parent));
