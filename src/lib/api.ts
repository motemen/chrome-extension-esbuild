import * as Comlink from "comlink";
import type { API as SandboxInterface } from "../sandbox";
import { logContentScript } from "./utils";

export class API {
  constructor(private tabId: number) {}

  public async fetchResource(url: string) {
    const resp = await fetch(url, {
      credentials: "include",
    });

    logContentScript(
      this.tabId,
      "debug",
      `fetch ${url}: ${resp.status} ${resp.statusText}`
    );

    if (!resp.ok) {
      throw new Error(`GET ${url}: ${resp.status} ${resp.statusText}`);
    }

    const contents = await resp.text();
    return {
      location: resp.url,
      contents,
      contentType: resp.headers.get("Content-Type") ?? "",
    };
  }
}

export function initialize(
  sandboxWindow: Window,
  tabId: number
): {
  sandboxRemote: Comlink.Remote<typeof SandboxInterface>;
} {
  Comlink.expose(new API(tabId), Comlink.windowEndpoint(sandboxWindow));

  const sandboxRemote = Comlink.wrap<typeof SandboxInterface>(
    Comlink.windowEndpoint(sandboxWindow)
  );

  return { sandboxRemote };
}
