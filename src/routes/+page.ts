import { resolve } from '$app/paths';
import type { IndiceArchivo } from '#lib/modelo.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const respuesta = await fetch(resolve('/indice.json'));
	const indice: IndiceArchivo = await respuesta.json();
	return { indice };
};
