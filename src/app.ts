import pathToRegexp from 'path-to-regexp';
import isFunction = require('lodash/isFunction');
import { uriToString } from './util';
import { AppController } from './client/controller';

export type Route<L> = {
  regexp: RegExp;
  keys: any[];
  handler: RouteHandler<any, L>;
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

export type Response<D> = D | Redirect;

export type RouteHandler<D, L> = {
  component?: RouteComponent<D, L>;
  load?: (request: Request<L>) => Promise<Response<D>>;
  renderTitle?: (data: D) => string;
  renderMeta?: (data: D) => WireObject;
};

export type ParsedURI = {
  path: string;
  query: {[key: string]: any};
};

export type RouteMatch<L> = {
  handler: RouteHandler<any, L>;
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
};

export function createRequest<L>(base: BaseRequest<L>): Request<L> {
  return {
    ...base,
    redirect,
  };
}

export type PreloadData = WireObject;

const defaultHandler: RouteHandler<any, any> = {
  load() {
    return Promise.reject({status: 404});
  },

  component: () => null,
};

export class App<L> {
  routes: Route<L>[];
  defaultHandler: RouteHandler<any, L>;
  title: string | ((routeTitle?: string) => string);

  constructor() {
    this.routes = [];
    this.defaultHandler = defaultHandler;
    this.title = '';
  }

  route<D>(path: string, handler: RouteHandler<D, L>) {
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

export function createApp<L>(): App<L> {
  return new App();
}

export function matchRoute<L>(app: App<L>, uri: ParsedURI): RouteMatch<L> {
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

export function renderTitle<D, L>(app: App<L>, handler: RouteHandler<D, L>, data: D): string {
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
