import { chromium } from 'playwright';
import readline from 'node:readline';

async function main() { //función principal para abrir una ventana de navegador, 
// permitir al usuario iniciar sesión manualmente en Instagram, 
// y luego guardar el estado de la sesión en un archivo para su uso posterior en el scraper
    const browser = await chromium.launch({
        headless: false
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://www.instagram.com/', { 
        //navega a Instagram y espera a que se cargue el contenido para que el usuario pueda iniciar sesión
        waitUntil: 'domcontentloaded'
    });

    console.log('Inicia sesión manualmente en Instagram en la ventana que se abrió.');
    console.log('Cuando ya hayas iniciado sesión y veas tu cuenta cargada, presiona ENTER aquí en la terminal.');

    const rl = readline.createInterface({ 
        //configura la interfaz de readline para esperar a que el usuario presione ENTER después de iniciar sesión
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