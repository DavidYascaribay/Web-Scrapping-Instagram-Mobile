import { chromium } from 'playwright';

type InstagramPost = {
    postUrl: string | null;
    imageUrl: string | null;
    caption: string | null;
};

type InstagramProfile = {
    username: string;
    fullName: string | null;
    bio: string | null;
    profilePicUrl: string | null;
};

type InstagramScrapeResult = {
    profile: InstagramProfile;
    posts: InstagramPost[];
    scrapedAt: string;
};

function cleanText(value: string | null | undefined): string | null {
    if (!value) return null;
    const text = value.trim();
    return text.length ? text : null;
}

export async function scrapeInstagramProfile(
    username: string
): Promise<InstagramScrapeResult> {
    const browser = await chromium.launch({
        headless: false
    });

    const context = await browser.newContext({
        storageState: 'cookies/instagram-state.json'
    });

    const page = await context.newPage();

    try {
        await page.goto(`https://www.instagram.com/${username}/`, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        await page.waitForTimeout(5000);

        const currentUrl = page.url();

        if (currentUrl.includes('/accounts/login')) {
            throw new Error('La sesión expiró. Vuelve a ejecutar npm run save:session');
        }

        await page.waitForSelector('a[href*="/p/"]', { timeout: 15000 });

        const fullName =
            cleanText(await page.locator('header h1').first().textContent().catch(() => null)) ||
            cleanText(await page.locator('header h2').first().textContent().catch(() => null)) ||
            cleanText(await page.locator('main h1').first().textContent().catch(() => null));

        const bio =
            cleanText(await page.locator('header section div span').first().textContent().catch(() => null)) ||
            cleanText(await page.locator('header div span').nth(1).textContent().catch(() => null)) ||
            cleanText(await page.locator('header div span').first().textContent().catch(() => null));

        const profilePicUrl =
            cleanText(await page.locator('header img').first().getAttribute('src').catch(() => null)) ||
            cleanText(await page.locator('main img').first().getAttribute('src').catch(() => null));

        const postAnchors = page.locator('a[href*="/p/"]');
        const totalAnchors = await postAnchors.count();

        const posts: InstagramPost[] = [];
        const seen = new Set<string>();

        for (let i = 0; i < totalAnchors && posts.length < 10; i++) {
            const anchor = postAnchors.nth(i);

            const href = await anchor.getAttribute('href').catch(() => null);
            if (!href) continue;

            const postUrl = `https://www.instagram.com${href}`;
            if (seen.has(postUrl)) continue;

            seen.add(postUrl);

            const img = anchor.locator('img').first();
            const imageUrl = cleanText(await img.getAttribute('src').catch(() => null));
            const caption = cleanText(await img.getAttribute('alt').catch(() => null));

            posts.push({
                postUrl,
                imageUrl,
                caption
            });
        }

        return {
            profile: {
                username,
                fullName,
                bio,
                profilePicUrl
            },
            posts,
            scrapedAt: new Date().toISOString()
        };
    } catch (error) {
        await page.screenshot({
            path: `debug-${username}.png`,
            fullPage: true
        }).catch(() => { });

        throw error;
    } finally {
        await browser.close();
    }
}