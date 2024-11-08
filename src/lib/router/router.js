import { PathRouter } from './pathRouting.js';

class Routs {
  routing = new Map();

  set(method, route, handler) {
    const routing = this.routing;
    const pathRouter = (
      routing.has(method) ? routing : routing.set(method, new PathRouter())
    ).get(method);
    pathRouter.set(route, handler);
  }

  get(method, path) {
    const pathRouter = this.routing.get(method);
    return pathRouter?.get(path) || null;
  }
}

export class Router {
  #routing = new Routs();

  setRoute(method, path, handler) {
    this.#routing.set(method, path, handler);
  }

  route(method, path) {
    return this.#routing.get(method, path);
  }
}
