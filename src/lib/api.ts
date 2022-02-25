import * as Comlink from "comlink";
import type { API as SandboxInterface } from "../sandbox";

const fetchResource = async (url: string) => {
  // TODO: console.log
  const resp = await fetch(url, {
    credentials: "include",
  });
  if (!resp.ok) {
    throw new Error(`GET ${url}: ${resp.status} ${resp.statusText}`);
  }

  const contents = await resp.text();
  return {
    location: resp.url,
    contents,
    contentType: resp.headers.get("Content-Type") ?? "",
  };
};

export const API = { fetchResource };

export function initialize(sandboxWindow: Window): {
  sandboxRemote: Comlink.Remote<typeof SandboxInterface>;
} {
  Comlink.expose(API, Comlink.windowEndpoint(sandboxWindow));

  const sandboxRemote = Comlink.wrap<typeof SandboxInterface>(
    Comlink.windowEndpoint(sandboxWindow)
  );

  return { sandboxRemote };
}
