/**
 * Drives the built site the way a person would. Run against `npm run preview`:
 *   node scripts/verificar.ts http://localhost:4173
 */
import assert from 'node:assert/strict';
import { chromium, type Page } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:4173';
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1366, height: 900 } });
const errores: string[] = [];
pagina.on('pageerror', (e) => errores.push(e.message));

const paso = (texto: string) => console.log(`ok  ${texto}`);
const total = async (p: Page) => Number((await p.locator('#titulo-resultados').innerText()).replace(/\D/g, '')) || 0;
const params = (p: Page) => new URL(p.url()).searchParams;

await pagina.goto(`${base}/`);
await pagina.waitForSelector('[data-texto-listo="true"]');
assert.equal(await pagina.evaluate(() => document.activeElement?.id), 'consulta');
paso('search box has focus on load');

await pagina.locator('#consulta').fill('hidrometeorologico');
await pagina.waitForFunction(() => new URL(location.href).searchParams.get('q') === 'hidrometeorologico');
const conConsulta = await total(pagina);
assert.ok(conConsulta > 0, 'unaccented query finds results');
const marcas = await pagina.locator('.lista mark').allInnerTexts();
assert.ok(
	marcas.some((m) => m.toLowerCase().startsWith('hidrometeorológic')),
	`highlights the accented word, got ${marcas.slice(0, 5).join(', ')}`
);
paso(`"hidrometeorologico" finds ${conConsulta} publications and highlights "hidrometeorológico"`);

const nuble = pagina.locator('.lateral .region', { hasText: 'Ñuble' });
await nuble.click();
await pagina.waitForFunction(() => new URL(location.href).searchParams.get('region') === 'nuble');
const conRegion = await total(pagina);
assert.ok(conRegion > 0 && conRegion < conConsulta, `region narrows ${conConsulta} to ${conRegion}`);
assert.equal(await nuble.getAttribute('aria-pressed'), 'true');
paso(`Región = Ñuble narrows to ${conRegion}`);

const urlFiltrada = pagina.url();
await pagina.goto(urlFiltrada);
await pagina.waitForSelector('[data-texto-listo="true"]');
assert.equal(await pagina.locator('#consulta').inputValue(), 'hidrometeorologico');
assert.equal(await pagina.locator('.lateral .region', { hasText: 'Ñuble' }).getAttribute('aria-pressed'), 'true');
assert.equal(await total(pagina), conRegion);
paso('reloading the URL restores query, region and count');

await pagina.goBack();
await pagina.waitForFunction(() => !new URL(location.href).searchParams.has('region'));
assert.equal(await pagina.locator('.lateral .region', { hasText: 'Ñuble' }).getAttribute('aria-pressed'), 'false');
assert.equal(await total(pagina), conConsulta);
paso('back button removes the region filter');

await pagina.goto(`${base}/`);
const sinBorradas = await total(pagina);
const borradasTexto = await pagina.locator('.lateral .interruptor .n').innerText();
await pagina.locator('.lateral .interruptor').click();
await pagina.waitForFunction(() => new URL(location.href).searchParams.get('borradas') === '1');
const conBorradas = await total(pagina);
assert.equal(conBorradas - sinBorradas, Number(borradasTexto.replace(/\D/g, '')));
assert.ok((await pagina.locator('.lista .resultado.borrada').count()) > 0 || conBorradas > sinBorradas);
paso(`including deleted publications adds ${conBorradas - sinBorradas} (${sinBorradas} to ${conBorradas})`);

await pagina.goto(`${base}/?tipo=alerta&nivel=roja&desde=2025-01-01&hasta=2025-12-31&orden=antiguas`);
await pagina.waitForFunction(() => document.querySelectorAll('.lista .resultado').length > 0);
const p = params(pagina);
assert.equal(p.get('nivel'), 'roja');
assert.equal(await pagina.locator('.tipos button[aria-pressed="true"]').innerText().then((t) => t.split(/\s/)[0]), 'Alertas');
assert.equal(await pagina.locator('.orden select').inputValue(), 'antiguas');
assert.equal(await pagina.locator('.lateral input[type="date"]').first().inputValue(), '2025-01-01');
const insignias = await pagina.locator('.lista .nivel').allInnerTexts();
assert.ok(insignias.length > 0 && insignias.every((t) => t === 'Alerta Roja'), 'every result is a red alert');
paso(`a shared link restores type, level, dates and order (${await total(pagina)} red alerts in 2025)`);

const indice = await (await fetch(`${base}/indice.json`)).json();
const masVersiones = indice.publicaciones.reduce((a: { versiones: number }, b: { versiones: number }) =>
	b.versiones > a.versiones ? b : a
);
await pagina.goto(`${base}/`);
await pagina.locator('#consulta').fill(masVersiones.titulo);
await pagina.locator(`.lista a[href*="${masVersiones.slug}"]`).first().click();
await pagina.waitForURL(`**/${masVersiones.tipo}/${masVersiones.slug}/`);
const versiones = pagina.locator('.linea .version');
assert.equal(await versiones.count(), masVersiones.versiones);
paso(`opened "${masVersiones.titulo.slice(0, 60)}…" with ${masVersiones.versiones} versions in its timeline`);

const resumen = pagina.locator('.linea details summary').first();
await resumen.click();
assert.ok(await pagina.locator('.linea details[open] .prosa').first().isVisible());
paso('a past version expands to show its content');

const conBorradasDetalle = await pagina.locator('.linea .version.borrada').count();
if (conBorradasDetalle > 0) {
	await pagina.locator('label[for="ocultar-borradas"]').click();
	const visibles = await versiones.evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent !== null).length);
	assert.equal(visibles, masVersiones.versiones - conBorradasDetalle);
	paso(`hiding deleted versions leaves ${visibles} of ${masVersiones.versiones}`);
}

const conBorrado = indice.publicaciones.find((x: { conBorrados: boolean }) => x.conBorrados);
await pagina.goto(`${base}/${conBorrado.tipo}/${conBorrado.slug}/`);
const borradasEn = await pagina.locator('.linea .version.borrada').count();
assert.ok(borradasEn > 0);
await pagina.locator('label[for="ocultar-borradas"]').click();
assert.equal(await pagina.locator('.linea .version.borrada').first().isVisible(), false);
const fechas = await pagina.locator('time').evaluateAll((els) => els.map((e) => e.getAttribute('datetime') ?? ''));
assert.ok(fechas.length > 0 && fechas.every((f) => !f.startsWith('2000')), 'never shows the overwritten year 2000');
paso(`deleted versions are marked (${borradasEn}) and can be hidden; no "2000" dates`);

await navegador.close();
assert.deepEqual(errores, [], 'no page errors');
paso('no JavaScript errors');
