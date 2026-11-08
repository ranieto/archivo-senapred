import { Parser } from 'htmlparser2';
import sanitizeHtml from 'sanitize-html';

const ORIGEN = 'https://senapred.cl/';

const ALINEACION = /^(center|right)$/;

function hrefSeguro(href: string | undefined, prefijo: string): string | undefined {
	if (!href) return undefined;
	if (href.startsWith('#')) return `#${prefijo}${href.slice(1)}`;
	try {
		const url = new URL(href, ORIGEN);
		return url.protocol === 'https:' || url.protocol === 'http:' || url.protocol === 'mailto:' ? url.href : undefined;
	} catch {
		return undefined;
	}
}

/**
 * Clean SENAPRED's HTML so it inherits the site's typography: no inline colors or font sizes,
 * headings demoted below the page title, footnote anchors namespaced by `prefijo` so several
 * versions can share one page (links to missing anchors become plain text), and only embedded
 * (`data:`) images, so nothing hotlinks senapred.cl.
 */
export function sanitizarContenido(html: string, prefijo: string): string {
	const limpio = sanitizeHtml(html, {
		allowedTags: [
			'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'sup', 'sub', 'ul', 'ol', 'li', 'blockquote',
			'h3', 'h4', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'a', 'img', 'hr'
		],
		allowedAttributes: {
			a: ['href', 'id', 'rel', 'target'],
			img: ['src', 'alt', 'width', 'height'],
			td: ['colspan', 'rowspan', 'style'],
			th: ['colspan', 'rowspan', 'style'],
			p: ['style']
		},
		allowedStyles: { '*': { 'text-align': [ALINEACION] } },
		allowedSchemes: ['http', 'https', 'mailto'],
		allowedSchemesByTag: { img: ['data'] },
		allowProtocolRelative: false,
		transformTags: {
			h1: 'h3',
			h2: 'h3',
			h5: 'h4',
			h6: 'h4',
			a: (tagName, attribs) => {
				const href = hrefSeguro(attribs.href, prefijo);
				const externo = href !== undefined && !href.startsWith('#');
				const atributos: Record<string, string> = {};
				if (href) atributos.href = href;
				if (attribs.name) atributos.id = `${prefijo}${attribs.name}`;
				if (externo) {
					atributos.rel = 'noopener noreferrer';
					atributos.target = '_blank';
				}
				return { tagName, attribs: atributos };
			}
		},
		exclusiveFilter: (frame) =>
			(frame.tag === 'img' && !frame.attribs.src?.startsWith('data:image/')) ||
			(frame.tag === 'p' && frame.text.trim() === '' && !frame.mediaChildren.length)
	});
	const ids = new Set([...limpio.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));
	return limpio.replace(/ href="#([^"]+)"/g, (atributo, id: string) => (ids.has(id) ? atributo : ''));
}

const BLOQUES = new Set(['p', 'div', 'br', 'li', 'tr', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'blockquote']);

/** Visible text of an HTML fragment, with block boundaries turned into spaces. */
export function textoPlano(html: string): string {
	const partes: string[] = [];
	const parser = new Parser(
		{
			ontext: (t) => partes.push(t),
			onopentag: (nombre) => {
				if (BLOQUES.has(nombre)) partes.push(' ');
			},
			onclosetag: (nombre) => {
				if (BLOQUES.has(nombre)) partes.push(' ');
			}
		},
		{ decodeEntities: true }
	);
	parser.write(html);
	parser.end();
	return partes.join('').replace(/\s+/g, ' ').trim();
}
