import express from 'express';
import cors from 'cors';
import { scrapeInstagramProfile } from './services/instagramScraper.js';
import { scrapePostDetail } from './services/postDetailScraper.js';
import { closeBrowser } from './services/browser.js';

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

const CACHE_TTL_MS = 60 * 1000;
const DETAIL_CACHE_TTL_MS = 5 * 60 * 1000;

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
            expiresAt: now + CACHE_TTL_MS
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
            expiresAt: now + DETAIL_CACHE_TTL_MS
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