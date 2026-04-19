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

function extractFullNameFromOgTitle(ogTitle: string | null, username: string): string | null {
    if (!ogTitle) return null;

    // Ejemplo:
    // National Geographic (@natgeo) • Instagram photos and videos
    const match = ogTitle.match(/^(.*?)\s+\(@/);
    const fullName = match?.[1]?.trim() || null;

    if (!fullName || fullName.toLowerCase() === username.toLowerCase()) {
        return username;
    }

    return fullName;
}

function extractBioFromDescription(description: string | null): string | null {
    if (!description) return null;

    // Meta description suele venir así:
    // 274M Followers, 193 Following, 31,558 Posts - Step into wonder...
    // o en español:
    // 274 M seguidores, 193 seguidos, 31.558 publicaciones - ...
    const parts = description.split(' - ');
    if (parts.length < 2) return null;

    return cleanText(parts.slice(1).join(' - '));
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

    const followers =
        extractCount(description, 'Followers') ||
        extractCount(description, 'seguidores');

    const following =
        extractCount(description, 'Following') ||
        extractCount(description, 'seguidos');

    const postsCount =
        extractCount(description, 'Posts') ||
        extractCount(description, 'publicaciones');

    return {
        followers,
        following,
        postsCount
    };
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

        const bodyText = (await page.locator('body').textContent().catch(() => '')) || '';

        const isPrivate =
            bodyText.includes('This account is private') ||
            bodyText.includes('Esta cuenta es privada');

        const privateMessage = isPrivate
            ? 'Este perfil está en privado'
            : null;

        const ogTitle = cleanText(
            await page.locator('meta[property="og:title"]').getAttribute('content').catch(() => null)
        );

        const ogDescription = cleanText(
            await page.locator('meta[property="og:description"]').getAttribute('content').catch(() => null)
        );

        const profilePicUrl = cleanText(
            await page.locator('meta[property="og:image"]').getAttribute('content').catch(() => null)
        ) || cleanText(
            await page.locator('header img').first().getAttribute('src').catch(() => null)
        );

        const fullName =
            extractFullNameFromOgTitle(ogTitle, username) ||
            cleanText(await page.locator('header h1').first().textContent().catch(() => null)) ||
            cleanText(await page.locator('header h2').first().textContent().catch(() => null)) ||
            username;

        const bio =
            extractBioFromDescription(ogDescription) ||
            cleanText(await page.locator('header section div span').first().textContent().catch(() => null)) ||
            cleanText(await page.locator('header div span').nth(1).textContent().catch(() => null)) ||
            null;

        const { followers, following, postsCount } = parseCountsFromDescription(ogDescription);

        const posts: InstagramPost[] = [];

        if (!isPrivate) {
            await page.waitForTimeout(2000);

            const postAnchors = page.locator('a[href*="/p/"]');
            const totalAnchors = await postAnchors.count();
            const seen = new Set<string>();

            for (let i = 0; i < totalAnchors && posts.length < 10; i++) {
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

                posts.push({
                    postUrl,
                    imageUrl,
                    caption
                });
            }
        }

        return {
            profile: {
                username,
                fullName,
                bio,
                profilePicUrl,
                coverPhotoUrl: profilePicUrl,
                followers,
                following,
                postsCount,
                isPrivate,
                privateMessage
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