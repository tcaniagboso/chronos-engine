console.log("Chronos app loading...");

function waitForChronos() {
    return new Promise((resolve) => {
        const tick = () => {
            if (
                window.Chronos &&
                typeof window.Chronos.getWindow === "function" &&
                window.Module &&
                typeof Module._append_message === "function" &&
                typeof Module._malloc === "function" &&
                typeof Module._free === "function" &&
                typeof HEAPU8 !== "undefined"
            ) {
                resolve();
            } else {
                requestAnimationFrame(tick);
            }
        };
        tick();
    });
}

(async function () {
    await waitForChronos();
    console.log("Chronos runtime ready");

    const MESSAGE_SELECTOR =
        '[data-message-author-role="user"], [data-message-author-role="assistant"]';

    const WINDOW = 10;
    const PREFETCH = 20;
    const DEFAULT_HEIGHT = 180;

    let container = null;
    let scrollParent = null;

    let store = [];
    let prefix = [];

    let cacheLo = 0;
    let cacheHi = 0;

    let winStart = 0;
    let winEnd = 0;

    let spacer = null;
    let windowBox = null;
    let ticking = false;

    const encoder = new TextEncoder();

    async function waitForMessages(timeoutMs = 15000) {
        const start = performance.now();

        while (performance.now() - start < timeoutMs) {
            const nodes = document.querySelectorAll(MESSAGE_SELECTOR);
            if (nodes.length > 0) return true;
            await new Promise((r) => setTimeout(r, 200));
        }

        return false;
    }

    async function forceLoadHistory() {
        const main = document.querySelector("main");
        if (!main) return;

        let prev = -1;

        while (true) {
            main.scrollTop = 0;
            await new Promise((r) => setTimeout(r, 250));

            const count = document.querySelectorAll(MESSAGE_SELECTOR).length;
            if (count === prev) break;
            prev = count;
        }
    }

    function flatten(node) {
        const clone = node.cloneNode(true);

        clone.querySelectorAll(".cm-content").forEach((cm) => {
            const text = cm.innerText || cm.textContent || "";
            const wrap =
                cm.closest(".cm-editor") ||
                cm.closest(".cm-scroller") ||
                cm.parentElement;

            if (!wrap) return;

            const pre = document.createElement("pre");
            const code = document.createElement("code");
            code.textContent = text;
            pre.appendChild(code);
            wrap.replaceWith(pre);
        });

        return clone.outerHTML;
    }

    function findScrollParent(el) {
        let cur = el;
        while (cur) {
            const style = window.getComputedStyle(cur);
            const overflowY = style.overflowY;
            const isScrollable =
                (overflowY === "auto" || overflowY === "scroll") &&
                cur.scrollHeight > cur.clientHeight;

            if (isScrollable) return cur;
            cur = cur.parentElement;
        }

        return document.scrollingElement || document.documentElement;
    }

    function appendHtmlToChronos(html, role) {
        const data = encoder.encode(html);
        const ptr = Module._malloc(data.length);
        HEAPU8.set(data, ptr);
        Module._append_message(ptr, data.length, role);
        Module._free(ptr);
    }

    function captureDOM() {
        const nodes = [...document.querySelectorAll(MESSAGE_SELECTOR)];
        if (!nodes.length) return false;

        container = nodes[0].parentElement;
        scrollParent = findScrollParent(container);

        store = nodes.map((n) => {
            const html = flatten(n);
            const role =
                n.getAttribute("data-message-author-role") === "user" ? 0 : 1;

            appendHtmlToChronos(html, role);

            return {
                html,
                h: Math.max(60, n.getBoundingClientRect().height || DEFAULT_HEIGHT),
            };
        });

        cacheLo = 0;
        cacheHi = store.length;
        return true;
    }

    function rebuildPrefix() {
        prefix = new Array(store.length + 1);
        prefix[0] = 0;

        for (let i = 0; i < store.length; i++) {
            prefix[i + 1] = prefix[i] + (store[i].h || DEFAULT_HEIGHT);
        }
    }

    function indexFromScroll(top) {
        let lo = 0;
        let hi = store.length;

        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (prefix[mid + 1] <= top) lo = mid + 1;
            else hi = mid;
        }

        return lo;
    }

    function setupLayout() {
        spacer = document.createElement("div");
        spacer.style.height = prefix[store.length] + "px";
        spacer.style.position = "relative";

        windowBox = document.createElement("div");
        windowBox.style.position = "absolute";
        windowBox.style.left = "0";
        windowBox.style.right = "0";
        windowBox.style.top = "0";

        container.innerHTML = "";
        container.appendChild(spacer);
        container.appendChild(windowBox);
    }

    function mount(html) {
        const t = document.createElement("template");
        t.innerHTML = html.trim();
        return t.content.firstElementChild || document.createElement("div");
    }

    function renderWindow(start) {
        if (!store.length) return;

        const s = Math.max(0, Math.min(start, Math.max(0, store.length - 1)));
        const e = Math.min(s + WINDOW, store.length);

        winStart = s;
        winEnd = e;

        windowBox.style.transform = `translateY(${prefix[s]}px)`;
        windowBox.innerHTML = "";

        for (let i = s; i < e; i++) {
            windowBox.appendChild(mount(store[i].html));
        }
    }

    async function ensureRange(globalIndex) {
        if (globalIndex >= cacheLo && globalIndex < cacheHi) return;

        const newLo = Math.max(0, globalIndex - PREFETCH);
        const count = WINDOW + PREFETCH * 2;

        const payloads = await Chronos.getWindow(newLo, count);

        store = payloads.map((html) => ({
            html,
            h: DEFAULT_HEIGHT,
        }));

        cacheLo = newLo;
        cacheHi = newLo + store.length;

        rebuildPrefix();
        spacer.style.height = prefix[store.length] + "px";
    }

    async function onScroll() {
        const top = scrollParent.scrollTop;
        const localIndex = indexFromScroll(top);
        const globalIndex = cacheLo + localIndex;

        if (localIndex >= winStart && localIndex < winEnd) return;

        await ensureRange(globalIndex);
        renderWindow(Math.max(0, globalIndex - cacheLo));
    }

    function attachScroll() {
        scrollParent.addEventListener(
            "scroll",
            () => {
                if (ticking) return;
                ticking = true;

                requestAnimationFrame(async () => {
                    try {
                        await onScroll();
                    } finally {
                        ticking = false;
                    }
                });
            },
            {passive: true}
        );
    }

    async function waitForChatReady(timeoutMs = 120000) {
        const existing = document.querySelectorAll(MESSAGE_SELECTOR);
        if (existing.length > 0) return true;

        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                observer.disconnect();
                resolve(false);
            }, timeoutMs);

            const observer = new MutationObserver(() => {
                const count = document.querySelectorAll(MESSAGE_SELECTOR).length;
                if (count > 0) {
                    clearTimeout(timeout);
                    observer.disconnect();
                    resolve(true);
                }
            });

            observer.observe(document.documentElement, {
                childList: true,
                subtree: true
            });
        });
    }

    const ready = await waitForChatReady();
    if (!ready) {
        console.warn("Chronos: chat never became ready");
        return;
    }

    let captured = false;
    for (let i = 0; i < 20; i++) {
        if (captureDOM()) {
            captured = true;
            break;
        }
        await new Promise((r) => setTimeout(r, 250));
    }

    if (!captured) {
        console.warn("Chronos: no messages found after retries");
        return;
    }

    rebuildPrefix();
    setupLayout();

    const startAt = Math.max(0, store.length - WINDOW);
    renderWindow(startAt);
    scrollParent.scrollTop = prefix[startAt];

    attachScroll();

    console.log(
        `Chronos active — cached=[${cacheLo}, ${cacheHi}), dom_nodes≈${WINDOW}`
    );
})();