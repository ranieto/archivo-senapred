<script lang="ts">
	import '../app.css';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<a class="saltar" href="#contenido">Ir al contenido</a>

<header class="cabecera">
	<div class="interior">
		<a class="marca" href={resolve('/')} aria-current={page.route.id === '/' ? 'page' : undefined}>
			<svg viewBox="0 0 32 32" aria-hidden="true" class="logo">
				<path d="M3 19h6l3-8 4 13 3-9 2 4h8" />
			</svg>
			<span class="nombre">Archivo <span class="sigla">SENAPRED</span></span>
		</a>
	</div>
</header>

<main id="contenido">
	{@render children()}
</main>

<footer class="pie">
	<div class="interior">
		<p>
			Archivo no oficial. El contenido pertenece a SENAPRED y se publicó en
			<a href="https://senapred.cl/eventos" rel="noopener noreferrer">senapred.cl</a>. Ante una emergencia, sigue las
			instrucciones oficiales.
		</p>
	</div>
</footer>

<style>
	.saltar {
		position: absolute;
		left: 1rem;
		top: -3rem;
		background: var(--tinta);
		color: var(--papel);
		padding: 0.5rem 0.75rem;
		border-radius: var(--radio);
		z-index: 10;
	}
	.saltar:focus {
		top: 0.75rem;
	}
	.interior {
		max-width: var(--ancho);
		margin: 0 auto;
		padding: 0 1.25rem;
	}
	.cabecera .interior {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-height: 3.75rem;
	}
	.marca {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		color: var(--tinta);
		text-decoration: none;
	}
	.logo {
		width: 1.6rem;
		height: 1.6rem;
		fill: none;
		stroke: var(--tinta);
		stroke-width: 2.4;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.nombre {
		font-family: var(--serif);
		font-size: 1.15rem;
		font-weight: 600;
		font-variation-settings: 'opsz' 24;
	}
	.sigla {
		font-family: var(--sans);
		font-size: 0.82em;
		font-weight: 700;
		letter-spacing: 0.04em;
		color: var(--tinta-2);
	}
	main {
		min-height: 70vh;
	}
	.pie {
		margin-top: 4rem;
		border-top: 1px solid var(--linea);
		color: var(--tinta-3);
		font-size: 0.875rem;
	}
	.pie .interior {
		padding-block: 1.5rem 2.5rem;
	}
	.pie p {
		max-width: 60ch;
	}
	.pie a {
		color: inherit;
	}
</style>
