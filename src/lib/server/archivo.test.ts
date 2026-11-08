import { describe, expect, test } from 'vitest';
import { agruparPublicaciones, crearCatalogos, parsearRegistro } from './archivo.ts';
import type { Tipo } from '#lib/modelo.ts';

const catalogos = crearCatalogos({
	regiones: [
		{ id: 'r-nuble', codigo: 'XVI', nombre: 'Región de Ñuble' },
		{ id: 'r-arica', codigo: 'XV', nombre: 'Región de Arica y Parinacota' }
	],
	variablesInformate: [{ id: 'cat-sismo', nombre: 'Sismo' }],
	variablesRiesgo: [{ id: 'cat-viento', nombre: 'Viento - Temporal viento' }],
	tiposAlerta: [
		{ id: 'ta-a', codigo: 'a', nombre: 'Alerta Amarilla' },
		{ id: 'ta-r', codigo: 'r', nombre: 'Alerta Roja' },
		{ id: 'ta-v', codigo: 'v', nombre: 'Alerta Verde' }
	]
});

function registro(tipo: Tipo, campos: Record<string, unknown>) {
	return parsearRegistro(
		{
			id: 'id',
			type: tipo === 'evento' ? 'Evento' : 'Alerta',
			titulo: 'Título',
			fechaHora: '2025-06-01T10:00:00.000-04:00',
			createdAt: '2025-06-01T14:00:00.000Z',
			updatedAt: '2025-06-01T14:00:00.000Z',
			urlAccess: 'slug',
			parentId: 'parent',
			isPrincipal: false,
			isActive: true,
			isDeleted: false,
			regionesIds: ['r-nuble'],
			metaData: JSON.stringify({ provincias: 'Diguillín', comunas: 'Chillán, Bulnes', regiones: 'Región de Ñuble' }),
			contenido: '<p>Hola</p>',
			...(tipo === 'evento'
				? { variableInformateEventosId: 'cat-sismo' }
				: { variableRiesgoAlertasId: 'cat-viento', tipoAlertaId: 'ta-a' }),
			...campos
		},
		tipo
	);
}

describe('agruparPublicaciones', () => {
	test('groups records by urlAccess within each type, versions in creation order', () => {
		const pubs = agruparPublicaciones(
			[
				registro('evento', { id: 'b', urlAccess: 'uno', createdAt: '2025-06-02T00:00:00.000Z', titulo: 'Segunda' }),
				registro('evento', { id: 'a', urlAccess: 'uno', createdAt: '2025-06-01T00:00:00.000Z', titulo: 'Primera' }),
				registro('evento', { id: 'c', urlAccess: 'dos' }),
				registro('alerta', { id: 'd', urlAccess: 'uno' })
			],
			catalogos
		);
		const uno = pubs.find((p) => p.tipo === 'evento' && p.slug === 'uno');
		expect(pubs).toHaveLength(3);
		expect(uno?.versiones.map((v) => [v.numero, v.titulo])).toEqual([
			[1, 'Primera'],
			[2, 'Segunda']
		]);
	});

	test('uses createdAt as the date of deleted records, never the overwritten 2000-01-01', () => {
		const [pub] = agruparPublicaciones(
			[
				registro('evento', {
					isDeleted: true,
					fechaHora: '2000-01-01T00:00:00.000-03:00',
					createdAt: '2024-03-05T12:30:00.000Z'
				})
			],
			catalogos
		);
		expect(pub?.actual.fecha).toBe('2024-03-05T12:30:00.000Z');
		expect(pub?.inicio).toBe('2024-03-05T12:30:00.000Z');
		expect(pub?.borrada).toBe(true);
	});

	test('reads fechaHora with four-digit fractions', () => {
		const [pub] = agruparPublicaciones(
			[registro('evento', { fechaHora: '2026-03-12T21:04:18.1818-03:00' })],
			catalogos
		);
		expect(pub?.actual.fecha).toBe('2026-03-13T00:04:18.181Z');
	});

	test('uses createdAt when fechaHora is years before the record existed', () => {
		const [pub] = agruparPublicaciones(
			[registro('evento', { fechaHora: '2020-04-20T09:30:00.000-04:00', createdAt: '2026-04-20T14:03:21.526Z' })],
			catalogos
		);
		expect(pub?.inicio).toBe('2026-04-20T14:03:21.526Z');
	});

	test('current version is the principal one that is not deleted', () => {
		const [pub] = agruparPublicaciones(
			[
				registro('evento', { id: 'a', createdAt: '2025-01-01T00:00:00.000Z', isPrincipal: true, titulo: 'Principal' }),
				registro('evento', { id: 'b', createdAt: '2025-01-02T00:00:00.000Z', titulo: 'Posterior' })
			],
			catalogos
		);
		expect(pub?.titulo).toBe('Principal');
	});

	test('without a principal, current version is the latest one still published', () => {
		const [pub] = agruparPublicaciones(
			[
				registro('evento', { id: 'a', createdAt: '2025-01-01T00:00:00.000Z', titulo: 'Vieja' }),
				registro('evento', { id: 'b', createdAt: '2025-01-02T00:00:00.000Z', titulo: 'Viva' }),
				registro('evento', { id: 'c', createdAt: '2025-01-03T00:00:00.000Z', titulo: 'Borrada', isDeleted: true })
			],
			catalogos
		);
		expect(pub?.titulo).toBe('Viva');
		expect(pub?.borrada).toBe(false);
		expect(pub?.conBorrados).toBe(true);
	});

	test('when every version is deleted, current version is the latest', () => {
		const [pub] = agruparPublicaciones(
			[
				registro('evento', { id: 'a', createdAt: '2025-01-01T00:00:00.000Z', titulo: 'Uno', isDeleted: true }),
				registro('evento', { id: 'b', createdAt: '2025-01-02T00:00:00.000Z', titulo: 'Dos', isDeleted: true })
			],
			catalogos
		);
		expect(pub?.titulo).toBe('Dos');
		expect(pub?.conBorrados).toBe(false);
	});

	test('maps the alert type to its level', () => {
		const niveles = agruparPublicaciones(
			[
				registro('alerta', { urlAccess: 'v', tipoAlertaId: 'ta-v' }),
				registro('alerta', { urlAccess: 'a', tipoAlertaId: 'ta-a' }),
				registro('alerta', { urlAccess: 'r', tipoAlertaId: 'ta-r' }),
				registro('evento', { urlAccess: 'e' })
			],
			catalogos
		).map((p) => [p.slug, p.nivel]);
		expect(Object.fromEntries(niveles)).toEqual({ v: 'preventiva', a: 'amarilla', r: 'roja', e: null });
	});

	test('resolves places and orders regions north to south', () => {
		const [pub] = agruparPublicaciones(
			[registro('evento', { regionesIds: ['r-nuble', 'r-arica'] })],
			catalogos
		);
		expect(pub?.regiones.map((r) => r.corto)).toEqual(['Arica y Parinacota', 'Ñuble']);
		expect(pub?.comunas).toEqual(['Chillán', 'Bulnes']);
		expect(pub?.categoria).toBe('Sismo');
	});

	test('shortens slugs too long for a file name, keeping the official one', () => {
		const largo = `se-declara-alerta-${'comuna-'.repeat(40)}por-viento-2026-09-04-13-28-39`;
		const pubs = agruparPublicaciones(
			[
				registro('alerta', { id: 'a', urlAccess: largo }),
				registro('alerta', { id: 'b', urlAccess: `${largo}-2` }),
				registro('alerta', { id: 'c', urlAccess: 'corto' })
			],
			catalogos
		);
		const slugs = pubs.map((p) => p.slug);
		expect(new Set(slugs).size).toBe(3);
		expect(Math.max(...slugs.map((s) => s.length))).toBeLessThanOrEqual(120);
		expect(slugs).toContain('corto');
		expect(pubs.map((p) => p.urlAccess).sort()).toEqual([largo, `${largo}-2`, 'corto'].sort());
	});
});
