import { Locator } from 'playwright';
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

function isUsefulMediaUrl(url: string): boolean {
    return (
        url.includes('cdninstagram') ||
        url.includes('fbcdn.net') ||
        url.includes('instagram.')
    );
}

async function getVisibleMediaFromCurrentSlide(article: Locator): Promise<MediaItem[]> {
    const items: MediaItem[] = [];

    const videos = article.locator('video');
    const totalVideos = await videos.count().catch(() => 0);

    for (let i = 0; i < totalVideos; i++) {
        const locator = videos.nth(i);
        const src = await locator.getAttribute('src').catch(() => null);
        const box = await locator.boundingBox().catch(() => null);

        if (!src || !isUsefulMediaUrl(src)) continue;
        if (!box || box.width < 180 || box.height < 180) continue;

        items.push({
            type: 'video',
            url: src
        });
    }

    const images = article.locator('img');
    const totalImages = await images.count().catch(() => 0);

    for (let i = 0; i < totalImages; i++) {
        const locator = images.nth(i);
        const src = await locator.getAttribute('src').catch(() => null);
        const alt = await locator.getAttribute('alt').catch(() => null);
        const box = await locator.boundingBox().catch(() => null);

        if (!src || !isUsefulMediaUrl(src)) continue;
        if (!box || box.width < 180 || box.height < 180) continue;

        const altText = (alt || '').toLowerCase();

        if (
            altText.includes('profile picture') ||
            altText.includes('foto del perfil')
        ) {
            continue;
        }

        items.push({
            type: 'image',
            url: src
        });
    }

    return items;
}

async function findNextButton(article: Locator): Promise<Locator | null> {
    const selectors = [
        'button[aria-label="Next"]',
        'button[aria-label="Siguiente"]',
        'button[aria-label="Go to next slide"]',
        'svg[aria-label="Next"]',
        'svg[aria-label="Siguiente"]'
    ];

    for (const selector of selectors) {
        const locator = article.locator(selector).first();
        const count = await locator.count().catch(() => 0);
        if (count > 0) return locator;
    }

    return null;
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

        await page.waitForTimeout(1600);

        if (page.url().includes('/accounts/login')) {
            throw new Error('La sesión expiró. Vuelve a ejecutar npm run save:session');
        }

        const article = page.locator('article').first();
        await article.waitFor({ timeout: 10000 }).catch(() => { });

        const items: MediaItem[] = [];
        const seen = new Set<string>();

        const pushUnique = (media: MediaItem[]) => {
            for (const item of media) {
                if (seen.has(item.url)) continue;
                seen.add(item.url);
                items.push(item);
            }
        };

        const initialMedia = await getVisibleMediaFromCurrentSlide(article);
        pushUnique(initialMedia);

        for (let i = 0; i < 10; i++) {
            const nextButton = await findNextButton(article);
            if (!nextButton) break;

            const before = items.length;

            await nextButton.click().catch(() => { });
            await page.waitForTimeout(900);

            const currentMedia = await getVisibleMediaFromCurrentSlide(article);
            pushUnique(currentMedia);

            if (items.length === before) break;
        }

        if (items.length === 0) {
            const ogVideo = await page
                .locator('meta[property="og:video"]')
                .getAttribute('content')
                .catch(() => null);

            if (ogVideo && isUsefulMediaUrl(ogVideo)) {
                items.push({
                    type: 'video',
                    url: ogVideo
                });
            } else {
                const ogImage = await page
                    .locator('meta[property="og:image"]')
                    .getAttribute('content')
                    .catch(() => null);

                if (ogImage && isUsefulMediaUrl(ogImage)) {
                    items.push({
                        type: 'image',
                        url: ogImage
                    });
                }
            }
        }

        let type: 'image' | 'video' | 'carousel' = 'image';

        if (items.length > 1) {
            type = 'carousel';
        } else if (items.length === 1 && items[0].type === 'video') {
            type = 'video';
        }

        const caption =
            cleanText(await article.textContent().catch(() => null)) ||
            cleanText(
                await page
                    .locator('meta[property="og:description"]')
                    .getAttribute('content')
                    .catch(() => null)
            ) ||
            null;

        return {
            postUrl: url,
            type,
            items,
            caption
        };
    } finally {
        await page.close().catch(() => { });
        await context.close().catch(() => { });
    }
}