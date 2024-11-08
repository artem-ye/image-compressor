import { it, describe } from 'node:test';
import assert from 'node:assert';
import { PathRouter } from '../src/lib/router/pathRouting.js';

describe('Router', () => {
  it('Static routes', () => {
    const routes = {
      '/': () => '/',
      '/images': () => '/images',
    };

    const router = new PathRouter(routes);
    const contract = (handler) => ({ handler, pathParams: null });

    Object.entries(routes).forEach(([route, handler]) => {
      const res = router.get(route);
      assert.deepStrictEqual(res, contract(handler));
    });

    assert.strictEqual(router.get('/404'), null);
  });

  it('Wildcard routes', () => {
    const root = '/*';
    const images = '/images/*';
    const routes = {
      [images]: () => images,
      [root]: () => root,
    };
    const rootResult = { handler: routes[root], pathParams: null };
    const imagesResult = { handler: routes[images], pathParams: null };

    const router = new PathRouter(routes);

    assert.strictEqual(router.get('1/404'), null);

    assert.deepStrictEqual(router.get('/'), rootResult);
    assert.deepStrictEqual(router.get('/123'), rootResult);
    assert.deepStrictEqual(router.get('/abc/123'), rootResult);
    assert.deepStrictEqual(router.get('/images'), rootResult);

    assert.deepStrictEqual(router.get('/images/'), imagesResult);
    assert.deepStrictEqual(router.get('/images/123'), imagesResult);
  });

  it('Parametric routes', () => {
    const route2 = '/foo/:param1/hello';
    const route1 = '/foo/:param1';
    const route3 = '/3/:param1/hello/:param2/world';
    const routes = {
      [route1]: () => route1,
      [route2]: () => route2,
      [route3]: () => route3,
    };

    const contract = (handler, pathParams) => ({ handler, pathParams });
    const cases = {
      '/foo/bar': contract(routes[route1], { param1: 'bar' }),
      '/foo/bar/hello': contract(routes[route2], { param1: 'bar' }),
      '/3/foo/hello/bar/world': contract(routes[route3], {
        param1: 'foo',
        param2: 'bar',
      }),
    };

    const router = new PathRouter(routes);

    assert.strictEqual(router.get('/foo'), null);
    Object.entries(cases).forEach(([path, res]) => {
      assert.deepStrictEqual(router.get(path), res);
    });
  });
});
