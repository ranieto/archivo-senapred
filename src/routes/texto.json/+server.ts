import { cargarArchivo } from '#lib/server/archivo.ts';
import { crearTexto } from '#lib/server/indices.ts';

export const prerender = true;

export function GET() {
	return Response.json(crearTexto(cargarArchivo()));
}
