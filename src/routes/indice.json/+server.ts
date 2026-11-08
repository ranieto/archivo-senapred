import { cargarArchivo } from '#lib/server/archivo.ts';
import { crearIndice } from '#lib/server/indices.ts';

export const prerender = true;

export function GET() {
	return Response.json(crearIndice(cargarArchivo()));
}
