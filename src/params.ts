import { defineParams } from '@sveltejs/kit/params';
import { esTipo } from '#lib/modelo.ts';

export const params = defineParams({
	tipo: (param) => (esTipo(param) ? param : undefined)
});
