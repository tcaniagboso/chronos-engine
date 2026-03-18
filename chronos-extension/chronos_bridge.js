console.log("Chronos bridge loading...");

function installChronosBridge() {
    if (window.Chronos) return;

    if (
        !window.Module ||
        typeof Module._get_window_packed !== "function" ||
        typeof Module._malloc !== "function" ||
        typeof Module._free !== "function" ||
        typeof Module._free_buffer !== "function" ||
        typeof HEAPU8 === "undefined" ||
        typeof HEAPU32 === "undefined"
    ) {
        return;
    }

    console.log("Chronos bridge ready");

    const decoder = new TextDecoder();

    window.Chronos = {
        async getWindow(start, count) {
            const outSizePtr = Module._malloc(4);
            const outCountPtr = Module._malloc(4);

            const ptr = Module._get_window_packed(
                start,
                count,
                outSizePtr,
                outCountPtr
            );

            const totalSize = HEAPU32[outSizePtr >> 2];
            const msgCount = HEAPU32[outCountPtr >> 2];

            if (!ptr || totalSize === 0 || msgCount === 0) {
                Module._free(outSizePtr);
                Module._free(outCountPtr);
                return [];
            }

            let cursor = ptr;

            // packed layout:
            // [ n ][ offsets... ][ sizes... ][ payload ]
            const n = HEAPU32[cursor >> 2];
            cursor += 4;

            const offsets = new Array(n);
            const sizes = new Array(n);

            for (let i = 0; i < n; i++) {
                offsets[i] = HEAPU32[cursor >> 2];
                cursor += 4;
            }

            for (let i = 0; i < n; i++) {
                sizes[i] = HEAPU32[cursor >> 2];
                cursor += 4;
            }

            const payloadStart = cursor;
            const results = new Array(n);

            for (let i = 0; i < n; i++) {
                const p = payloadStart + offsets[i];
                const bytes = HEAPU8.slice(p, p + sizes[i]);
                results[i] = decoder.decode(bytes);
            }

            Module._free_buffer(ptr);
            Module._free(outSizePtr);
            Module._free(outCountPtr);

            return results;
        }
    };
}

// Try immediately in case runtime is already ready
installChronosBridge();

// Also hook future runtime init if it hasn't happened yet
const prevInit = Module.onRuntimeInitialized;
Module.onRuntimeInitialized = () => {
    if (typeof prevInit === "function") prevInit();
    installChronosBridge();
};