import * as esbuild from "esbuild-wasm";

export function guessLoader({
  location,
  contentType,
}: {
  location: string;
  contentType: string;
}): esbuild.Loader | null {
  const ct = contentType.replace(/\s+;.*$/, "");
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
