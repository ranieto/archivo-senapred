<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Buscador } from '#lib/buscador.ts';
	import Histograma from '#lib/componentes/Histograma.svelte';
	import PanelFiltros from '#lib/componentes/PanelFiltros.svelte';
	import Resultado from '#lib/componentes/Resultado.svelte';
	import { fechaLarga, nombreMes } from '#lib/fechas.ts';
	import { cantidadFiltros, escribirFiltros, FILTROS_VACIOS, leerFiltros, type Filtros, type Orden } from '#lib/filtros.ts';
	import type { TextoArchivo } from '#lib/modelo.ts';
	import { fragmento } from '#lib/resaltar.ts';
	import { terminos } from '#lib/texto.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const PAGINA = 40;

	const buscador = $derived(new Buscador(data.indice));
	let montado = $state(false);
	let consulta = $state('');
	let textoListo = $state(false);
	let entrada = $state<HTMLInputElement>();
	let dialogo = $state<HTMLDialogElement>();
	let mostrados = $state({ clave: '', n: PAGINA });
	let temporizador: ReturnType<typeof setTimeout> | undefined;

	const filtrosUrl = $derived(montado ? leerFiltros(page.url.searchParams) : FILTROS_VACIOS);
	const filtros: Filtros = $derived({ ...filtrosUrl, q: consulta });
	const resultado = $derived.by(() => {
		void textoListo;
		return buscador.buscar(filtros);
	});
	const clave = $derived(escribirFiltros(filtros));
	const limite = $derived(mostrados.clave === clave ? mostrados.n : PAGINA);
	const visibles = $derived(resultado.filas.slice(0, limite));
	const terminosConsulta = $derived(terminos(consulta));
	const porFecha = $derived(resultado.orden !== 'relevancia');
	const nFiltros = $derived(cantidadFiltros(filtros));

	const meses = $derived.by(() => {
		const dias = data.indice.publicaciones.flatMap((p) => p.dias).sort();
		const primero = dias[0]?.slice(0, 7);
		const ultimo = dias.at(-1)?.slice(0, 7);
		const lista: string[] = [];
		if (!primero || !ultimo) return lista;
		let [a, m] = primero.split('-').map(Number) as [number, number];
		for (let mes = primero; mes <= ultimo; ) {
			lista.push(mes);
			m += 1;
			if (m > 12) {
				m = 1;
				a += 1;
			}
			mes = `${a}-${String(m).padStart(2, '0')}`;
		}
		return lista;
	});
	const anios = $derived([...new Set(meses.map((m) => m.slice(0, 4)))].reverse());

	function navegar(cambios: Partial<Filtros>, { reemplazar = false } = {}) {
		clearTimeout(temporizador);
		const qs = escribirFiltros({ ...filtros, ...cambios });
		void goto(qs ? `?${qs}` : page.url.pathname, { replace: reemplazar, reset: false });
	}

	function escribir(valor: string) {
		consulta = valor;
		clearTimeout(temporizador);
		temporizador = setTimeout(() => navegar({}, { reemplazar: true }), 350);
	}

	function elegirMes(mes: string) {
		const [a, m] = mes.split('-').map(Number) as [number, number];
		const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
		const desde = `${mes}-01`;
		const hasta = `${mes}-${String(ultimo).padStart(2, '0')}`;
		navegar(filtros.desde === desde && filtros.hasta === hasta ? { desde: null, hasta: null } : { desde, hasta });
	}

	function limpiar() {
		consulta = '';
		navegar({ ...FILTROS_VACIOS });
		entrada?.focus();
	}

	function abrirFiltros() {
		dialogo?.showModal();
	}

	afterNavigate(({ type }) => {
		if (type !== 'goto') consulta = leerFiltros(page.url.searchParams).q;
	});

	onMount(() => {
		montado = true;
		if (matchMedia('(pointer: fine)').matches && !location.hash) entrada?.focus();
		void fetch(resolve('/texto.json'))
			.then((r) => r.json() as Promise<TextoArchivo>)
			.then((texto) => buscador.cargarTexto(texto))
			.then(() => (textoListo = buscador.textoCompleto));
	});

	const ORDENES: { valor: Orden; etiqueta: string }[] = [
		{ valor: 'relevancia', etiqueta: 'Más relevantes' },
		{ valor: 'recientes', etiqueta: 'Más recientes' },
		{ valor: 'antiguas', etiqueta: 'Más antiguas' }
	];
</script>

<svelte:head>
	<title>Archivo SENAPRED</title>
	<meta
		name="description"
		content="Archivo no oficial y buscable de los eventos y alertas publicados por SENAPRED desde 2023."
	/>
</svelte:head>

<div class="inicio" data-texto-listo={textoListo}>
	<section class="portada">
		<h1>Eventos y alertas de SENAPRED</h1>
		<p class="bajada">
			Datos recolectados hasta el {fechaLarga(data.indice.recolectado)}.
		</p>

		<form class="busqueda" role="search" onsubmit={(e) => { e.preventDefault(); navegar({}); }}>
			<label for="consulta" class="solo-lectores">Buscar en el archivo</label>
			<svg class="lupa" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
			<input
				bind:this={entrada}
				id="consulta"
				type="search"
				autocomplete="off"
				spellcheck="false"
				placeholder="Busca sismos, incendios, comunas, volcanes…"
				value={consulta}
				oninput={(e) => escribir(e.currentTarget.value)}
			/>
		</form>
	</section>

	<div class="cuerpo">
		<aside class="lateral" aria-label="Filtros">
			<PanelFiltros indice={data.indice} facetas={resultado.facetas} {filtros} {anios} {navegar} />
		</aside>

		<section class="resultados" aria-labelledby="titulo-resultados">
			<div class="barra-superior">
				<div class="tipos" role="group" aria-label="Tipo de publicación">
					<button type="button" aria-pressed={filtros.tipo === null} onclick={() => navegar({ tipo: null })}>
						Todo
						<span class="n">{(resultado.facetas.tipo.evento + resultado.facetas.tipo.alerta).toLocaleString('es-CL')}</span>
					</button>
					<button
						type="button"
						aria-pressed={filtros.tipo === 'evento'}
						onclick={() => navegar({ tipo: 'evento', niveles: [] })}
					>
						Eventos <span class="n">{resultado.facetas.tipo.evento.toLocaleString('es-CL')}</span>
					</button>
					<button type="button" aria-pressed={filtros.tipo === 'alerta'} onclick={() => navegar({ tipo: 'alerta' })}>
						Alertas <span class="n">{resultado.facetas.tipo.alerta.toLocaleString('es-CL')}</span>
					</button>
				</div>
			</div>

			<Histograma {meses} conteos={resultado.facetas.meses} desde={filtros.desde} hasta={filtros.hasta} elegir={elegirMes} />

			<div class="resumen">
				<h2 id="titulo-resultados">
					{resultado.filas.length === 0
						? 'Sin resultados'
						: `${resultado.filas.length.toLocaleString('es-CL')} ${resultado.filas.length === 1 ? 'publicación' : 'publicaciones'}`}
				</h2>
				<div class="acciones">
					<button type="button" class="abrir-filtros" onclick={abrirFiltros}>
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
						Filtros{#if nFiltros > 0}<span class="contador">{nFiltros}</span>{/if}
					</button>
					{#if nFiltros > 0 || consulta}
						<button type="button" class="limpiar" onclick={limpiar}>Limpiar búsqueda</button>
					{/if}
					<label class="orden">
						<span class="solo-lectores">Ordenar</span>
						<select
							value={resultado.orden}
							onchange={(e) => {
								const valor = e.currentTarget.value;
								const orden = ORDENES.find((o) => o.valor === valor)?.valor ?? null;
								navegar({ orden });
							}}
						>
							{#each ORDENES as o (o.valor)}
								<option value={o.valor} disabled={o.valor === 'relevancia' && (!consulta || !textoListo)}>{o.etiqueta}</option>
							{/each}
						</select>
					</label>
				</div>
			</div>

			{#if resultado.filas.length === 0}
				<div class="vacio">
					<p>Nada coincide con esta búsqueda.</p>
					<p>
						Prueba con menos palabras, quita algún filtro
						{#if !filtros.borradas && resultado.facetas.borradas > 0}
							o
							<button type="button" class="enlace" onclick={() => navegar({ borradas: true })}>
								incluye las {resultado.facetas.borradas} publicaciones borradas que sí coinciden
							</button>
						{/if}.
					</p>
				</div>
			{:else}
				<ol class="lista">
					{#each visibles as fila, i (fila.i)}
						{@const anterior = visibles[i - 1]}
						{#if porFecha && (!anterior || anterior.mes !== fila.mes)}
							<li class="separador" aria-hidden="true">{nombreMes(fila.mes)}</li>
						{/if}
						<li>
							<Resultado
								{fila}
								indice={data.indice}
								terminos={resultado.terminos.get(fila.i) ?? terminosConsulta}
								fragmento={textoListo && consulta
									? fragmento(buscador.texto(fila.i), resultado.terminos.get(fila.i) ?? terminosConsulta)
									: null}
								conAnio={!porFecha}
							/>
						</li>
					{/each}
				</ol>
				{#if resultado.filas.length > limite}
					<button type="button" class="ver-mas" onclick={() => (mostrados = { clave, n: limite + PAGINA })}>
						Ver {Math.min(PAGINA, resultado.filas.length - limite)} más
						<span class="n">de {(resultado.filas.length - limite).toLocaleString('es-CL')} restantes</span>
					</button>
				{/if}
			{/if}
		</section>
	</div>
</div>

<dialog bind:this={dialogo} class="hoja" aria-label="Filtros" onclick={(e) => e.target === dialogo && dialogo?.close()}>
	<div class="hoja-cabecera">
		<h2>Filtros</h2>
		<button type="button" class="cerrar" onclick={() => dialogo?.close()}>
			Ver {resultado.filas.length.toLocaleString('es-CL')}
			{resultado.filas.length === 1 ? 'resultado' : 'resultados'}
		</button>
	</div>
	<PanelFiltros indice={data.indice} facetas={resultado.facetas} {filtros} {anios} {navegar} />
</dialog>

<style>
	.inicio {
		max-width: var(--ancho);
		margin: 0 auto;
		padding: 0 1.25rem;
	}
	.portada {
		padding: 2.5rem 0 2.75rem;
		max-width: 48rem;
	}
	h1 {
		font-size: clamp(2rem, 1.3rem + 3vw, 3.4rem);
		font-weight: 500;
		font-variation-settings: 'opsz' 72;
		letter-spacing: -0.02em;
		line-height: 1.04;
	}
	.bajada {
		margin-top: 0.75rem;
		color: var(--tinta-2);
		font-size: 1.02rem;
		max-width: 52ch;
	}
	.busqueda {
		position: relative;
		margin-top: 1.75rem;
	}
	.busqueda input {
		width: 100%;
		height: 3.6rem;
		padding: 0 3.2rem 0 3.2rem;
		border: 1.5px solid var(--linea);
		border-radius: 10px;
		background: var(--superficie);
		font-family: var(--serif);
		font-size: 1.2rem;
		font-variation-settings: 'opsz' 24;
		box-shadow: 0 1px 0 var(--linea-suave);
		transition: border-color 0.15s, box-shadow 0.15s;
	}
	.busqueda input::placeholder {
		color: var(--tinta-3);
		font-style: italic;
	}
	.busqueda input:focus {
		outline: none;
		border-color: var(--acento);
		box-shadow: 0 0 0 4px var(--acento-suave);
	}
	.busqueda input::-webkit-search-cancel-button {
		cursor: pointer;
	}
	.lupa {
		position: absolute;
		left: 1.1rem;
		top: 50%;
		width: 1.3rem;
		height: 1.3rem;
		transform: translateY(-50%);
		fill: none;
		stroke: var(--tinta-3);
		stroke-width: 2;
		stroke-linecap: round;
		pointer-events: none;
	}
	.cuerpo {
		display: grid;
		grid-template-columns: 17.5rem minmax(0, 1fr);
		gap: 3rem;
		align-items: start;
		margin-top: 0.75rem;
	}
	.lateral {
		position: sticky;
		top: 1rem;
		max-height: calc(100vh - 2rem);
		overflow-y: auto;
		padding: 0.25rem 0.5rem 1rem 0;
		scrollbar-width: thin;
	}
	.barra-superior {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
	}
	.tipos {
		display: inline-flex;
		padding: 3px;
		border-radius: 9px;
		background: var(--papel-hundido);
	}
	.tipos button {
		border: 0;
		background: transparent;
		padding: 0.4rem 0.85rem;
		border-radius: 7px;
		font-size: 0.92rem;
		color: var(--tinta-2);
		white-space: nowrap;
	}
	.tipos button[aria-pressed='true'] {
		background: var(--superficie);
		color: var(--tinta);
		font-weight: 600;
		box-shadow: 0 1px 2px color-mix(in oklab, var(--tinta) 14%, transparent);
	}
	.n {
		font-size: 0.8em;
		color: var(--tinta-3);
		font-weight: 400;
		font-variant-numeric: tabular-nums;
	}
	.abrir-filtros {
		display: none;
		align-items: center;
		gap: 0.4rem;
		border: 1px solid var(--linea);
		background: var(--superficie);
		border-radius: 8px;
		padding: 0.45rem 0.75rem;
		font-size: 0.92rem;
	}
	.abrir-filtros svg {
		width: 1rem;
		height: 1rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
	}
	.contador {
		display: inline-grid;
		place-items: center;
		min-width: 1.25rem;
		height: 1.25rem;
		padding: 0 0.3rem;
		border-radius: 999px;
		background: var(--acento);
		color: var(--papel);
		font-size: 0.75rem;
		font-weight: 700;
	}
	.resumen {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem 1rem;
		margin-top: 1.25rem;
		padding-bottom: 0.5rem;
	}
	.resumen h2 {
		font-size: 1.3rem;
		font-weight: 500;
		font-variation-settings: 'opsz' 30;
		font-variant-numeric: lining-nums;
	}
	.acciones {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem 1rem;
	}
	.limpiar,
	.enlace {
		border: 0;
		background: none;
		padding: 0;
		color: var(--acento);
		font-size: 0.9rem;
		text-decoration: underline;
		text-underline-offset: 0.18em;
		text-decoration-thickness: 1px;
	}
	.enlace {
		font-size: inherit;
	}
	.orden select {
		border: 1px solid var(--linea);
		border-radius: 7px;
		background: var(--superficie);
		padding: 0.3rem 0.5rem;
		font-size: 0.9rem;
	}
	.lista {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.separador {
		position: sticky;
		top: 0;
		z-index: 1;
		margin-top: 1rem;
		padding: 0.45rem 0;
		background: var(--papel);
		border-bottom: 1px solid var(--linea);
		font-family: var(--serif);
		font-size: 0.95rem;
		font-weight: 600;
		font-variation-settings: 'opsz' 16;
		color: var(--tinta-2);
	}
	.separador::first-letter {
		text-transform: uppercase;
	}
	.lista > li:not(.separador) + li:not(.separador) {
		border-top: 1px solid var(--linea-suave);
	}
	.vacio {
		padding: 2.5rem 0;
		display: grid;
		gap: 0.5rem;
		color: var(--tinta-2);
		max-width: 52ch;
	}
	.vacio p:first-child {
		font-family: var(--serif);
		font-size: 1.25rem;
		color: var(--tinta);
	}
	.ver-mas {
		display: block;
		margin: 1.5rem auto 0;
		border: 1px solid var(--linea);
		background: var(--superficie);
		border-radius: 999px;
		padding: 0.6rem 1.3rem;
		font-size: 0.95rem;
	}
	.ver-mas:hover {
		border-color: var(--tinta-3);
	}

	.hoja {
		border: 0;
		padding: 0 1.25rem 2rem;
		margin: auto 0 0;
		width: 100%;
		max-width: 100%;
		max-height: 88vh;
		border-radius: 16px 16px 0 0;
		background: var(--papel);
		color: var(--tinta);
	}
	.hoja::backdrop {
		background: color-mix(in oklab, var(--tinta) 45%, transparent);
	}
	.hoja-cabecera {
		position: sticky;
		top: 0;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 0;
		margin-bottom: 0.5rem;
		background: var(--papel);
	}
	.hoja-cabecera h2 {
		font-size: 1.3rem;
	}
	.cerrar {
		border: 0;
		border-radius: 8px;
		background: var(--tinta);
		color: var(--papel);
		padding: 0.5rem 0.9rem;
		font-weight: 600;
		font-size: 0.92rem;
	}

	@media (max-width: 60rem) {
		.cuerpo {
			grid-template-columns: minmax(0, 1fr);
		}
		.lateral {
			display: none;
		}
		.abrir-filtros {
			display: inline-flex;
		}
	}
	@media (min-width: 60.01rem) {
		.hoja {
			display: none;
		}
	}
	@media (max-width: 34rem) {
		.portada {
			padding-top: 1.5rem;
		}
		.busqueda input {
			height: 3.2rem;
			font-size: 1.05rem;
			padding-right: 1rem;
		}
		.tipos {
			display: flex;
			width: 100%;
		}
		.tipos button {
			flex: 1;
			padding: 0.4rem 0.4rem;
		}
		.resumen {
			display: grid;
		}
		.limpiar {
			order: 3;
		}
	}
</style>
