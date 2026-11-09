import { describe, expect, test } from 'vitest';
import { Buscador } from './buscador.ts';
import { FILTROS_VACIOS, escribirFiltros, leerFiltros, type Filtros } from './filtros.ts';
import type { FilaIndice, IndiceArchivo } from './modelo.ts';

function fila(campos: Partial<FilaIndice>): FilaIndice {
	return {
		tipo: 'evento',
		slug: 'x',
		titulo: 'Título',
		categoria: 0,
		nivel: null,
		regiones: [],
		comunas: '',
		inicio: '2025-01-01T12:00:00.000Z',
		fin: '2025-01-01T12:00:00.000Z',
		dias: ['2025-01-01'],
		versiones: 1,
		borrada: false,
		conBorrados: false,
		...campos
	};
}

const indice: IndiceArchivo = {
	generado: 'g',
	recolectado: '2025-07-01T00:00:00.000Z',
	categorias: [
		{ nombre: 'Evento hidrometeorológico', slug: 'evento-hidrometeorologico' },
		{ nombre: 'Sismo', slug: 'sismo' }
	],
	regiones: [
		{ codigo: 'XVI', nombre: 'Región de Ñuble', corto: 'Ñuble', slug: 'nuble' },
		{ codigo: 'VIII', nombre: 'Región del Biobío', corto: 'Biobío', slug: 'biobio' }
	],
	publicaciones: [
		fila({ slug: 'lluvia', titulo: 'Monitoreo por evento hidrometeorológico en Ñuble', regiones: [0], dias: ['2025-06-10'] }),
		fila({ slug: 'sismo', titulo: 'Sismo de menor intensidad', categoria: 1, regiones: [1], dias: ['2025-03-01'] }),
		fila({ slug: 'alerta', tipo: 'alerta', nivel: 'roja', categoria: 1, titulo: 'Se declara Alerta Roja para Chillán', regiones: [0], comunas: 'Chillán', dias: ['2024-12-01'] }),
		fila({ slug: 'borrada', titulo: 'Evento hidrometeorológico de prueba', borrada: true })
	]
};

const buscar = (b: Buscador, f: Partial<Filtros>) => b.buscar({ ...FILTROS_VACIOS, ...f });
const slugs = (b: Buscador, f: Partial<Filtros>) => buscar(b, f).filas.map((x) => x.pub.slug);

describe.each([
	['before the text index loads', async () => new Buscador(indice)],
	[
		'with the text index',
		async () => {
			const b = new Buscador(indice);
			await b.cargarTexto({ generado: 'g', textos: ['', 'Magnitud 4,1 cerca de Lebu', '', ''] });
			return b;
		}
	]
])('search %s', (_, crear) => {
	test('matches without accents or case', async () => {
		const b = await crear();
		expect(slugs(b, { q: 'HIDROMETEOROLOGICO' })).toEqual(['lluvia']);
		expect(slugs(b, { q: 'chillan' })).toEqual(['alerta']);
	});

	test('matches regions by name typed without ñ', async () => {
		const b = await crear();
		expect(slugs(b, { q: 'nuble' })).toEqual(['lluvia', 'alerta']);
	});
});

describe('filters', () => {
	const b = new Buscador(indice);

	test('hides publications deleted on the official site unless asked', () => {
		expect(slugs(b, {})).not.toContain('borrada');
		expect(slugs(b, { borradas: true })).toContain('borrada');
		expect(buscar(b, {}).facetas.borradas).toBe(1);
	});

	test('combine region, type, level and date range', () => {
		expect(slugs(b, { regiones: ['nuble'] })).toEqual(['lluvia', 'alerta']);
		expect(slugs(b, { regiones: ['nuble'], tipo: 'alerta' })).toEqual(['alerta']);
		expect(slugs(b, { niveles: ['roja'] })).toEqual(['alerta']);
		expect(slugs(b, { desde: '2025-01-01', hasta: '2025-12-31' })).toEqual(['lluvia', 'sismo']);
	});

	test('facet counts ignore their own selection but respect the others', () => {
		const { facetas } = buscar(b, { regiones: ['nuble'], tipo: 'evento' });
		expect(facetas.regiones.get('biobio')).toBe(1);
		expect(facetas.regiones.get('nuble')).toBe(1);
		expect(facetas.tipo).toEqual({ evento: 1, alerta: 1 });
	});

	test('a publication counts in each month it had a version and matches dates on any of them', () => {
		const b = new Buscador({
			...indice,
			publicaciones: [fila({ slug: 'actualizada', dias: ['2025-01-10', '2025-03-05'] }), fila({ slug: 'otra', dias: ['2025-02-01'] })]
		});
		expect(Object.fromEntries(buscar(b, {}).facetas.meses)).toEqual({ '2025-01': 1, '2025-02': 1, '2025-03': 1 });
		expect(slugs(b, { desde: '2025-03-01', hasta: '2025-03-31' })).toEqual(['actualizada']);
		expect(slugs(b, { desde: '2025-02-01', hasta: '2025-02-28' })).toEqual(['otra']);
	});

	test('oldest first reverses the order', () => {
		expect(slugs(b, { orden: 'antiguas' })).toEqual(['alerta', 'sismo', 'lluvia']);
	});
});

describe('URL state', () => {
	test('round-trips every filter', () => {
		const f: Filtros = {
			q: 'lluvia en ñuble',
			tipo: 'alerta',
			categorias: ['sismo', 'otros'],
			regiones: ['nuble'],
			niveles: ['roja', 'amarilla'],
			desde: '2024-01-01',
			hasta: '2024-12-31',
			borradas: true,
			orden: 'antiguas'
		};
		expect(leerFiltros(new URLSearchParams(escribirFiltros(f)))).toEqual(f);
	});

	test('empty filters make an empty query string, and junk is ignored', () => {
		expect(escribirFiltros(FILTROS_VACIOS)).toBe('');
		expect(leerFiltros(new URLSearchParams('tipo=foo&nivel=verde,roja&desde=ayer'))).toEqual({
			...FILTROS_VACIOS,
			niveles: ['roja']
		});
	});
});
