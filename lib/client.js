/**
 * ds-balance — client half (hand-written module bundle).
 *
 * Renders the balance box into the stable `sidebar.footer.action` slot,
 * beside the Settings entry at the sidebar foot. The component reads the
 * `wide` flag from the Slot owner props: a wide footer shows label + value,
 * the collapsed 56px rail shows a compact currency badge with a hover tooltip.
 *
 * No portal, no hash class names, no manual DOM insertion: the Slot system
 * mounts the entry and styles are owned by the plugin fiber.
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
      // Sidebar footer action cell: compact, neutral, fits beside Settings.
      '.ds-balance{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px;white-space:nowrap;overflow:hidden;cursor:default;user-select:none}',
      '.ds-balance[data-wide=true]{width:100%}',
      '.ds-balance[data-wide=false]{width:32px;padding:0;border-color:transparent;background:transparent}',
      '.ds-balance[data-wide=false]:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.ds-balance .ds-balance-label{color:var(--dsw-alias-label-secondary)}',
      '.ds-balance .ds-balance-value{font-variant-numeric:tabular-nums}',
      '.ds-balance .ds-balance-err{color:var(--dsw-alias-label-secondary)}',
      '.ds-balance .ds-balance-mini{display:none}',
      '.ds-balance[data-wide=false] .ds-balance-full{display:none}',
      '.ds-balance[data-wide=false] .ds-balance-mini{display:inline}',
    ].join('\n');
    const tagId = 'ds-balance/styles.css';
    function installStyles() {
      if (typeof document === 'undefined') return () => {};
      const selector = 'style[data-plugin-css="' + tagId + '"]';
      if (document.querySelector(selector) !== null) return () => {};
      const tag = document.createElement('style');
      tag.dataset.plugin = 'ds-balance';
      tag.dataset.pluginCss = tagId;
      tag.textContent = css;
      document.head.appendChild(tag);
      return () => tag.remove();
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

    function BalanceBox(props) {
      const wide = props.wide !== false;
      const [data, setData] = react.useState({ status: 'loading' });

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

      let full;
      if (data.status === 'ok' && data.body && data.body.ok) {
        full = react.createElement(
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

      return react.createElement(
        'div',
        {
          className: 'ds-balance',
          'data-wide': wide ? 'true' : 'false',
          // Tooltip only in the collapsed rail.
          title: !wide ? 'DeepSeek 账户余额: ' + balanceText : undefined,
        },
        react.createElement(
          react.Fragment,
          null,
          // Compact rail badge: just the currency symbol (full info in tooltip).
          react.createElement('span', { className: 'ds-balance-mini' }, '¥'),
          react.createElement('span', { className: 'ds-balance-full' }, full),
        ),
      );
    }

    // ── plugin body ────────────────────────────────────────────────────────
    const inject = ['slots'];
    function apply(ctx) {
      ctx.effect(installStyles, 'ds-balance: styles');
      ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register(
        { name: 'sidebar.footer.action', id: 'ds-balance', order: 10, label: 'DeepSeek balance' },
        BalanceBox,
      ));
    }
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
