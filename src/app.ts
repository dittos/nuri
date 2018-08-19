import * as pathToRegexp from 'path-to-regexp';
import isFunction = require('lodash/isFunction');
import { uriToString } from './util';

export type Route = {
  regexp: RegExp;
  keys: any[];
  handler: RouteHandler;
};

// JSON-serializable "wire" types.
export type WireObject = { [key: string]: any };

export type RouteComponent = React.ComponentType<any>;

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

export type RedirectOptions = {
  stacked?: boolean; // client only
};

export class Redirect {
  uri: string;
  options: RedirectOptions;

  constructor(
    uri: string | ParsedURI,
    options: RedirectOptions = { stacked: false }
  ) {
    this.uri = uriToString(uri);
    this.options = options;
  }
}

function redirect(uri: string | ParsedURI, options?: RedirectOptions): Promise<Redirect> {
  return Promise.resolve(new Redirect(uri, options));
}

export function isRedirect(obj: any): boolean {
  return obj instanceof Redirect;
}

export type BaseRequest = {
  app: App;
  loader: Loader;
  uri: string;
  path: string;
  query: {[key: string]: any};
  params: {[key: string]: any};
  stacked?: boolean; // client only
};

export type Request = BaseRequest & {
  redirect: (uri: string | ParsedURI, options?: RedirectOptions) => Promise<Redirect>;
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
  routes: Route[];
  defaultHandler: RouteHandler;
  title: string | ((routeTitle?: string) => string);

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
