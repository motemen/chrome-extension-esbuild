import * as esbuild from "esbuild-wasm";

addEventListener("message", async (ev) => {
  console.log(ev);

  await esbuild.initialize({
    wasmURL: "../assets/esbuild.wasm",
  });
  // https://esbuild.github.io/plugins/#http-plugin
  const httpLoaderPlugin: esbuild.Plugin = {
    name: "http-loader",
    setup(build) {
      build.onResolve({ filter: /^https?:\/\// }, (args) => {
        console.log(args);
        return {
          path: args.path,
          namespace: "http-url",
        };
      });
    },
  };
  const result = await esbuild.build({
    bundle: true,
    stdin: {
      contents: `
			import head from 'https://unpkg.com/lodash@4.17.21/head.js';
			head([1,2,3])
			`,
    },
    plugins: [httpLoaderPlugin],
  });
  console.log({ result });
  (document.querySelector("#result") as any).value = JSON.stringify({
    result2: result,
  });
});
