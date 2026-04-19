import { chromium } from 'playwright';
import readline from 'node:readline';

async function main() {
    const browser = await chromium.launch({
        headless: false
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://www.instagram.com/', {
        waitUntil: 'domcontentloaded'
    });

    console.log('Inicia sesión manualmente en Instagram en la ventana que se abrió.');
    console.log('Cuando ya hayas iniciado sesión y veas tu cuenta cargada, presiona ENTER aquí en la terminal.');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('', async () => {
        await context.storageState({ path: 'cookies/instagram-state.json' });
        console.log('Sesión guardada correctamente en cookies/instagram-state.json');

        rl.close();
        await browser.close();
        process.exit(0);
    });
}

main().catch((error) => {
    console.error('Error al guardar la sesión:', error);
    process.exit(1);
});