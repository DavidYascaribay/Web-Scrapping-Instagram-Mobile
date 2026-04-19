import express from 'express';
import cors from 'cors';
import { scrapeInstagramProfile } from './services/instagramScraper.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
    res.json({ message: 'Backend funcionando' });
});

app.get('/api/instagram/:username', async (req, res) => {
    try {
        const { username } = req.params;

        if (!username) {
            res.status(400).json({
                error: 'Debes enviar un username'
            });
            return;
        }

        const data = await scrapeInstagramProfile(username);
        res.json(data);
    } catch (error) {
        console.error('Error real al scrapear perfil:', error);

        res.status(500).json({
            error: 'No se pudo extraer la información del perfil',
            detail: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});