/**
 * ds-balance — client half (hand-written module bundle).
 *
 * Registers a fixed-position box into the shell.overlay slot, rendered in the
 * sidebar between the brand row and the New Session button. Polls the host
 * proxy route /ds-balance every 60s; hides while the sidebar is collapsed.
 *
 * Geometry relies on stable DOM structure, never hashed class names:
 *   frame = the AppFrame element ([data-shell-overlay]'s parent)
 *   sidebar width = first column of frame's gridTemplateColumns
 *   collapsed = frame.hasAttribute('data-sidebar-collapsed')
 */
window.__ModuleLoader__.load({
  id: 'ds-balance',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
    let react = require('react');

    // ── styles ─────────────────────────────────────────────────────────────
    const css = [
      '.ds-balance-box{position:fixed;left:0;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:6px;padding:0 12px;height:28px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-primary);font-size:12px;line-height:1;white-space:nowrap;overflow:hidden;cursor:default;z-index:20;user-select:none}',
      '.ds-balance-box .ds-balance-label{color:var(--dsw-alias-label-secondary)}',
      '.ds-balance-box .ds-balance-value{font-weight:600;font-variant-numeric:tabular-nums}',
      '.ds-balance-box .ds-balance-err{color:var(--dsw-alias-label-secondary);font-size:11px}',
      // Push the New Session button down to make room for the box (expanded only).
      'div:has(> [data-shell-overlay]):not([data-sidebar-collapsed]) > :first-child > :first-child > :first-child > :nth-child(2){margin-top:24px}',
    ].join('\n');
    const tagId = 'ds-balance/styles.css';
    if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css="' + tagId + '"]') === null) {
      const tag = document.createElement('style');
      tag.dataset.plugin = 'ds-balance';
      tag.dataset.pluginCss = tagId;
      tag.textContent = css;
      document.head.appendChild(tag);
    }

    // ── balance box ────────────────────────────────────────────────────────
    function formatBalance(balance) {
      if (!balance || typeof balance !== 'object' || !Array.isArray(balance.balance_infos) || balance.balance_infos.length === 0) {
        return balance && balance.is_available === false ? '余额不可用' : '暂无余额';
      }
      const first = balance.balance_infos[0];
      const total = Number(first.total_balance);
      if (!Number.isFinite(total)) return '余额未知';
      const symbol = first.currency === 'CNY' ? '¥' : first.currency === 'USD' ? '$' : first.currency + ' ';
      return symbol + total.toFixed(2);
    }

    function BalanceBox() {
      const [data, setData] = react.useState({ status: 'loading' });
      const [geometry, setGeometry] = react.useState({ visible: false, left: 0, top: 0, width: 0 });

      // Data poll: every 60s.
      react.useEffect(() => {
        let alive = true;
        const load = async () => {
          try {
            const res = await fetch('/ds-balance', { cache: 'no-store' });
            const body = await res.json();
            if (alive) setData({ status: 'ok', body });
          } catch {
            if (alive) setData({ status: 'error' });
          }
        };
        load();
        const timer = setInterval(load, 60000);
        return () => {
          alive = false;
          clearInterval(timer);
        };
      }, []);

      // Geometry tracking: ResizeObserver + MutationObserver + slow poll fallback.
      react.useEffect(() => {
        let alive = true;
        const update = () => {
          if (!alive) return;
          const layer = document.querySelector('[data-shell-overlay]');
          const frame = layer && layer.parentElement;
          if (!frame) {
            setGeometry({ visible: false, left: 0, top: 0, width: 0 });
            return;
          }
          if (frame.hasAttribute('data-sidebar-collapsed')) {
            setGeometry({ visible: false, left: 0, top: 0, width: 0 });
            return;
          }
          const cols = getComputedStyle(frame).gridTemplateColumns.split(' ');
          const sidebarWidth = parseFloat(cols[0] ?? '0') || 0;
          const rect = frame.getBoundingClientRect();
          setGeometry({
            visible: true,
            left: rect.left + 12,
            top: rect.top + 66,
            width: Math.max(0, sidebarWidth - 24),
          });
        };
        update();
        const frame = document.querySelector('[data-shell-overlay]')?.parentElement ?? null;
        const ro = frame ? new ResizeObserver(update) : null;
        if (ro && frame) ro.observe(frame);
        const mo = frame ? new MutationObserver(update) : null;
        if (mo && frame) mo.observe(frame, { attributes: true, attributeFilter: ['data-sidebar-collapsed', 'style'] });
        const timer = setInterval(update, 2000);
        return () => {
          alive = false;
          ro && ro.disconnect();
          mo && mo.disconnect();
          clearInterval(timer);
        };
      }, []);

      if (!geometry.visible) return null;

      let inner;
      if (data.status === 'ok' && data.body && data.body.ok) {
        inner = react.createElement(
          react.Fragment,
          null,
          react.createElement('span', { className: 'ds-balance-label' }, '余额'),
          react.createElement('span', { className: 'ds-balance-value' }, formatBalance(data.body.balance)),
        );
      } else if (data.status === 'ok') {
        inner = react.createElement('span', { className: 'ds-balance-err' }, '余额不可用');
      } else if (data.status === 'error') {
        inner = react.createElement('span', { className: 'ds-balance-err' }, '余额获取失败');
      } else {
        inner = react.createElement('span', { className: 'ds-balance-err' }, '余额 …');
      }

      return react.createElement(
        'div',
        {
          className: 'ds-balance-box',
          style: { left: geometry.left + 'px', top: geometry.top + 'px', width: geometry.width + 'px' },
          title: 'DeepSeek 账户余额（每 60 秒刷新）',
        },
        inner,
      );
    }

    // ── plugin body ────────────────────────────────────────────────────────
    const inject = ['slots'];
    function apply(ctx) {
      ctx.effect(
        () => ctx.slots.register({ name: 'shell.overlay', id: 'ds-balance' }, BalanceBox),
        'ds-balance: balance box',
      );
    }
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
