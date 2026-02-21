console.log("Chronos injected");

(async function () {

    const MESSAGE_SELECTOR =
        '[data-message-author-role="user"], [data-message-author-role="assistant"]';

    const WINDOW = 80;
    const EST_ROW_HEIGHT = 160;

    const seen = new Set();
    const messages = [];

    let spacer, windowBox, scrollParent;
    let ticking = false;

    // ------------------------
    // Force full history load
    // ------------------------
    async function forceLoadHistory() {
        const main = document.querySelector("main");
        if (!main) return;

        let prev = -1;

        while (true) {
            main.scrollTop = 0;
            await new Promise(r => setTimeout(r, 350));

            const count = document.querySelectorAll(MESSAGE_SELECTOR).length;
            if (count === prev) break;
            prev = count;
        }
    }

    // ------------------------
    // Collect unique messages
    // ------------------------
    function collect() {
        document.querySelectorAll(MESSAGE_SELECTOR).forEach(n => {
            const id = n.dataset.messageId || n;
            if (seen.has(id)) return;
            seen.add(id);
            messages.push(n);
        });
    }

    // ------------------------
    // Setup virtual layout
    // ------------------------
    function setupVirtualization() {

        const container = messages[0].parentElement;
        scrollParent = container.parentElement;

        spacer = document.createElement("div");
        spacer.style.height = messages.length * EST_ROW_HEIGHT + "px";
        spacer.style.position = "relative";

        windowBox = document.createElement("div");
        windowBox.style.position = "absolute";
        windowBox.style.left = "0";
        windowBox.style.right = "0";

        container.innerHTML = "";
        container.appendChild(spacer);
        container.appendChild(windowBox);

        render(0);

        scrollParent.addEventListener("scroll", () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    onScroll();
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    // ------------------------
    // Render window (DOM reuse)
    // ------------------------
    function render(start) {

        const end = Math.min(start + WINDOW, messages.length);

        windowBox.style.transform =
            `translateY(${start * EST_ROW_HEIGHT}px)`;

        let i = 0;

        while (windowBox.children.length > end - start) {
            windowBox.removeChild(windowBox.lastChild);
        }

        while (windowBox.children.length < end - start) {
            windowBox.appendChild(document.createElement("div"));
        }

        for (let j = start; j < end; j++, i++) {
            const slot = windowBox.children[i];
            if (slot.firstChild !== messages[j]) {
                slot.innerHTML = "";
                slot.appendChild(messages[j]);
            }
        }
    }

    function onScroll() {
        const start = Math.floor(scrollParent.scrollTop / EST_ROW_HEIGHT);
        render(start);
    }

    // ------------------------
    // Observe new messages
    // ------------------------
    function observeNewMessages() {

        const main = document.querySelector("main");

        const observer = new MutationObserver(muts => {
            let added = false;

            muts.forEach(m => {
                m.addedNodes.forEach(n => {
                    if (!n.matches || !n.matches(MESSAGE_SELECTOR)) return;

                    const id = n.dataset.messageId || n;
                    if (seen.has(id)) return;

                    seen.add(id);
                    messages.push(n);
                    added = true;
                });
            });

            if (added) {
                spacer.style.height =
                    messages.length * EST_ROW_HEIGHT + "px";

                const start =
                    Math.floor(scrollParent.scrollTop / EST_ROW_HEIGHT);

                render(start);
            }
        });

        observer.observe(main, {
            childList: true,
            subtree: true
        });
    }

    // ------------------------
    // Boot
    // ------------------------
    console.log("Chronos loading history...");

    await forceLoadHistory();
    collect();

    if (!messages.length) return;

    console.log("Chronos captured:", messages.length);

    setupVirtualization();
    observeNewMessages();

    console.log("Chronos virtualization active — high performance mode");

})();