import pathToRegexp from 'path-to-regexp';
import isFunction = require('lodash/isFunction');
import { uriToString } from './util';
import { AppController } from './client/controller';

export type Route<L> = {
  regexp: RegExp;
  keys: any[];
  handler: RouteHandler<any, L>;
};

export type LazyRoute<L> = {
  regexp: RegExp;
  keys: any[];
  handler: LazyRouteHandler<any, L>;
};

// JSON-serializable "wire" types.
export type WireObject = { [key: string]: any };

export type RouteComponentProps<D, L> = {
  controller?: AppController<L>;
  data: D;
  writeData: (updater: DataUpdater<D>) => void;
  loader: L;
};

export type RouteComponent<D, L> = React.ComponentType<RouteComponentProps<D, L>>;

export type Response<D> = D | Redirect | NotFound;

export type RouteHandler<D, L> = {
  component?: RouteComponent<D, L>;
  load?: (request: Request<L>) => Promise<Response<D>>;
  renderTitle?: (data: D) => string;
  renderMeta?: (data: D) => WireObject;
};

export type LazyRouteHandler<D, L> = () => Promise<RouteHandler<D, L>>;

export type ParsedURI = {
  path: string;
  query: {[key: string]: any};
};

export type RouteMatch<L> = {
  handler: RouteHandler<any, L>;
  params: {[key: string]: any};
};

export type LazyRouteMatch<L> = {
  handler: LazyRouteHandler<any, L>;
  params: {[key: string]: any};
};

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

export class NotFound {}

function notFound(): Promise<NotFound> {
  return Promise.resolve(new NotFound());
}

export function isNotFound(obj: any): obj is NotFound {
  return obj instanceof NotFound;
}

export type BaseRequest<L> = {
  loader: L;
  uri: string;
  path: string;
  query: {[key: string]: any};
  params: {[key: string]: any};
  stacked?: boolean; // client only
};

export type Request<L> = BaseRequest<L> & {
  redirect: (uri: string | ParsedURI, options?: RedirectOptions) => Promise<Redirect>;
  notFound: () => Promise<NotFound>;
};

export function createRequest<L>(base: BaseRequest<L>): Request<L> {
  return {
    ...base,
    redirect,
    notFound,
  };
}

export type PreloadData = WireObject;

export class App<L> {
  routes: Route<L>[];
  lazyRoutes: LazyRoute<L>[];
  title: string | ((routeTitle?: string) => string);

  constructor() {
    this.routes = [];
    this.lazyRoutes = [];
    this.title = '';
  }

  route<D>(path: string, handler: RouteHandler<D, L>) {
    const keys: pathToRegexp.Key[] = [];
    const regexp = pathToRegexp(path, keys);
    this.routes.push({
      regexp,
      keys,
      handler,
    });
  }

  lazyRoute<D>(path: string, handler: () => Promise<RouteHandler<D, L>>) {
    const keys: pathToRegexp.Key[] = [];
    const regexp = pathToRegexp(path, keys);
    this.lazyRoutes.push({
      regexp,
      keys,
      handler,
    });
  }
}

export function createApp<L>(): App<L> {
  return new App();
}

export function matchRoute<L>(app: App<L>, uri: ParsedURI): RouteMatch<L> | null {
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
  return null;
}

export function matchLazyRoute<L>(app: App<L>, uri: ParsedURI): LazyRouteMatch<L> | null {
  const routes = app.lazyRoutes;
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
  return null;
}

export function renderTitle<D, L>(app: App<L>, handler: RouteHandler<D, L>, data: D): string {
  const routeTitle = handler.renderTitle ? handler.renderTitle(data) : '';
  return applyAppTitle(app, routeTitle);
}

export function applyAppTitle(app: App<any>, routeTitle: string): string {
  const titleFn: any = app.title;
  if (isFunction(titleFn)) {
    return titleFn(routeTitle);
  }
  const defaultTitle: string = titleFn;
  return routeTitle || defaultTitle;
}

// TODO: callback
export type DataUpdater<D> = (data: D) => void;
