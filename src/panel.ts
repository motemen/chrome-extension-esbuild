import * as esbuild from "esbuild-wasm";

console.log("panel opned");

const run = async () => {
  const sandbox = document.querySelector("#sandbox") as HTMLIFrameElement;
  sandbox.contentWindow?.postMessage(
    {
      yo: 1,
    },
    "*"
  );
  /*
  await esbuild.initialize({
    wasmURL: "../assets/esbuild.wasm",
  });
  const result1 = await esbuild.transform("let b: boolean = 1");
  console.log({ result1 });
  (document.querySelector("#result") as any).value = result1;
	*/
};

document.querySelector("#run")?.addEventListener("click", run);
