import { getBrowser } from './browser.js';

type MediaItem = {
    type: 'image' | 'video';
    url: string;
};

type PostDetailResult = {
    postUrl: string;
    type: 'image' | 'video' | 'carousel';
    items: MediaItem[];
    caption: string | null;
};

function cleanText(value: string | null | undefined): string | null {
    if (!value) return null;
    const text = value.trim();
    return text.length ? text : null;
}

export async function scrapePostDetail(url: string): Promise<PostDetailResult> {
    const browser = await getBrowser();

    const context = await browser.newContext({
        storageState: 'cookies/instagram-state.json',
        viewport: { width: 1280, height: 1800 },
        userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    try {
        await page.route('**/*', async (route) => {
            const request = route.request();
            const resourceType = request.resourceType();
            const reqUrl = request.url();

            if (
                ['font', 'stylesheet'].includes(resourceType) ||
                reqUrl.includes('google-analytics.com') ||
                reqUrl.includes('doubleclick.net') ||
                reqUrl.includes('connect.facebook.net') ||
                reqUrl.includes('facebook.com/tr')
            ) {
                await route.abort();
                return;
            }

            await route.continue();
        });

        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 20000
        });

        await page.waitForTimeout(1500);

        const currentUrl = page.url();
        if (currentUrl.includes('/accounts/login')) {
            throw new Error('La sesión expiró. Vuelve a ejecutar npm run save:session');
        }

        const items: MediaItem[] = [];
        const seen = new Set<string>();

        const videoLocator = page.locator('video');
        const totalVideos = await videoLocator.count().catch(() => 0);

        for (let i = 0; i < totalVideos; i++) {
            const src = await videoLocator.nth(i).getAttribute('src').catch(() => null);
            if (!src) continue;
            if (seen.has(src)) continue;

            seen.add(src);
            items.push({
                type: 'video',
                url: src
            });
        }

        const imageLocator = page.locator('img');
        const totalImages = await imageLocator.count().catch(() => 0);

        for (let i = 0; i < totalImages; i++) {
            const src = await imageLocator.nth(i).getAttribute('src').catch(() => null);
            if (!src) continue;

            const isUsefulImage =
                src.includes('cdninstagram') ||
                src.includes('fbcdn.net') ||
                src.includes('instagram.');

            if (!isUsefulImage) continue;
            if (seen.has(src)) continue;

            seen.add(src);
            items.push({
                type: 'image',
                url: src
            });
        }

        let type: 'image' | 'video' | 'carousel' = 'image';

        if (items.length > 1) {
            type = 'carousel';
        } else if (items.length === 1 && items[0].type === 'video') {
            type = 'video';
        }

        const caption =
            cleanText(
                await page
                    .locator('meta[property="og:description"]')
                    .getAttribute('content')
                    .catch(() => null)
            ) ||
            cleanText(await page.locator('article').first().textContent().catch(() => null)) ||
            null;

        return {
            postUrl: url,
            type,
            items: items.slice(0, 15),
            caption
        };
    } finally {
        await page.close().catch(() => { });
        await context.close().catch(() => { });
    }
}