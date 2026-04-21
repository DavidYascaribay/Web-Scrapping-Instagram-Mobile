import { Page } from 'playwright';
import { getBrowser } from './browser.js';

type InstagramPostType = 'image' | 'video' | 'carousel';

type InstagramPost = {
    postUrl: string | null;
    imageUrl: string | null;
    caption: string | null;
    postType: InstagramPostType;
    needsDetailFetch: boolean;
};

type InstagramProfile = {
    username: string;
    fullName: string | null;
    bio: string | null;
    profilePicUrl: string | null;
    coverPhotoUrl: string | null;
    followers: string | null;
    following: string | null;
    postsCount: string | null;
    isPrivate: boolean;
    privateMessage: string | null;
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

function extractCount(text: string, label: string): string | null {
    const regex = new RegExp(`([\\d.,]+\\s*[KMB]?)\\s+${label}`, 'i');
    const match = text.match(regex);
    return match?.[1]?.trim() || null;
}

function extractFullNameFromOgTitle(
    ogTitle: string | null,
    username: string
): string | null {
    if (!ogTitle) return null;

    const match = ogTitle.match(/^(.*?)\s+\(@/);
    const fullName = match?.[1]?.trim() || null;

    if (!fullName || fullName.toLowerCase() === username.toLowerCase()) {
        return username;
    }

    return fullName;
}

function parseCountsFromDescription(description: string | null): {
    followers: string | null;
    following: string | null;
    postsCount: string | null;
} {
    if (!description) {
        return {
            followers: null,
            following: null,
            postsCount: null
        };
    }

    return {
        followers:
            extractCount(description, 'Followers') ||
            extractCount(description, 'seguidores'),
        following:
            extractCount(description, 'Following') ||
            extractCount(description, 'seguidos'),
        postsCount:
            extractCount(description, 'Posts') ||
            extractCount(description, 'publicaciones')
    };
}

async function optimizePage(page: Page): Promise<void> {
    await page.route('**/*', async (route) => {
        const request = route.request();
        const resourceType = request.resourceType();
        const url = request.url();

        if (
            ['font', 'stylesheet'].includes(resourceType) ||
            url.includes('google-analytics.com') ||
            url.includes('doubleclick.net') ||
            url.includes('connect.facebook.net') ||
            url.includes('facebook.com/tr')
        ) {
            await route.abort();
            return;
        }

        await route.continue();
    });
}

async function extractVisibleBio(page: Page): Promise<string | null> {
    const candidates = [
        page.locator('header section div > span').first(),
        page.locator('header section span').nth(1),
        page.locator('header div span').nth(2),
        page.locator('header div span').nth(3)
    ];

    for (const locator of candidates) {
        const text = cleanText(await locator.textContent().catch(() => null));
        if (!text) continue;

        const lower = text.toLowerCase();

        if (
            lower.includes('followers') ||
            lower.includes('following') ||
            lower.includes('posts') ||
            lower.includes('seguidores') ||
            lower.includes('seguidos') ||
            lower.includes('publicaciones')
        ) {
            continue;
        }

        if (lower.startsWith('@') || lower === 'follow' || lower === 'seguir') {
            continue;
        }

        return text;
    }

    return null;
}

async function collectPostLinks(page: Page, maxPosts = 10): Promise<InstagramPost[]> {
    const posts: InstagramPost[] = [];
    const seen = new Set<string>();

    await page.waitForSelector('article', { timeout: 10000 }).catch(() => { });

    for (let attempt = 0; attempt < 8 && posts.length < maxPosts; attempt++) {
        const postAnchors = page.locator('a[href*="/p/"], a[href*="/reel/"]');
        const totalAnchors = await postAnchors.count();

        for (let i = 0; i < totalAnchors && posts.length < maxPosts; i++) {
            const anchor = postAnchors.nth(i);

            const href = await anchor.getAttribute('href').catch(() => null);
            if (!href) continue;

            const postUrl = href.startsWith('http')
                ? href
                : `https://www.instagram.com${href}`;

            if (seen.has(postUrl)) continue;
            seen.add(postUrl);

            const img = anchor.locator('img').first();
            const imageUrl = cleanText(await img.getAttribute('src').catch(() => null));
            const caption = cleanText(await img.getAttribute('alt').catch(() => null));

            let postType: InstagramPostType = 'image';

            if (href.includes('/reel/')) {
                postType = 'video';
            } else {
                const textContent = (
                    await anchor.textContent().catch(() => null)
                )?.toLowerCase() || '';

                const hasCarouselIcon =
                    (await anchor.locator('svg[aria-label="Carousel"]').count().catch(() => 0)) > 0 ||
                    (await anchor.locator('svg[aria-label="Carrusel"]').count().catch(() => 0)) > 0;

                const hasVideoIcon =
                    (await anchor.locator('svg[aria-label="Video"]').count().catch(() => 0)) > 0;

                if (hasCarouselIcon || textContent.includes('carousel') || textContent.includes('carrusel')) {
                    postType = 'carousel';
                } else if (hasVideoIcon) {
                    postType = 'video';
                }
            }

            posts.push({
                postUrl,
                imageUrl,
                caption,
                postType,
                needsDetailFetch: postType !== 'image'
            });
        }

        if (posts.length >= maxPosts) break;

        await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight * 1.5);
        });

        await page.waitForTimeout(900);
    }

    return posts.slice(0, maxPosts);
}

export async function scrapeInstagramProfile(
    username: string
): Promise<InstagramScrapeResult> {
    const browser = await getBrowser();

    const context = await browser.newContext({
        storageState: 'cookies/instagram-state.json',
        viewport: { width: 1280, height: 1800 },
        userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    try {
        await optimizePage(page);

        await page.goto(`https://www.instagram.com/${username}/`, {
            waitUntil: 'domcontentloaded',
            timeout: 20000
        });

        await page.waitForTimeout(1400);
        await page.waitForSelector('article', { timeout: 10000 }).catch(() => { });

        const currentUrl = page.url();
        if (currentUrl.includes('/accounts/login')) {
            throw new Error('La sesión expiró. Vuelve a ejecutar npm run save:session');
        }

        const bodyText = (await page.locator('body').textContent().catch(() => '')) || '';

        const isPrivate =
            bodyText.includes('This account is private') ||
            bodyText.includes('Esta cuenta es privada');

        const privateMessage = isPrivate ? 'Este perfil está en privado' : null;

        const ogTitle = cleanText(
            await page
                .locator('meta[property="og:title"]')
                .getAttribute('content')
                .catch(() => null)
        );

        const ogDescription = cleanText(
            await page
                .locator('meta[property="og:description"]')
                .getAttribute('content')
                .catch(() => null)
        );

        const profilePicUrl =
            cleanText(
                await page
                    .locator('meta[property="og:image"]')
                    .getAttribute('content')
                    .catch(() => null)
            ) ||
            cleanText(
                await page.locator('header img').first().getAttribute('src').catch(() => null)
            );

        const fullName =
            extractFullNameFromOgTitle(ogTitle, username) ||
            cleanText(
                await page.locator('header h1').first().textContent().catch(() => null)
            ) ||
            cleanText(
                await page.locator('header h2').first().textContent().catch(() => null)
            ) ||
            username;

        const bio = (await extractVisibleBio(page)) || null;

        const { followers, following, postsCount } = parseCountsFromDescription(ogDescription);

        const posts = isPrivate ? [] : await collectPostLinks(page, 10);

        return {
            profile: {
                username,
                fullName,
                bio,
                profilePicUrl,
                coverPhotoUrl: posts[0]?.imageUrl || profilePicUrl,
                followers,
                following,
                postsCount,
                isPrivate,
                privateMessage
            },
            posts,
            scrapedAt: new Date().toISOString()
        };
    } finally {
        await page.close().catch(() => { });
        await context.close().catch(() => { });
    }
}