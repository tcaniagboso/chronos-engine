window.Module = window.Module || {};

const currentUrl = new URL(document.currentScript.src);
const wasmUrl = currentUrl.searchParams.get("wasm");

window.Module.locateFile = function (path) {
    if (path.endsWith(".wasm")) {
        return wasmUrl;
    }
    return path;
};

window.Module.instantiateWasm = async function (imports, receiveInstance) {
    const resp = await fetch(wasmUrl);
    const bytes = await resp.arrayBuffer();
    const result = await WebAssembly.instantiate(bytes, imports);
    receiveInstance(result.instance);
    return result.instance.exports;
};

window.Module.onRuntimeInitialized = function () {
    console.log("Chronos WASM ready");
};