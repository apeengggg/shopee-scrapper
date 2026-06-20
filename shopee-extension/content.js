// Runs in ISOLATED world (has chrome.* APIs).
// Injects injected.js into the PAGE context, then bridges messages to background.

(function () {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    (document.head || document.documentElement).appendChild(script);
    script.onload = () => script.remove();
})();

// Forward page-context messages to background service worker
window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data?.__shopee_scraper) return;
    chrome.runtime.sendMessage(event.data).catch(() => {});
});

// Background may ask us to navigate to the next page
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'NAVIGATE') {
        window.location.href = msg.url;
    }
});
