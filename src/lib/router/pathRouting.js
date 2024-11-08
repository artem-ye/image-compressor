class StaticRoutes {
  routes = new Map();

  set(route, handler) {
    this.routes.set(route, handler);
    return this;
  }

  get(path) {
    const handler = this.routes.get(path);
    return handler ? { handler, pathParams: null } : null;
  }
}

class WildcardRoutes {
  routes = new Map();

  isValidRoute(route) {
    return route.includes('*');
  }

  set(route, handler) {
    const re = new RegExp('^' + route.replace('*', '.*'));
    this.routes.set(route, { re, handler });
  }

  get(path) {
    let handler = null;
    for (const v of this.routes.values()) {
      if (path.match(v.re)) {
        handler = v.handler;
        break;
      }
    }
    return handler ? { handler, pathParams: null } : null;
  }
}

class ParametricRoutes {
  routes = new Map();

  isValidRoute(route) {
    return route.includes('/:');
  }

  set(route, handler) {
    const reStr = '^' + route.replace(/\/:(\w+)/g, '/(?<$1>[^\\/]+)') + '$';
    const re = new RegExp(reStr);
    this.routes.set(route, { re, handler });
  }

  get(path) {
    let result = null;
    for (const { re, handler } of this.routes.values()) {
      const match = path.match(re);
      if (match) {
        result = { handler, pathParams: { ...match.groups } };
        break;
      }
    }
    return result;
  }
}

export class PathRouter {
  staticRoutes = new StaticRoutes();
  wildcardRoutes = new WildcardRoutes();
  parametricRoutes = new ParametricRoutes();

  constructor(routes = {}) {
    for (const { 0: route, 1: handler } of Object.entries(routes)) {
      this.set(route, handler);
    }
  }

  set(route, handler) {
    const wcRoutes = this.wildcardRoutes;
    const paramRoutes = this.parametricRoutes;

    const router =
      (wcRoutes.isValidRoute(route) && wcRoutes) ||
      (paramRoutes.isValidRoute(route) && paramRoutes) ||
      this.staticRoutes;
    router.set(route, handler);
  }

  get(path) {
    const res =
      this.staticRoutes.get(path) ||
      this.wildcardRoutes.get(path) ||
      this.parametricRoutes.get(path);
    return res;
  }
}
