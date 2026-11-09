import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { connect, type GraphQL } from './aws.ts';

const DATA = join(import.meta.dirname, '..', 'data');
const PAGE_SIZE = 1000;
const MIN_FRACTION_OF_ARCHIVE = 0.9;
/** Fake posts that carry a third party's personal data. SENAPRED deleted them and the archive never keeps them. */
const EXCLUDED = new Set(['1cc87469-7e0d-40de-af2f-296a7a10b339', '385ddd81-bbc5-4c30-82e6-8975a75020b5']);
/** A full download runs at least this often, in case SENAPRED ever edits a record without touching `updatedAt`. */
const FULL_PASS_EVERY_MS = 24 * 60 * 60 * 1000;
/** Past this many new or changed records, one full download costs less than fetching each record. */
const MAX_SINGLE_FETCHES = 100;
const LIGHT_FIELDS = ['id', 'updatedAt'];

type Row = Record<string, unknown> & { id: string };

type Publications = {
	dir: string;
	type: string;
	field: string;
	get: string;
	fields: string[];
};

const COMMON = [
	'id',
	'type',
	'titulo',
	'fechaHora',
	'createdAt',
	'updatedAt',
	'urlAccess',
	'parentId',
	'isPrincipal',
	'isActive',
	'isDeleted',
	'regionesIds',
	'metaData',
	'contenido'
];

const PUBLICATIONS: Publications[] = [
	{
		dir: 'eventos',
		type: 'Evento',
		field: 'eventosByDate',
		get: 'getEvento',
		fields: [...COMMON, 'variableInformateEventosId']
	},
	{
		dir: 'alertas',
		type: 'Alerta',
		field: 'alertasByDate',
		get: 'getAlerta',
		fields: [...COMMON, 'tipoAlertaId', 'variableRiesgoAlertasId']
	}
];

type Catalog = { file: string; field: string; type: string | null; fields: string[] };

const CATALOGS: Catalog[] = [
	{ file: 'regiones', field: 'regionesByCodigo', type: 'Region', fields: ['id', 'codigo', 'nombre'] },
	{
		file: 'provincias',
		field: 'provinciasByCodigo',
		type: 'Provincia',
		fields: ['id', 'codigo', 'nombre', 'regionProvinciasId']
	},
	{
		file: 'comunas',
		field: 'comunasByCodigo',
		type: 'Comuna',
		fields: ['id', 'codigo', 'nombre', 'provinciaComunasId']
	},
	{
		file: 'variables-informate',
		field: 'variableInformateByNombre',
		type: 'VariableInformate',
		fields: ['id', 'codigo', 'nombre', 'iconImg', 'headerImg']
	},
	{
		file: 'variables-riesgo',
		field: 'variableRiesgoByNombre',
		type: 'VariableRiesgo',
		fields: ['id', 'codigo', 'nombre', 'iconImg', 'headerImg', 'tipoAlertaVariableRiesgosId']
	},
	{ file: 'tipos-alerta', field: 'listTipoAlertas', type: null, fields: ['id', 'codigo', 'nombre'] }
];

async function fetchAll(gql: GraphQL, field: string, type: string | null, fields: string[]) {
	const args = type
		? `type: $type, sortDirection: ASC, limit: ${PAGE_SIZE}, nextToken: $nextToken`
		: `limit: ${PAGE_SIZE}, nextToken: $nextToken`;
	const params = type ? '$type: String!, $nextToken: String' : '$nextToken: String';
	const query = `query (${params}) { ${field}(${args}) { items { ${fields.join(' ')} } nextToken } }`;
	const rows: Row[] = [];
	let nextToken: string | null = null;
	do {
		const data: Record<string, { items: Row[]; nextToken: string | null }> = await gql(
			query,
			type ? { type, nextToken } : { nextToken }
		);
		rows.push(...data[field].items);
		nextToken = data[field].nextToken;
	} while (nextToken);
	return rows;
}

function serialize(row: Row, fields: string[]) {
	return JSON.stringify(Object.fromEntries(fields.map((f) => [f, row[f] ?? null])), null, '\t') + '\n';
}

function writeIfChanged(path: string, content: string): 'nuevo' | 'cambiado' | null {
	const previous = existsSync(path) ? readFileSync(path, 'utf8') : null;
	if (previous === content) return null;
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, content);
	return previous === null ? 'nuevo' : 'cambiado';
}

function recordPath(dir: string, row: Row) {
	const created = typeof row.createdAt === 'string' ? row.createdAt : '';
	const [year, month] = /^\d{4}-\d{2}/.test(created) ? created.split('-') : ['sin-fecha', ''];
	return join(DATA, dir, year, month, `${row.id}.json`);
}

/** Path of every archived record, by id. */
function archivedPaths(dir: string) {
	const root = join(DATA, dir);
	if (!existsSync(root)) return new Map<string, string>();
	return new Map(
		readdirSync(root, { recursive: true, encoding: 'utf8' })
			.filter((f) => f.endsWith('.json'))
			.map((f) => [f.slice(f.lastIndexOf('/') + 1, -'.json'.length), join(root, f)])
	);
}

/**
 * Lists every record and returns the full content of those that need writing. A light pass lists only `id` and
 * `updatedAt`, then fetches the records that are new or whose `updatedAt` moved.
 */
async function currentRecords(gql: GraphQL, pub: Publications, archived: Map<string, string>, full: boolean) {
	const listed = (await fetchAll(gql, pub.field, pub.type, full ? pub.fields : LIGHT_FIELDS)).filter(
		(row) => !EXCLUDED.has(row.id)
	);
	if (full) return { listed, records: listed };
	const stale = listed.filter((row) => {
		const path = archived.get(row.id);
		return !path || JSON.parse(readFileSync(path, 'utf8')).updatedAt !== row.updatedAt;
	});
	if (stale.length > MAX_SINGLE_FETCHES) return currentRecords(gql, pub, archived, true);
	const query = `query ($id: ID!) { ${pub.get}(id: $id) { ${pub.fields.join(' ')} } }`;
	const records: Row[] = [];
	for (const { id } of stale) {
		const record = (await gql<Record<string, Row | null>>(query, { id }))[pub.get];
		if (record) records.push(record);
	}
	return { listed, records };
}

type Missing = Record<string, Record<string, string>>;
type State = { ultimaPasadaCompleta?: string };

async function main() {
	const now = new Date();
	const today = now.toISOString().slice(0, 10);
	const statePath = join(DATA, 'recoleccion.json');
	const state: State = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : {};
	const full =
		process.argv.includes('--completa') ||
		!state.ultimaPasadaCompleta ||
		now.getTime() - Date.parse(state.ultimaPasadaCompleta) >= FULL_PASS_EVERY_MS;
	const gql = await connect();
	const missingPath = join(DATA, 'ausentes.json');
	const missing: Missing = existsSync(missingPath) ? JSON.parse(readFileSync(missingPath, 'utf8')) : {};
	const lines: string[] = [];

	for (const pub of PUBLICATIONS) {
		const archived = archivedPaths(pub.dir);
		const { listed, records } = await currentRecords(gql, pub, archived, full);
		if (listed.length < archived.size * MIN_FRACTION_OF_ARCHIVE) {
			throw new Error(
				`${pub.dir}: la API devolvió ${listed.length} registros y el archivo tiene ${archived.size}. No se escribe nada.`
			);
		}
		const counts = { nuevo: 0, cambiado: 0 };
		for (const row of records) {
			const result = writeIfChanged(recordPath(pub.dir, row), serialize(row, pub.fields));
			if (result) counts[result]++;
		}
		const seen = new Set(listed.map((row) => row.id));
		const gone = (missing[pub.dir] ??= {});
		for (const id of Object.keys(gone)) if (seen.has(id)) delete gone[id];
		for (const id of archived.keys()) if (!seen.has(id)) gone[id] ??= today;
		lines.push(
			`${pub.dir}: ${listed.length} en la API, ${counts.nuevo} nuevos, ${counts.cambiado} cambiados, ${Object.keys(gone).length} ausentes`
		);
	}
	lines.push(full ? 'descarga completa' : 'descarga liviana');
	if (full) writeIfChanged(statePath, JSON.stringify({ ultimaPasadaCompleta: now.toISOString() }, null, '\t') + '\n');

	for (const cat of CATALOGS) {
		const rows = await fetchAll(gql, cat.field, cat.type, cat.fields);
		rows.sort((a, b) => String(a.codigo).localeCompare(String(b.codigo)) || a.id.localeCompare(b.id));
		const content =
			'[\n' + rows.map((r) => '\t' + JSON.stringify(Object.fromEntries(cat.fields.map((f) => [f, r[f] ?? null])))).join(',\n') + '\n]\n';
		writeIfChanged(join(DATA, 'catalogos', `${cat.file}.json`), content);
	}

	const sortedMissing = Object.fromEntries(
		Object.entries(missing).map(([dir, ids]) => [dir, Object.fromEntries(Object.entries(ids).sort())])
	);
	writeIfChanged(missingPath, JSON.stringify(sortedMissing, null, '\t') + '\n');

	const summary = lines.join('; ');
	console.log(summary);
	if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `resumen=${summary}\n`);
	if (process.env.GITHUB_STEP_SUMMARY) {
		appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.map((l) => `- ${l}`).join('\n') + '\n');
	}
}

await main();
