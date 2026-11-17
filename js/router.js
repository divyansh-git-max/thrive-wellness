// Small indirection so views can trigger a re-render without importing app.js.
let renderFn = () => {};
export const setRenderer = (fn) => { renderFn = fn; };
export const rerender = () => renderFn({ keepScroll: true });
export const go = (hash) => { if (location.hash === hash) rerender(); else location.hash = hash; };
export const route = () => (location.hash.replace(/^#\/?/, '') || 'today').split('/').map(decodeURIComponent);
