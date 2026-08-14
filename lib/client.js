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
      // Typography/geometry mirrors the New Session button (38px tall, 14px/500).
      '.ds-balance-box{position:fixed;left:0;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:6px;padding:0 16px;height:38px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500;line-height:22px;white-space:nowrap;overflow:hidden;cursor:default;z-index:20;user-select:none}',
      // Collapsed rail: compact 36x36 badge (same as the button's collapsed form).
      '.ds-balance-box[data-collapsed]{height:36px;padding:0}',
      '.ds-balance-box .ds-balance-label{color:var(--dsw-alias-label-secondary)}',
      '.ds-balance-box .ds-balance-value{font-variant-numeric:tabular-nums}',
      '.ds-balance-box .ds-balance-err{color:var(--dsw-alias-label-secondary)}',
      // Push the New Session button down to make room for the box (expanded only).
      'div:has(> [data-shell-overlay]):not([data-sidebar-collapsed]) > :first-child > :first-child > :first-child > :nth-child(2){margin-top:24px}',
      // Collapsed rail: push the workspace down to make room for the compact badge.
      'div:has(> [data-shell-overlay])[data-sidebar-collapsed] > :first-child > :first-child > :first-child > :nth-child(3){margin-top:40px}',
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

      // Geometry tracking: ResizeObserver + MutationObserver + width-transition
      // awareness + slow poll fallback. The sidebar width animates via a
      // grid-template-columns transition; while it runs, the box stays hidden
      // so it never renders at a mid-transition width (the "small box" glitch).
      react.useEffect(() => {
        let alive = true;
        let animating = false;
        let animSince = 0;
        const HIDDEN = { visible: false, left: 0, top: 0, width: 0 };
        const frame = document.querySelector('[data-shell-overlay]')?.parentElement ?? null;
        const update = () => {
          if (!alive) return;
          const layer = document.querySelector('[data-shell-overlay]');
          const fr = layer && layer.parentElement;
          if (!fr || animating) {
            setGeometry(HIDDEN);
            return;
          }
          if (fr.hasAttribute('data-sidebar-collapsed')) {
            // Collapsed rail: keep showing a compact badge, aligned to the New
            // Session button column, right below it (the workspace is pushed
            // down by CSS to make room).
            const btn = document.querySelector('.hHd-Xa_newSession');
            const br = btn ? btn.getBoundingClientRect() : null;
            if (br && br.width > 0) {
              setGeometry({ visible: true, collapsed: true, left: br.left, top: br.top + br.height + 4, width: br.width });
            } else {
              setGeometry(HIDDEN);
            }
            return;
          }
          const rect = fr.getBoundingClientRect();
          // Align with the New Session button below: measure its box and use
          // the same left edge and width (falls back to sidebar math when the
          // button is not found).
          const nsBtn = document.querySelector('.hHd-Xa_newSession');
          const nsRect = nsBtn ? nsBtn.getBoundingClientRect() : null;
          if (nsRect && nsRect.width > 0) {
            setGeometry({
              visible: true,
              left: nsRect.left,
              top: rect.top + 66,
              width: nsRect.width,
            });
          } else {
            const cols = getComputedStyle(fr).gridTemplateColumns.split(' ');
            const sidebarWidth = parseFloat(cols[0] ?? '0') || 0;
            setGeometry({
              visible: true,
              left: rect.left + 14,
              top: rect.top + 66,
              width: Math.max(0, sidebarWidth - 28),
            });
          }
        };
        const startAnim = () => {
          animating = true;
          animSince = Date.now();
          setGeometry(HIDDEN);
        };
        const onTransitionStart = (ev) => {
          if (ev.propertyName === 'grid-template-columns') startAnim();
        };
        const onTransitionEnd = (ev) => {
          if (ev.propertyName !== 'grid-template-columns') return;
          animating = false;
          update();
        };
        update();
        const ro = frame ? new ResizeObserver(update) : null;
        if (ro && frame) ro.observe(frame);
        const mo = frame ? new MutationObserver((mutations) => {
          // Expanding the sidebar starts a width transition: hide immediately so
          // the box never shows at the transition's starting width.
          for (const m of mutations) {
            if (m.attributeName === 'data-sidebar-collapsed' && !frame.hasAttribute('data-sidebar-collapsed')) {
              startAnim();
              break;
            }
          }
          update();
        }) : null;
        if (mo && frame) mo.observe(frame, { attributes: true, attributeFilter: ['data-sidebar-collapsed', 'style'] });
        if (frame) frame.addEventListener('transitionstart', onTransitionStart);
        if (frame) frame.addEventListener('transitionend', onTransitionEnd);
        const timer = setInterval(() => {
          // Fallback: if a transition never starts/finishes (e.g. reduced-motion
          // disables the animation), stop hiding after a grace period.
          if (animating && Date.now() - animSince > 800) animating = false;
          update();
        }, 500);
        return () => {
          alive = false;
          ro && ro.disconnect();
          mo && mo.disconnect();
          if (frame) frame.removeEventListener('transitionstart', onTransitionStart);
          if (frame) frame.removeEventListener('transitionend', onTransitionEnd);
          clearInterval(timer);
        };
      }, []);

      if (!geometry.visible) return null;

      let inner;
      if (geometry.collapsed) {
        // Compact rail badge: just the currency symbol (full info in tooltip).
        inner = react.createElement('span', { className: 'ds-balance-value' }, '¥');
      } else if (data.status === 'ok' && data.body && data.body.ok) {
        inner = react.createElement(
          react.Fragment,
          null,
          react.createElement('span', { className: 'ds-balance-label' }, '余额'),
          react.createElement('span', { className: 'ds-balance-value' }, formatBalance(data.body.balance)),
        );
      } else if (data.status === 'ok') {
        inner = react.createElement('span', { className: 'ds-balance-err' }, '余额不可用');
      } else if (data.status === 'failed') {
        inner = react.createElement('span', { className: 'ds-balance-err' }, '未获取到余额');
      } else {
        inner = react.createElement('span', { className: 'ds-balance-err' }, '余额 …');
      }

      const balanceText =
        data.status === 'ok' && data.body && data.body.ok
          ? formatBalance(data.body.balance)
          : '未获取到余额';

      return react.createElement(
        'div',
        {
          className: 'ds-balance-box',
          'data-collapsed': geometry.collapsed || undefined,
          style: { left: geometry.left + 'px', top: geometry.top + 'px', width: geometry.width + 'px' },
          title: 'DeepSeek 账户余额（每 60 秒刷新）: ' + balanceText,
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
