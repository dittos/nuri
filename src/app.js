/* @flow */

import pathToRegexp from 'path-to-regexp';
import isFunction from 'lodash/isFunction';

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

export type Response = WireObject | Redirect;

export type RouteHandler = {
  component?: RouteComponent;
  load?: (request: Request) => Promise<Response>;
  renderTitle?: (data: WireObject) => string;
  renderMeta?: (data: WireObject) => WireObject;
};

export type ParsedURI = {
  path: string;
  query: {[key: string]: any};
};

export type RouteMatch = {
  handler: RouteHandler;
  params: {[key: string]: any};
};

export type Loader = any; // FIXME

export class Redirect {
  uri: string;

  constructor(uri: string) {
    this.uri = uri;
  }
}

function redirect(uri: string): Promise<Redirect> {
  return Promise.resolve(new Redirect(uri));
}

export function isRedirect(obj: any): boolean {
  return obj instanceof Redirect;
}

export type BaseRequest = {
  app: App;
  loader: Loader;
  path: string;
  query: {[key: string]: any};
  params: {[key: string]: any};
};

export type Request = BaseRequest & {
  redirect: (uri: string) => Promise<Redirect>;
};

export function createRequest(base: BaseRequest): Request {
  return {
    ...base,
    redirect,
  };
}

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
  title: string | (routeTitle: ?string) => string;

  constructor() {
    this.routes = [];
    this.defaultHandler = defaultHandler;
    this.title = '';
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

export function matchRoute(app: App, uri: ParsedURI): RouteMatch {
  const routes = app.routes;
  for (var i = 0; i < routes.length; i++) {
    const route = routes[i];
    const matches = route.regexp.exec(uri.path);
    if (matches) {
      const params = {};
      for (var j = 0; j < matches.length - 1; j++) {
        params[route.keys[j].name] = decodeURIComponent(matches[j + 1]);
      }
      return {
        handler: route.handler,
        params,
      };
    }
  }
  return {
    handler: app.defaultHandler,
    params: {},
  };
}

export function renderTitle(app: App, handler: RouteHandler, data: WireObject): string {
  const routeTitle = handler.renderTitle ? handler.renderTitle(data) : '';
  const titleFn: any = app.title;
  if (isFunction(titleFn)) {
    return titleFn(routeTitle);
  }
  const defaultTitle: string = titleFn;
  return routeTitle || defaultTitle;
}

// TODO: callback
export type DataUpdater = (data: WireObject) => void;
