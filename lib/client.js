/**
 * ds-balance — client half (hand-written module bundle).
 *
 * Renders the balance box INSIDE the sidebar's flex column (right after the
 * New Session button) via a React portal. Being part of the same flex layout
 * as the button, it animates in perfect sync with it (same container, same
 * grid-template-columns transition) and is clipped by the sidebar's
 * overflow:hidden — no fixed positioning, no manual geometry, no rAF.
 *
 * Structure (never hashed class names):
 *   frame = the AppFrame element ([data-shell-overlay]'s parent)
 *   root  = the sidebar flex root (.hHd-Xa_root, children: logo, button,
 *           workspace, footer) — the anchor div is inserted after the button.
 */
window.__ModuleLoader__.load({
  id: 'ds-balance',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
    let react = require('react');
    let reactDom = require('react-dom');

    // ── styles ─────────────────────────────────────────────────────────────
    const css = [
      // Flow item, mirrors the New Session button (38px tall, 14px/500, same margins).
      '.ds-balance-box{box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:6px;margin:0 2px 8px;padding:0 16px;height:38px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500;line-height:22px;white-space:nowrap;overflow:hidden;cursor:default;user-select:none}',
      // Collapsed rail: compact badge. Styling derives from the frame's
      // [data-sidebar-collapsed] attribute — the exact same switch that styles
      // the button — so both change in the same CSS frame (perfectly in sync).
      '.hHd-Xa_collapsed .ds-balance-box{height:36px;width:36px;margin:0 0 12px;padding:0}',
      '.ds-balance-mini{display:none}',
      '.hHd-Xa_collapsed .ds-balance-mini{display:inline}',
      '.hHd-Xa_collapsed .ds-balance-full{display:none}',
      '.ds-balance-box .ds-balance-label{color:var(--dsw-alias-label-secondary)}',
      '.ds-balance-box .ds-balance-value{font-variant-numeric:tabular-nums}',
      '.ds-balance-box .ds-balance-err{color:var(--dsw-alias-label-secondary)}',
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
      const [anchor, setAnchor] = react.useState(null);

      // Data poll: 60s cadence; a failure retries every 2s up to 10 tries
      // before settling on the failed state (success resets the counter).
      react.useEffect(() => {
        let alive = true;
        let busy = false;
        let tries = 0;
        let pollTimer = null;
        let retryTimer = null;
        const MAX_TRIES = 10;
        const RETRY_MS = 2000;
        const load = async () => {
          if (busy || !alive) return;
          busy = true;
          try {
            const res = await fetch('/ds-balance', { cache: 'no-store' });
            const body = await res.json();
            if (!alive) return;
            if (body && body.ok) {
              tries = 0;
              setData({ status: 'ok', body });
            } else {
              tries += 1;
              if (tries >= MAX_TRIES) setData({ status: 'failed', body });
              else if (retryTimer === null) retryTimer = setTimeout(() => { retryTimer = null; load(); }, RETRY_MS);
            }
          } catch {
            if (!alive) return;
            tries += 1;
            if (tries >= MAX_TRIES) setData({ status: 'failed' });
            else if (retryTimer === null) retryTimer = setTimeout(() => { retryTimer = null; load(); }, RETRY_MS);
          } finally {
            busy = false;
          }
        };
        load();
        pollTimer = setInterval(() => { tries = 0; load(); }, 60000);
        return () => {
          alive = false;
          clearInterval(pollTimer);
          if (retryTimer !== null) clearTimeout(retryTimer);
        };
      }, []);

      // Insert an anchor div into the sidebar flex root, right after the New
      // Session button (before the workspace) — the box lives in the same flow.
      react.useEffect(() => {
        const root = document.querySelector('.hHd-Xa_root');
        if (!root) return;
        const el = document.createElement('div');
        el.dataset.balanceAnchor = 'true';
        root.insertBefore(el, root.children[2] ?? null);
        setAnchor(el);
        return () => {
          el.remove();
        };
      }, []);

      if (!anchor) return null;

      let full;
      if (data.status === 'ok' && data.body && data.body.ok) {
        inner = react.createElement(
          react.Fragment,
          null,
          react.createElement('span', { className: 'ds-balance-label' }, '余额'),
          react.createElement('span', { className: 'ds-balance-value' }, formatBalance(data.body.balance)),
        );
      } else if (data.status === 'ok') {
        full = react.createElement('span', { className: 'ds-balance-err' }, '余额不可用');
      } else if (data.status === 'failed') {
        full = react.createElement('span', { className: 'ds-balance-err' }, '未获取到余额');
      } else {
        full = react.createElement('span', { className: 'ds-balance-err' }, '余额 …');
      }

      const balanceText =
        data.status === 'ok' && data.body && data.body.ok
          ? formatBalance(data.body.balance)
          : '未获取到余额';

      return reactDom.createPortal(
        react.createElement(
          'div',
          {
            className: 'ds-balance-box',
            title: 'DeepSeek 账户余额（每 60 秒刷新）: ' + balanceText,
          },
          react.createElement(
            react.Fragment,
            null,
            // Compact rail badge: just the currency symbol (full info in tooltip).
            react.createElement('span', { className: 'ds-balance-mini' }, '¥'),
            react.createElement('span', { className: 'ds-balance-full' }, full),
          ),
        ),
        anchor,
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
