<script lang="ts">
	import type { Facetas } from '#lib/buscador.ts';
	import { alternar, type Filtros } from '#lib/filtros.ts';
	import { diaChile, sumarDias } from '#lib/fechas.ts';
	import { NIVELES, NOMBRE_NIVEL, type IndiceArchivo } from '#lib/modelo.ts';
	import IconoCategoria from './IconoCategoria.svelte';

	let {
		indice,
		facetas,
		filtros,
		anios,
		navegar
	}: {
		indice: IndiceArchivo;
		facetas: Facetas;
		filtros: Filtros;
		anios: string[];
		navegar: (cambios: Partial<Filtros>) => void;
	} = $props();

	const VISIBLES = 8;
	let todasCategorias = $state(false);

	const maxRegion = $derived(Math.max(1, ...facetas.regiones.values()));
	const categorias = $derived(
		indice.categorias
			.map((c) => ({ ...c, n: facetas.categorias.get(c.slug) ?? 0, elegida: filtros.categorias.includes(c.slug) }))
			.filter((c) => c.n > 0 || c.elegida)
			.sort((a, b) => Number(b.elegida) - Number(a.elegida) || b.n - a.n)
	);
	const categoriasVisibles = $derived(todasCategorias ? categorias : categorias.slice(0, VISIBLES));

	const hoy = diaChile(new Date());
	const presets = $derived([
		{ etiqueta: 'Últimos 30 días', desde: sumarDias(hoy, -30), hasta: null },
		{ etiqueta: 'Últimos 12 meses', desde: sumarDias(hoy, -365), hasta: null },
		...anios.map((a) => ({ etiqueta: a, desde: `${a}-01-01`, hasta: `${a}-12-31` }))
	]);
	const presetActivo = (p: { desde: string; hasta: string | null }) =>
		filtros.desde === p.desde && filtros.hasta === p.hasta;

	const mostrarNiveles = $derived(filtros.tipo !== 'evento');
</script>

<div class="panel">
	<fieldset class="grupo">
		<legend>Fecha de publicación</legend>
		<div class="presets">
			{#each presets as p (p.etiqueta)}
				<button
					type="button"
					class="chip"
					aria-pressed={presetActivo(p)}
					onclick={() => navegar(presetActivo(p) ? { desde: null, hasta: null } : { desde: p.desde, hasta: p.hasta })}
				>
					{p.etiqueta}
				</button>
			{/each}
		</div>
		<div class="rango">
			<label>
				<span>Desde</span>
				<input
					type="date"
					value={filtros.desde ?? ''}
					min="2023-01-01"
					onchange={(e) => navegar({ desde: e.currentTarget.value || null })}
				/>
			</label>
			<label>
				<span>Hasta</span>
				<input
					type="date"
					value={filtros.hasta ?? ''}
					min="2023-01-01"
					onchange={(e) => navegar({ hasta: e.currentTarget.value || null })}
				/>
			</label>
		</div>
	</fieldset>

	{#if mostrarNiveles}
		<fieldset class="grupo">
			<legend>Nivel de alerta</legend>
			<div class="niveles">
				{#each NIVELES as nivel (nivel)}
					<button
						type="button"
						class="nivel {nivel}"
						aria-pressed={filtros.niveles.includes(nivel)}
						onclick={() => navegar({ niveles: alternar(filtros.niveles, nivel) })}
					>
						<span class="muestra" aria-hidden="true"></span>
						<span class="nombre">{NOMBRE_NIVEL[nivel]}</span>
						<span class="n">{facetas.niveles[nivel].toLocaleString('es-CL')}</span>
					</button>
				{/each}
			</div>
		</fieldset>
	{/if}

	<fieldset class="grupo">
		<legend>Categoría</legend>
		<ul class="categorias">
			{#each categoriasVisibles as c (c.slug)}
				<li>
					<label class="categoria">
						<input
							type="checkbox"
							checked={c.elegida}
							onchange={() => navegar({ categorias: alternar(filtros.categorias, c.slug) })}
						/>
						<IconoCategoria categoria={c.nombre} tamano={13} />
						<span class="nombre">{c.nombre}</span>
						<span class="n">{c.n.toLocaleString('es-CL')}</span>
					</label>
				</li>
			{/each}
		</ul>
		{#if categorias.length > VISIBLES}
			<button type="button" class="mas" onclick={() => (todasCategorias = !todasCategorias)}>
				{todasCategorias ? 'Mostrar menos' : `Mostrar las ${categorias.length} categorías`}
			</button>
		{/if}
	</fieldset>

	<fieldset class="grupo">
		<legend>Región</legend>
		<ul class="chile">
			{#each indice.regiones as r (r.slug)}
				{@const n = facetas.regiones.get(r.slug) ?? 0}
				{@const elegida = filtros.regiones.includes(r.slug)}
				<li>
					<button
						type="button"
						class="region"
						class:vacia={n === 0 && !elegida}
						aria-pressed={elegida}
						title={r.nombre}
						onclick={() => navegar({ regiones: alternar(filtros.regiones, r.slug) })}
					>
						<span class="hito" aria-hidden="true"></span>
						<span class="nombre">{r.corto}</span>
						<span class="barra" aria-hidden="true"><span style:width="{(n / maxRegion) * 100}%"></span></span>
						<span class="n">{n.toLocaleString('es-CL')}</span>
					</button>
				</li>
			{/each}
		</ul>
	</fieldset>

	<div class="grupo">
		<label class="interruptor">
			<input type="checkbox" checked={filtros.borradas} onchange={(e) => navegar({ borradas: e.currentTarget.checked })} />
			<span class="pista" aria-hidden="true"></span>
			<span>
				Incluir las borradas en el sitio oficial
				<span class="n">{facetas.borradas.toLocaleString('es-CL')}</span>
			</span>
		</label>
	</div>
</div>

<style>
	.panel {
		display: grid;
		gap: 1.75rem;
	}
	.grupo {
		border: 0;
		margin: 0;
		padding: 0;
		min-width: 0;
	}
	legend {
		padding: 0;
		margin-bottom: 0.6rem;
		font-family: var(--serif);
		font-size: 1rem;
		font-weight: 600;
		font-variation-settings: 'opsz' 18;
	}
	.n {
		font-size: 0.8rem;
		color: var(--tinta-3);
		font-variant-numeric: tabular-nums;
	}
	.presets {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.chip {
		border: 1px solid var(--linea);
		background: transparent;
		border-radius: 999px;
		padding: 0.25rem 0.65rem;
		font-size: 0.85rem;
		color: var(--tinta-2);
	}
	.chip:hover {
		border-color: var(--tinta-3);
		color: var(--tinta);
	}
	.chip[aria-pressed='true'] {
		background: var(--tinta);
		border-color: var(--tinta);
		color: var(--papel);
	}
	.rango {
		margin-top: 0.75rem;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}
	.rango label {
		display: grid;
		gap: 0.15rem;
		font-size: 0.78rem;
		color: var(--tinta-3);
	}
	.rango input {
		width: 100%;
		min-width: 0;
		padding: 0.3rem 0.4rem;
		border: 1px solid var(--linea);
		border-radius: var(--radio);
		background: var(--superficie);
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
	}

	.niveles {
		display: grid;
		gap: 0.3rem;
	}
	.nivel {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 0.55rem;
		padding: 0.35rem 0.55rem;
		border: 1px solid transparent;
		border-radius: var(--radio);
		background: transparent;
		text-align: left;
		font-size: 0.92rem;
	}
	.nivel:hover {
		background: var(--papel-hundido);
	}
	.nivel .muestra {
		width: 0.8rem;
		height: 0.8rem;
		border-radius: 50%;
	}
	.nivel.preventiva .muestra {
		background: var(--nivel-preventiva);
	}
	.nivel.amarilla .muestra {
		background: var(--nivel-amarilla-marca);
	}
	.nivel.roja .muestra {
		background: var(--nivel-roja);
	}
	.nivel.preventiva[aria-pressed='true'] {
		background: var(--nivel-preventiva-fondo);
		border-color: var(--nivel-preventiva);
	}
	.nivel.amarilla[aria-pressed='true'] {
		background: var(--nivel-amarilla-fondo);
		border-color: var(--nivel-amarilla);
	}
	.nivel.roja[aria-pressed='true'] {
		background: var(--nivel-roja-fondo);
		border-color: var(--nivel-roja);
	}

	.chile {
		list-style: none;
		margin: 0;
		padding: 0;
		position: relative;
	}
	.chile::before {
		content: '';
		position: absolute;
		left: 0.36rem;
		top: 0.8rem;
		bottom: 0.8rem;
		width: 2px;
		border-radius: 1px;
		background: var(--linea);
	}
	.region {
		position: relative;
		width: 100%;
		display: grid;
		grid-template-columns: 0.75rem minmax(0, 8.6rem) 1fr 2.4rem;
		align-items: center;
		gap: 0.55rem;
		padding: 0.24rem 0;
		border: 0;
		background: transparent;
		text-align: left;
		font-size: 0.9rem;
		border-radius: 4px;
	}
	.region .nombre {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.region .n {
		text-align: right;
	}
	.hito {
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 50%;
		background: var(--papel);
		box-shadow: inset 0 0 0 2px var(--tinta-3);
		transition: transform 0.12s;
	}
	.region:hover .hito {
		transform: scale(1.2);
	}
	.region[aria-pressed='true'] .hito {
		background: var(--acento);
		box-shadow: 0 0 0 3px var(--acento-suave);
	}
	.region[aria-pressed='true'] .nombre {
		font-weight: 700;
	}
	.barra {
		height: 0.4rem;
		border-radius: 2px;
		background: var(--linea-suave);
		overflow: hidden;
	}
	.barra span {
		display: block;
		height: 100%;
		background: var(--tinta-3);
		border-radius: 2px;
	}
	.region[aria-pressed='true'] .barra span {
		background: var(--acento);
	}
	.region.vacia {
		color: var(--tinta-3);
	}
	.region.vacia .hito {
		box-shadow: inset 0 0 0 2px var(--linea);
	}

	.categorias {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.1rem;
	}
	.categoria {
		display: grid;
		grid-template-columns: auto auto 1fr auto;
		align-items: center;
		gap: 0.5rem;
		padding: 0.2rem 0.3rem;
		margin-inline: -0.3rem;
		border-radius: 4px;
		font-size: 0.9rem;
		cursor: pointer;
	}
	.categoria:hover {
		background: var(--papel-hundido);
	}
	.categoria input {
		accent-color: var(--acento);
		margin: 0;
	}
	.mas {
		margin-top: 0.4rem;
		border: 0;
		padding: 0;
		background: none;
		color: var(--acento);
		font-size: 0.88rem;
	}
	.mas:hover {
		text-decoration: underline;
	}

	.interruptor {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.6rem;
		align-items: start;
		font-size: 0.92rem;
		cursor: pointer;
	}
	.interruptor input {
		position: absolute;
		opacity: 0;
		width: 1px;
		height: 1px;
	}
	.pista {
		position: relative;
		margin-top: 0.1rem;
		width: 2.1rem;
		height: 1.2rem;
		border-radius: 999px;
		background: var(--linea);
		transition: background 0.15s;
	}
	.pista::after {
		content: '';
		position: absolute;
		top: 0.15rem;
		left: 0.15rem;
		width: 0.9rem;
		height: 0.9rem;
		border-radius: 50%;
		background: var(--superficie);
		transition: transform 0.15s;
	}
	.interruptor input:checked + .pista {
		background: var(--acento);
	}
	.interruptor input:checked + .pista::after {
		transform: translateX(0.9rem);
	}
	.interruptor input:focus-visible + .pista {
		outline: 2px solid var(--acento);
		outline-offset: 2px;
	}
</style>
