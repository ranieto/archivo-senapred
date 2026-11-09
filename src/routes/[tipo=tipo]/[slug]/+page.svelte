<script lang="ts">
	import { resolve } from '$app/paths';
	import IconoCategoria from '#lib/componentes/IconoCategoria.svelte';
	import Insignias from '#lib/componentes/Insignias.svelte';
	import { fechaHoraLarga, fechaLarga, hora, diaChile } from '#lib/fechas.ts';
	import { NOMBRE_TIPO } from '#lib/modelo.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const d = $derived(data.detalle);
	const actual = $derived(d.versiones.find((v) => v.numero === d.actual));
	const borradas = $derived(d.versiones.filter((v) => v.borrada).length);
	const original = $derived(`https://senapred.cl/${d.tipo}/${d.urlAccess}`);
	const mismoDia = $derived(diaChile(d.inicio) === diaChile(d.fin));
	const descripcion = $derived(
		`${NOMBRE_TIPO[d.tipo].singular} de SENAPRED del ${fechaLarga(d.inicio)}${d.regiones.length ? `, ${d.regiones.map((r) => r.corto).join(', ')}` : ''}.`
	);
</script>

<svelte:head>
	<title>{d.titulo} | Archivo SENAPRED</title>
	<meta name="description" content={descripcion} />
</svelte:head>

<article class="detalle">
	<a class="volver" href={resolve('/')}>
		<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" /></svg>
		Buscar en el archivo
	</a>

	<header class="encabezado">
		<p class="clase">
			<IconoCategoria categoria={d.categoria} tamano={16} />
			<span>{d.categoria}</span>
			<span class="tipo">{NOMBRE_TIPO[d.tipo].singular}</span>
		</p>
		<h1>{d.titulo}</h1>
		<Insignias nivel={d.nivel} cancelada={d.cancelada} borrada={d.borrada} />
	</header>

	{#if d.borrada}
		<p class="aviso">
			SENAPRED borró esta publicación de su sitio. Aquí se conserva tal como quedó registrada.
		</p>
	{/if}

	<dl class="datos">
		{#if d.regiones.length}
			<div>
				<dt>{d.regiones.length === 1 ? 'Región' : 'Regiones'}</dt>
				<dd>{d.regiones.map((r) => r.corto).join(', ')}</dd>
			</div>
		{/if}
		{#if d.provincias.length}
			<div>
				<dt>{d.provincias.length === 1 ? 'Provincia' : 'Provincias'}</dt>
				<dd>{d.provincias.join(', ')}</dd>
			</div>
		{/if}
		{#if d.comunas.length}
			<div class="ancho">
				<dt>{d.comunas.length === 1 ? 'Comuna' : 'Comunas'}</dt>
				<dd>{d.comunas.join(', ')}</dd>
			</div>
		{/if}
		<div>
			<dt>Publicada</dt>
			<dd>{fechaHoraLarga(d.inicio)}</dd>
		</div>
		{#if d.versiones.length > 1}
			<div>
				<dt>Última versión</dt>
				<dd>{mismoDia ? hora(d.fin) : fechaHoraLarga(d.fin)}</dd>
			</div>
		{/if}
		<div>
			<dt>En el sitio oficial</dt>
			<dd>
				{#if d.borrada}
					Ya no está disponible
				{:else}
					<a href={original} rel="noopener noreferrer">Ver en senapred.cl</a>
				{/if}
			</dd>
		</div>
	</dl>

	{#if actual}
		<section class="contenido prosa" aria-label="Contenido de la versión actual">
			{@html actual.html}
		</section>
	{/if}

	<section class="historial" aria-labelledby="titulo-historial">
		<input type="checkbox" id="ocultar-borradas" class="solo-lectores" />
		<div class="historial-cabecera">
			<h2 id="titulo-historial">
				{d.versiones.length === 1 ? 'Una versión' : `${d.versiones.length} versiones`}
			</h2>
			{#if borradas > 0 && borradas < d.versiones.length}
				<label for="ocultar-borradas" class="interruptor">
					<span class="pista" aria-hidden="true"></span>
					Ocultar las {borradas} borradas
				</label>
			{/if}
		</div>

		<ol class="linea">
			{#each d.versiones as v (v.numero)}
				<li class="version" class:borrada={v.borrada} class:actual={v.numero === d.actual}>
					<span class="punto {v.nivel ?? ''}" aria-hidden="true"></span>
					<div class="version-cuerpo">
						<p class="version-meta">
							<time datetime={v.fecha}>{fechaHoraLarga(v.fecha)}</time>
							<span class="numero">Versión {v.numero}</span>
							{#if v.etiqueta}<span class="etiqueta">{v.etiqueta}</span>{/if}
							{#if v.numero === d.actual}<span class="marca-actual">Mostrada arriba</span>{/if}
							{#if v.borrada}<span class="marca-borrada">Borrada</span>{/if}
						</p>
						<p class="version-titulo">{v.titulo}</p>
						{#if v.nivel && v.nivel !== d.nivel}
							<Insignias nivel={v.nivel} compacta />
						{/if}
						{#if v.numero !== d.actual}
							<details>
								<summary>Ver contenido</summary>
								<div class="prosa">{@html v.html}</div>
							</details>
						{/if}
					</div>
				</li>
			{/each}
		</ol>
	</section>
</article>

<style>
	.detalle {
		max-width: 46rem;
		margin: 0 auto;
		padding: 1.25rem 1.25rem 0;
	}
	.volver {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		color: var(--tinta-2);
		text-decoration: none;
		font-size: 0.92rem;
	}
	.volver:hover {
		color: var(--tinta);
	}
	.volver svg {
		width: 1rem;
		height: 1rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.8;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.encabezado {
		margin-top: 2rem;
		display: grid;
		gap: 0.9rem;
		justify-items: start;
	}
	.clase {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		font-weight: 600;
		color: var(--tinta-2);
	}
	.tipo {
		color: var(--tinta-3);
		font-weight: 400;
		padding-left: 0.55rem;
		border-left: 1px solid var(--linea);
	}
	h1 {
		font-size: clamp(1.75rem, 1.2rem + 2.4vw, 2.6rem);
		font-weight: 560;
		font-variation-settings: 'opsz' 60;
		letter-spacing: -0.012em;
		line-height: 1.12;
	}
	.aviso {
		margin-top: 1.5rem;
		padding: 0.9rem 1rem;
		border-radius: var(--radio);
		background: var(--papel-hundido);
		color: var(--tinta-2);
		font-size: 0.95rem;
	}
	.datos {
		margin: 2rem 0 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
		gap: 1rem 1.5rem;
		padding: 1.1rem 0;
		border-block: 1px solid var(--linea);
	}
	.datos .ancho {
		grid-column: 1 / -1;
	}
	.datos dt {
		font-size: 0.8rem;
		color: var(--tinta-3);
	}
	.datos dd {
		margin: 0.1rem 0 0;
		font-size: 0.95rem;
	}
	.contenido {
		margin-top: 2rem;
	}
	.historial {
		margin-top: 3.5rem;
	}
	.historial-cabecera {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
	}
	h2 {
		font-size: 1.45rem;
		font-variation-settings: 'opsz' 36;
	}
	.interruptor {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
		color: var(--tinta-2);
		cursor: pointer;
		user-select: none;
	}
	.pista {
		position: relative;
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
	#ocultar-borradas:checked ~ .historial-cabecera .pista {
		background: var(--acento);
	}
	#ocultar-borradas:checked ~ .historial-cabecera .pista::after {
		transform: translateX(0.9rem);
	}
	#ocultar-borradas:focus-visible ~ .historial-cabecera .interruptor {
		outline: 2px solid var(--acento);
		outline-offset: 3px;
		border-radius: 4px;
	}
	#ocultar-borradas:checked ~ .linea .borrada {
		display: none;
	}
	.linea {
		list-style: none;
		margin: 1.5rem 0 0;
		padding: 0;
		position: relative;
	}
	.linea::before {
		content: '';
		position: absolute;
		left: 0.4rem;
		top: 0.5rem;
		bottom: 0.5rem;
		width: 2px;
		background: var(--linea);
	}
	.version {
		position: relative;
		display: grid;
		grid-template-columns: 0.8rem minmax(0, 1fr);
		gap: 1rem;
		padding-bottom: 1.4rem;
	}
	.punto {
		position: relative;
		margin-top: 0.3rem;
		width: 0.8rem;
		height: 0.8rem;
		border-radius: 50%;
		background: var(--papel);
		box-shadow: inset 0 0 0 2px var(--tinta-3);
	}
	.punto.preventiva {
		box-shadow: inset 0 0 0 2px var(--nivel-preventiva);
	}
	.punto.amarilla {
		box-shadow: inset 0 0 0 2px var(--nivel-amarilla);
	}
	.punto.roja {
		box-shadow: inset 0 0 0 2px var(--nivel-roja);
	}
	.actual .punto {
		background: var(--tinta);
		box-shadow: 0 0 0 3px var(--papel), 0 0 0 4px var(--tinta);
	}
	.borrada .punto {
		background: var(--papel);
		box-shadow: inset 0 0 0 2px var(--linea);
	}
	.version-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.25rem 0.75rem;
		font-size: 0.85rem;
		color: var(--tinta-3);
	}
	.version-meta time {
		color: var(--tinta-2);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.etiqueta {
		color: var(--tinta-2);
	}
	.marca-actual {
		color: var(--acento);
		font-weight: 600;
	}
	.marca-borrada {
		color: var(--tinta-2);
		font-weight: 600;
		padding: 0 0.35rem;
		border-radius: 3px;
		background: repeating-linear-gradient(-45deg, var(--papel-hundido) 0 4px, transparent 4px 8px);
		box-shadow: inset 0 0 0 1px var(--linea);
	}
	.version-titulo {
		margin-top: 0.2rem;
		font-family: var(--serif);
		font-size: 1.02rem;
		line-height: 1.4;
		margin-bottom: 0.35rem;
	}
	.borrada .version-cuerpo {
		padding: 0.6rem 0.75rem;
		margin: -0.6rem 0 0 -0.75rem;
		border-radius: var(--radio);
		background: repeating-linear-gradient(-45deg, var(--papel-hundido) 0 6px, transparent 6px 12px);
	}
	details {
		margin-top: 0.35rem;
	}
	summary {
		cursor: pointer;
		color: var(--acento);
		font-size: 0.9rem;
		width: fit-content;
	}
	details[open] summary {
		margin-bottom: 0.75rem;
	}
	details .prosa {
		padding: 1rem 1.1rem;
		border-radius: var(--radio);
		background: var(--superficie);
		box-shadow: inset 0 0 0 1px var(--linea-suave);
		font-size: 0.98rem;
	}

	.prosa {
		font-family: var(--serif);
		font-size: 1.06rem;
		line-height: 1.7;
		overflow-wrap: anywhere;
	}
	.prosa :global(p + p),
	.prosa :global(p + ul),
	.prosa :global(ul + p),
	.prosa :global(p + ol),
	.prosa :global(table + p),
	.prosa :global(p + table) {
		margin-top: 0.85em;
	}
	.prosa :global(h3),
	.prosa :global(h4) {
		margin: 1.4em 0 0.4em;
		font-size: 1.1em;
	}
	.prosa :global(ul),
	.prosa :global(ol) {
		padding-left: 1.3em;
		margin: 0;
	}
	.prosa :global(table) {
		display: block;
		overflow-x: auto;
		max-width: 100%;
		border-collapse: collapse;
		font-family: var(--sans);
		font-size: 0.88em;
		line-height: 1.4;
		margin-block: 1em;
	}
	.prosa :global(td),
	.prosa :global(th) {
		border: 1px solid var(--linea);
		padding: 0.4em 0.6em;
		vertical-align: top;
		overflow-wrap: normal;
		min-width: 5ch;
	}
	.prosa :global(td p + p) {
		margin-top: 0.3em;
	}
	.prosa :global(img) {
		max-width: 100%;
		height: auto;
		border-radius: 4px;
	}
	.prosa :global(sup) {
		line-height: 0;
	}
</style>
