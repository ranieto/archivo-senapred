import { chromium } from '@playwright/test';

const [base = 'http://localhost:4173', destino = 'capturas'] = process.argv.slice(2);
const navegador = await chromium.launch();
const errores: string[] = [];
const indice = await (await fetch(`${base}/indice.json`)).json();
const masVersiones = indice.publicaciones.reduce((a: { versiones: number }, b: { versiones: number }) =>
	b.versiones > a.versiones ? b : a
);

for (const esquema of ['light', 'dark'] as const) {
	for (const [nombre, viewport] of [
		['escritorio', { width: 1366, height: 900 }],
		['telefono', { width: 390, height: 844 }]
	] as const) {
		const pagina = await navegador.newPage({ viewport, colorScheme: esquema, deviceScaleFactor: 2 });
		pagina.on('pageerror', (e) => errores.push(`${nombre} ${esquema}: ${e.message}`));
		pagina.on('console', (m) => m.type() === 'error' && errores.push(`${nombre} ${esquema}: ${m.text()}`));
		await pagina.goto(`${base}/?q=incendio+forestal&region=nuble`);
		await pagina.waitForSelector('[data-texto-listo="true"]');
		await pagina.screenshot({ path: `${destino}/inicio-${nombre}-${esquema}.png` });
		await pagina.goto(`${base}/${masVersiones.tipo}/${masVersiones.slug}/`);
		await pagina.screenshot({ path: `${destino}/detalle-${nombre}-${esquema}.png`, fullPage: false });
		await pagina.locator('#titulo-historial').scrollIntoViewIfNeeded();
		await pagina.evaluate(() => document.querySelector('#titulo-historial')?.scrollIntoView());
		await pagina.locator('.linea details summary').nth(2).click();
		await pagina.screenshot({ path: `${destino}/historial-${nombre}-${esquema}.png` });
		await pagina.close();
	}
}
await navegador.close();
console.log(errores.length ? errores.join('\n') : 'sin errores en consola');
