import * as esbuild from "esbuild-wasm";
import type { API as ParentInterface } from "./lib/api";
import * as Comlink from "comlink";

function guessLoader({
  location,
  contentType,
}: {
  location: string;
  contentType: string;
}): esbuild.Loader | null {
  const ct = contentType.replace(/\s*;.*$/, "");
  switch (ct) {
    case "application/javascript":
    case "text/javascript":
      return "js";

    case "text/css":
      return "css";

    default:
      return null;
  }
}

const parentRemote = Comlink.wrap<ParentInterface>(
  Comlink.windowEndpoint(window.parent)
);

let initialized = false;

export interface BuildOptions {
  minify: boolean;
  sourcemap: "inline" | false;
}

async function build({
  source,
  location,
  contentType,
  options,
}: {
  source: string;
  location: string;
  contentType: string;
  options: BuildOptions;
}): Promise<esbuild.BuildResult> {
  console.log("sandbox: build", { source, location, contentType });

  if (!initialized) {
    initialized = true;

    await esbuild.initialize({
      wasmURL: "../assets/esbuild.wasm",
    });
  }

  // https://esbuild.github.io/plugins/#http-plugin
  const httpLoaderPlugin: esbuild.Plugin = {
    name: "http",
    setup(build) {
      build.onResolve({ filter: /./ }, (args) => {
        console.debug("[esbuild] onResolve", args);

        let base = args.importer;
        const m = /\/_\/(.+)/.exec(args.resolveDir);
        if (m) {
          base = decodeURIComponent(m[1]);
        }

        return {
          path: new URL(args.path, base).toString(),
          namespace: "http-loader",
        };
      });

      build.onLoad(
        { filter: /./, namespace: "http-loader" },
        async ({ path }) => {
          const { location, contents, contentType } =
            await parentRemote.fetchResource(path);

          return {
            resolveDir: "/_/" + encodeURIComponent(location),
            contents,
            loader: guessLoader({ location: path, contentType }) ?? "default",
            // TODO resolveDir?
          };
        }
      );
    },
  };

  const result = await esbuild.build({
    bundle: true,
    stdin: {
      contents: source,
      sourcefile: location,
      loader: guessLoader({ location, contentType }) ?? "default",
    },
    plugins: [httpLoaderPlugin],
    ...options,
  });

  return result;
}

addEventListener("message", (ev) => {
  console.debug("[sandbox] onmessage", ev);
});

export const API = { build };

Comlink.expose(API, Comlink.windowEndpoint(window.parent));
