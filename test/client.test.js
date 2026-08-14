import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

test('browser bundle registers the balance box into sidebar.footer.action', async () => {
  const source = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8');
  let definition;
  const context = vm.createContext({
    window: {
      __ModuleLoader__: {
        load(value) {
          definition = value;
        },
      },
    },
  });
  vm.runInContext(source, context, { filename: 'lib/client.js' });
  assert.equal(definition.id, 'ds-balance');

  const React = {
    Fragment: Symbol('Fragment'),
    createElement() {},
    useEffect() {},
    useState(initial) { return [initial, () => {}]; },
  };
  const exported = definition.factory((name) => {
    if (name === 'react') return React;
    throw new Error('Unexpected browser dependency: ' + name);
  });

  let registration;
  const ctx = {
    effect(factory) { return factory(); },
    slots: {
      inject(name, factory) {
        assert.equal(name, 'sidebar.footer.action');
        registration = factory();
      },
      register(options, component) {
        return { options, component };
      },
    },
  };
  exported.apply(ctx);
  assert.equal(registration.options.name, 'sidebar.footer.action');
  assert.equal(registration.options.id, 'ds-balance');
  assert.equal(registration.options.order, 10);
  assert.deepEqual([...exported.inject], ['slots']);
});
