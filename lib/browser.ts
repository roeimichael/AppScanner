import type { Browser } from 'playwright';

// Singleton chromium for browser-based source adapters (Homeless, etc.).
// Reuses one browser across requests to avoid 1-2s launch cost on every scan.
// Auto-closes after 5 min of inactivity.

interface State {
    browser: Browser | null;
    closing: NodeJS.Timeout | null;
    refs: number;
}

const state: State = { browser: null, closing: null, refs: 0 };
const IDLE_CLOSE_MS = 5 * 60 * 1000;

const launch = async (): Promise<Browser> => {
    const { chromium } = await import('playwright');
    return chromium.launch({
        headless: true,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
        ],
    });
};

export const acquireBrowser = async (): Promise<Browser> => {
    if (state.closing) {
        clearTimeout(state.closing);
        state.closing = null;
    }
    if (!state.browser || !state.browser.isConnected()) {
        state.browser = await launch();
    }
    state.refs++;
    return state.browser;
};

export const releaseBrowser = () => {
    state.refs = Math.max(0, state.refs - 1);
    if (state.refs === 0) {
        if (state.closing) clearTimeout(state.closing);
        state.closing = setTimeout(async () => {
            try {
                await state.browser?.close();
            } catch { /* ignore */ }
            state.browser = null;
            state.closing = null;
        }, IDLE_CLOSE_MS);
    }
};

export const newStealthContext = async (browser: Browser) => {
    const ctx = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 1024 },
        locale: 'he-IL',
    });
    await ctx.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    return ctx;
};
