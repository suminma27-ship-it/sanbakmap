// Inject only into the packaged map copy. Never mutate the source map.
export const MAP_GATE_SCRIPT = `<script data-sanbakmap-lnt-map-guard>
try {
  if (window.parent === window || !window.parent.document.body.classList.contains('unlocked') || window.parent.document.getElementById('app') !== window.frameElement) {
    window.location.replace('./index.html');
  } else {
    // The map remains the original, unmodified prototype; this is mobile-shell navigation only.
    window.addEventListener('DOMContentLoaded', () => {
      const back = document.createElement('button');
      back.type = 'button';
      back.id = 'sanbakmap-return-catalog';
      back.textContent = '← 장소 목록';
      back.setAttribute('aria-label', '장소 목록으로 돌아가기');
      back.style.cssText = 'position:fixed;top:calc(12px + env(safe-area-inset-top));left:12px;z-index:2147483647;min-height:44px;padding:9px 14px;border:1px solid #1e583e;border-radius:10px;background:white;color:#163a2a;font:600 14px system-ui;cursor:pointer';
      back.addEventListener('click', () => {
        window.parent.document.getElementById('app').src = './catalog.html';
      });
      document.body.append(back);
    }, {once:true});
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
