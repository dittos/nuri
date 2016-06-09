/* @flow */

import React from 'react';
import pathToRegexp from 'path-to-regexp';

export type Route = {
  regexp: RegExp;
  keys: Array<any>;
  handler: RouteHandler;
};

// JSON-serializable "wire" types.
export type Wire = | string | number | boolean | null | WireObject | WireArray;
export type WireObject = { [key:string]: Wire };
export type WireArray = Array<Wire>;

export type RouteComponent = ReactClass<any>;

export type RouteHandler = {
  component: RouteComponent;
  load: (request: MatchedRequest) => WireObject | Promise<WireObject>;
  renderTitle?: (data: WireObject) => string;
  renderMeta?: (data: WireObject) => WireObject;
};

export type Request = {
  app: App;
  loader: any; // FIXME
  path: string;
  query: {[key: string]: any};
};

export type MatchedRequest = Request & {
  handler: RouteHandler;
  params: {[key: string]: any};
};

export class App {
  routes: Array<Route>;

  constructor() {
    this.routes = [];
  }

  route(path: string, handler: RouteHandler) {
    const keys = [];
    const regexp = pathToRegexp(path, keys);
    this.routes.push({
      regexp,
      keys,
      handler,
    });
  }
}

export function createApp(): App {
  return new App();
}

export function matchRoute(request: Request): ?MatchedRequest {
  const routes = request.app.routes;
  for (var i = 0; i < routes.length; i++) {
    const route = routes[i];
    const matches = route.regexp.exec(request.path);
    if (matches) {
      const params = {};
      for (var j = 0; j < matches.length - 1; j++) {
        params[route.keys[j].name] = decodeURIComponent(matches[j + 1]);
      }
      return {
        ...request,
        handler: route.handler,
        params,
      };
    }
  }
  return null;
}

export function createRouteElement(component: RouteComponent, props: {
  data: WireObject,
  setData: (updates: WireObject) => void,
}): React.Element {
  return React.createElement(component, props);
}
