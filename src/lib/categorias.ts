import type { LucideIcon } from '@lucide/svelte';
import Activity from '@lucide/svelte/icons/activity';
import Biohazard from '@lucide/svelte/icons/biohazard';
import CircleDot from '@lucide/svelte/icons/circle-dot';
import CloudLightning from '@lucide/svelte/icons/cloud-lightning';
import CloudRain from '@lucide/svelte/icons/cloud-rain';
import CloudSnow from '@lucide/svelte/icons/cloud-snow';
import Droplets from '@lucide/svelte/icons/droplets';
import DropletOff from '@lucide/svelte/icons/droplet-off';
import Flame from '@lucide/svelte/icons/flame';
import FlameKindling from '@lucide/svelte/icons/flame-kindling';
import FlaskConical from '@lucide/svelte/icons/flask-conical';
import Fuel from '@lucide/svelte/icons/fuel';
import MountainSnow from '@lucide/svelte/icons/mountain-snow';
import Phone from '@lucide/svelte/icons/phone';
import Snowflake from '@lucide/svelte/icons/snowflake';
import ThermometerSnowflake from '@lucide/svelte/icons/thermometer-snowflake';
import ThermometerSun from '@lucide/svelte/icons/thermometer-sun';
import Tornado from '@lucide/svelte/icons/tornado';
import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
import UserSearch from '@lucide/svelte/icons/user-search';
import Waves from '@lucide/svelte/icons/waves';
import Wind from '@lucide/svelte/icons/wind';
import Zap from '@lucide/svelte/icons/zap';
import { normalizar } from './texto.ts';

/** Color families; each maps to a `--fam-<name>` CSS custom property. */
export type Familia =
	| 'sismo'
	| 'fuego'
	| 'agua'
	| 'clima'
	| 'volcan'
	| 'suministro'
	| 'materiales'
	| 'personas'
	| 'otros';

export interface EstiloCategoria {
	familia: Familia;
	icono: LucideIcon;
}

const entrada = (familia: Familia, icono: EstiloCategoria['icono']): EstiloCategoria => ({ familia, icono });

/** Keyed by folded category name, as it appears in SENAPRED's catalogs. */
const REGISTRO: Record<string, EstiloCategoria> = {
	sismo: entrada('sismo', Activity),
	terremoto: entrada('sismo', Activity),
	tsunami: entrada('sismo', Waves),
	'remocion en masa': entrada('sismo', TriangleAlert),
	deslizamientos: entrada('sismo', TriangleAlert),
	'incendio forestal': entrada('fuego', Flame),
	'incendio estructural': entrada('fuego', FlameKindling),
	'inundaciones - anegamientos': entrada('agua', Droplets),
	'precipitaciones - sistema frontal': entrada('agua', CloudRain),
	'precipitaciones estivales altiplanicas': entrada('agua', CloudRain),
	'evento hidrometeorologico': entrada('agua', CloudRain),
	marejadas: entrada('agua', Waves),
	'deficit hidrico - sequia': entrada('agua', DropletOff),
	'viento - temporal viento': entrada('clima', Wind),
	'tormentas electricas': entrada('clima', CloudLightning),
	'tornado - tromba marina': entrada('clima', Tornado),
	'tromba marina': entrada('clima', Tornado),
	'tormenta de polvo': entrada('clima', Wind),
	'ola calor - altas temperaturas': entrada('clima', ThermometerSun),
	'heladas - bajas temperaturas': entrada('clima', ThermometerSnowflake),
	'nucleo frio en altura': entrada('clima', ThermometerSnowflake),
	nevadas: entrada('clima', Snowflake),
	invierno: entrada('clima', CloudSnow),
	'invierno - zona austral': entrada('clima', CloudSnow),
	'enos - el nino y la nina': entrada('clima', Waves),
	'actividad volcanica': entrada('volcan', MountainSnow),
	'corte de suministro - agua': entrada('suministro', DropletOff),
	'corte de suministro - electricidad': entrada('suministro', Zap),
	'corte de suministro - telefonia': entrada('suministro', Phone),
	'corte de suministro - combustible': entrada('suministro', Fuel),
	'materiales peligrosos - inflamable': entrada('materiales', Flame),
	'materiales peligrosos - toxicos': entrada('materiales', FlaskConical),
	'materiales peligrosos - peligro bioquimico': entrada('materiales', Biohazard),
	'materiales peligrosos - radioactividad': entrada('materiales', Biohazard),
	'personas desaparecidas': entrada('personas', UserSearch),
	otros: entrada('otros', CircleDot)
};

const OTROS = entrada('otros', CircleDot);

export function estiloCategoria(nombre: string): EstiloCategoria {
	return REGISTRO[normalizar(nombre)] ?? OTROS;
}
