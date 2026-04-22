import { Browser, chromium } from 'playwright';

let browserPromise: Promise<Browser> | null = null;

export async function getBrowser(): Promise<Browser> { 
//función para obtener una instancia del navegador, reutilizando la misma instancia si ya se ha creado, 
// y configurando opciones para mejorar la estabilidad en entornos de servidor
    if (!browserPromise) {
        browserPromise = chromium.launch({
            headless: false,
            channel: 'chrome',
            timeout: 120000,
            args: [
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-background-networking',
                '--disable-renderer-backgrounding'
            ]
        });
    }

    return browserPromise;
}

export async function closeBrowser(): Promise<void> {
    if (!browserPromise) return;

    const browser = await browserPromise;
    await browser.close().catch(() => { });
    browserPromise = null;
}