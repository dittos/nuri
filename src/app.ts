import pathToRegexp from 'path-to-regexp';
import isFunction = require('lodash/isFunction');
import { uriToString } from './util';
import { AppController } from './client/controller';

export type Route = {
  regexp: RegExp;
  keys: any[];
  handler: RouteHandler<any>;
};

// JSON-serializable "wire" types.
export type WireObject = { [key: string]: any };

export type RouteComponentProps<D> = {
  controller?: AppController;
  data: D;
  writeData: (updater: DataUpdater<D>) => void;
  loader: Loader;
};

export type RouteComponent<D> = React.ComponentType<RouteComponentProps<D>>;

export type Response<D> = D | Redirect;

export type RouteHandler<D> = {
  component?: RouteComponent<D>;
  load?: (request: Request) => Promise<Response<D>>;
  renderTitle?: (data: D) => string;
  renderMeta?: (data: D) => WireObject;
};

export type ParsedURI = {
  path: string;
  query: {[key: string]: any};
};

export type RouteMatch = {
  handler: RouteHandler<any>;
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

export function isRedirect(obj: any): obj is Redirect {
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

const defaultHandler: RouteHandler<any> = {
  load() {
    return Promise.reject({status: 404});
  },

  component: () => null,
};

export class App {
  routes: Route[];
  defaultHandler: RouteHandler<any>;
  title: string | ((routeTitle?: string) => string);

  constructor() {
    this.routes = [];
    this.defaultHandler = defaultHandler;
    this.title = '';
  }

  route<D>(path: string, handler: RouteHandler<D>) {
    if (path === '*') {
      this.defaultHandler = handler;
      return;
    }

    const keys: pathToRegexp.Key[] = [];
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
      const params: {[key: string]: string} = {};
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

export function renderTitle<D>(app: App, handler: RouteHandler<D>, data: D): string {
  const routeTitle = handler.renderTitle ? handler.renderTitle(data) : '';
  const titleFn: any = app.title;
  if (isFunction(titleFn)) {
    return titleFn(routeTitle);
  }
  const defaultTitle: string = titleFn;
  return routeTitle || defaultTitle;
}

// TODO: callback
export type DataUpdater<D> = (data: D) => void;
