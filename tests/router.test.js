import { it, describe } from 'node:test';
import assert from 'node:assert';
import { Router } from '../src/lib/router/router.js';

describe('Router, integration tests', () => {
  const staticRoute = { method: 'GET', route: '/', handler: () => '/' };
  const wildcardRoute = {
    method: 'GET',
    route: '/images/*',
    handler: () => '/images/*',
  };
  const parametricRoute = {
    method: 'GET',
    route: '/parametric/:param1',
    handler: () => '/parametric/:param1',
  };

  const router = new Router();
  [staticRoute, wildcardRoute, parametricRoute].forEach((entry) => {
    const { method, route, handler } = entry;
    router.setRoute(method, route, handler);
  });

  it('Static routes', () => {
    const res = router.route('GET', '/');
    const expected = { handler: staticRoute.handler, pathParams: null };
    assert.deepStrictEqual(res, expected);

    assert.strictEqual(router.route('GET', '/404'), null);
  });

  it('Wildcard routes', () => {
    assert.strictEqual(router.route('GET', '/images'), null);

    const expected = { handler: wildcardRoute.handler, pathParams: null };
    assert.deepStrictEqual(router.route('GET', '/images/foo'), expected);
    assert.deepStrictEqual(router.route('GET', '/images/foo/bar'), expected);
  });

  it('Parametric routes', () => {
    assert.strictEqual(router.route('GET', '/parametric/'), null);
    assert.strictEqual(router.route('GET', '/parametric/foo/bar'), null);

    assert.deepStrictEqual(router.route('GET', '/parametric/foo'), {
      handler: parametricRoute.handler,
      pathParams: { param1: 'foo' },
    });
  });
});
