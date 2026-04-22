import express from 'express';
import cors from 'cors';
import type { BrowserContext } from 'playwright';
import { scrapeInstagramProfile } from './services/instagramScraper.js';
import { scrapePostDetail } from './services/postDetailScraper.js';
import { closeBrowser, getBrowser } from './services/browser.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

type CacheEntry = {
    data: unknown;
    expiresAt: number;
};

const profileCache = new Map<string, CacheEntry>();
const postDetailCache = new Map<string, CacheEntry>();

const PROFILE_CACHE_TTL_MS = 60 * 1000;
const POST_DETAIL_CACHE_TTL_MS = 10 * 60 * 1000;

app.get('/', (_req, res) => {
    res.json({ message: 'Backend funcionando' });
});

app.get('/api/instagram/:username', async (req, res) => {
    try {
        const { username } = req.params;

        if (!username) {
            res.status(400).json({ error: 'Debes enviar un username' });
            return;
        }

        const normalizedUsername = username.trim().toLowerCase();
        const now = Date.now();

        const cached = profileCache.get(normalizedUsername);
        if (cached && cached.expiresAt > now) {
            res.json(cached.data);
            return;
        }

        const data = await scrapeInstagramProfile(normalizedUsername);

        profileCache.set(normalizedUsername, {
            data,
            expiresAt: now + PROFILE_CACHE_TTL_MS
        });

        res.json(data);
    } catch (error) {
        console.error('Error real al scrapear perfil:', error);

        res.status(500).json({
            error: 'No se pudo extraer la información del perfil',
            detail: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});

app.get('/api/post-detail', async (req, res) => {
    try {
        const { url } = req.query;

        if (!url || typeof url !== 'string') {
            res.status(400).json({
                error: 'Falta la url del post'
            });
            return;
        }

        const normalizedUrl = url.trim();
        const now = Date.now();

        const cached = postDetailCache.get(normalizedUrl);
        if (cached && cached.expiresAt > now) {
            res.json(cached.data);
            return;
        }

        const data = await scrapePostDetail(normalizedUrl);

        postDetailCache.set(normalizedUrl, {
            data,
            expiresAt: now + POST_DETAIL_CACHE_TTL_MS
        });

        res.json(data);
    } catch (error) {
        console.error('Error real al scrapear detalle del post:', error);

        res.status(500).json({
            error: 'No se pudo extraer el detalle del post',
            detail: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});

app.get('/api/media', async (req, res) => {
    let context: BrowserContext | null = null;

    try {
        const { url } = req.query;

        if (!url || typeof url !== 'string') {
            res.status(400).json({ error: 'Falta la url del media' });
            return;
        }

        const browser = await getBrowser();

        context = await browser.newContext({
            storageState: 'cookies/instagram-state.json',
            userAgent:
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
        });

        const response = await context.request.get(url);

        if (!response.ok()) {
            res.status(response.status()).json({
                error: 'No se pudo obtener el media'
            });
            return;
        }

        const buffer = await response.body();
        const contentType =
            response.headers()['content-type'] || 'application/octet-stream';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.send(buffer);
    } catch (error) {
        console.error('Error real al servir media:', error);

        if (!res.headersSent) {
            res.status(500).json({
                error: 'No se pudo servir el media',
                detail: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    } finally {
        if (context) {
            await context.close().catch(() => { });
        }
    }
});

process.on('SIGINT', async () => {
    await closeBrowser();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await closeBrowser();
    process.exit(0);
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});