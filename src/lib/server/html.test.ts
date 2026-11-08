import { expect, test } from 'vitest';
import { sanitizarContenido, textoPlano } from './html.ts';

test('drops inline colors and sizes but keeps structure', () => {
	const html = sanitizarContenido(
		'<p style="color: rgb(0,0,0);font-size:14px;text-align:center"><span style="color:red"><strong>Volcán</strong></span></p><table><tbody><tr><td colspan="2">IV</td></tr></tbody></table>',
		'v1-'
	);
	expect(html).toBe(
		'<p style="text-align:center"><strong>Volcán</strong></p><table><tbody><tr><td colspan="2">IV</td></tr></tbody></table>'
	);
});

test('keeps embedded images, drops hotlinked ones and scripts', () => {
	const html = sanitizarContenido(
		'<img src="data:image/png;base64,AAAA"><img src="https://senapred.cl/x.png"><script>alert(1)</script><p onclick="x()">a</p>',
		'v1-'
	);
	expect(html).toBe('<img src="data:image/png;base64,AAAA" /><p>a</p>');
});

test('namespaces footnote anchors per version and opens external links in a new tab', () => {
	const html = sanitizarContenido(
		'<a name="_ftnref1" href="#_ftn1">[1]</a><a href="#nada">y</a><a href="/eventos">x</a><a name="_ftn1">nota</a>',
		'v3-'
	);
	expect(html).toBe(
		'<a href="#v3-_ftn1" id="v3-_ftnref1">[1]</a><a>y</a><a href="https://senapred.cl/eventos" rel="noopener noreferrer" target="_blank">x</a><a id="v3-_ftn1">nota</a>'
	);
});

test('removes empty paragraphs', () => {
	expect(sanitizarContenido('<p><br></p><p>&nbsp;</p><p>Texto</p>', 'v1-')).toBe('<p>Texto</p>');
});

test('plain text separates blocks and decodes entities', () => {
	expect(textoPlano('<p>Uno</p><p>Dos&nbsp;&amp;&nbsp;tres</p><table><tr><td>a</td><td>b</td></tr></table>')).toBe(
		'Uno Dos & tres a b'
	);
});
