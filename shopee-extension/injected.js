// Runs in PAGE context (not extension context).
// Patches window.fetch and XHR to intercept Shopee's search API responses.
(function () {
    const SEARCH_PATTERN = '/api/v4/search/search_items';

    function emit(data) {
        window.postMessage({ __shopee_scraper: true, type: 'SEARCH_DATA', data }, '*');
    }

    // Patch fetch
    const origFetch = window.fetch;
    window.fetch = async function (...args) {
        const response = await origFetch.apply(this, args);
        try {
            const url = args[0] instanceof Request ? args[0].url : String(args[0]);
            if (url.includes(SEARCH_PATTERN)) {
                response.clone().json().then(emit).catch(() => {});
            }
        } catch (_) {}
        return response;
    };

    // Patch XHR (fallback)
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this._scraper_url = String(url);
        return origOpen.apply(this, [method, url, ...rest]);
    };

    XMLHttpRequest.prototype.send = function (body) {
        if (this._scraper_url && this._scraper_url.includes(SEARCH_PATTERN)) {
            this.addEventListener('load', function () {
                try { emit(JSON.parse(this.responseText)); } catch (_) {}
            });
        }
        return origSend.apply(this, [body]);
    };
})();
