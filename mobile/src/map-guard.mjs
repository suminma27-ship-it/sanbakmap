// Inject only into the packaged map copy. Never mutate the source map.
export const MAP_GATE_SCRIPT = `<script data-sanbakmap-lnt-map-guard>
try {
  if (window.parent === window || !window.parent.document.body.classList.contains('unlocked')) {
    window.location.replace('./index.html');
  }
} catch (_) { window.location.replace('./index.html'); }
</script>`;

export function guardMapHtml(html) {
  if (typeof html !== 'string' || !/<head(?:\s[^>]*)?>/i.test(html)) {
    throw new Error('Cannot safely gate map without an HTML head');
  }
  if (html.includes('data-sanbakmap-lnt-map-guard')) {
    throw new Error('Map already contains LNT guard');
  }
  return html.replace(/<head(?:\s[^>]*)?>/i, match => match + '\n' + MAP_GATE_SCRIPT);
}
