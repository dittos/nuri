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
  load: (request: MatchedRequest) => Promise<WireObject>;
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

export type PreloadData = WireObject;

const defaultHandler: RouteHandler = {
  load() {
    return Promise.reject({status: 404});
  },

  component: () => null,
};

export class App {
  routes: Array<Route>;
  defaultHandler: RouteHandler;

  constructor() {
    this.routes = [];
    this.defaultHandler = defaultHandler;
  }

  route(path: string, handler: RouteHandler) {
    if (path === '*') {
      this.defaultHandler = handler;
      return;
    }

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

export function matchRoute(request: Request): MatchedRequest {
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
  return {
    ...request,
    handler: request.app.defaultHandler,
    params: {},
  };
}

// TODO: callback
export type DataUpdater = (data: WireObject) => void;
