console.log("Chronos content script loaded");

const style = document.createElement("style");
style.textContent = `
[data-message-author-role] {
  content-visibility: auto;
  contain-intrinsic-size: 1px 200px;
}
`;
document.documentElement.appendChild(style);

function inject(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.onload = () => {
            s.remove();
            resolve();
        };
        s.onerror = reject;
        document.documentElement.appendChild(s);
    });
}

(async () => {
    try {
        const wasmUrl = chrome.runtime.getURL("chronos.wasm");
        const loaderUrl =
            chrome.runtime.getURL("loader.js") +
            `?wasm=${encodeURIComponent(wasmUrl)}`;

        await inject(loaderUrl);
        await inject(chrome.runtime.getURL("chronos.js"));
        await inject(chrome.runtime.getURL("chronos_bridge.js"));
        await inject(chrome.runtime.getURL("chronos_app.js"));

        console.log("Chronos scripts injected");
    } catch (err) {
        console.error("Chronos injection failed:", err);
    }
})();