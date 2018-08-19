import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';
import {App, Request, Response, Redirect, WireObject, PreloadData, RouteHandler, DataUpdater, Loader} from './app';
import {matchRoute, renderTitle, createRequest, isRedirect} from './app';
import {createRouteElement} from './components';

export type ServerRequest = {
  url: string;
  path: string;
  query: {[key: string]: string};
};

export type RenderResult = {
  preloadData: PreloadData;
  title: string;
  meta: WireObject;
  errorStatus?: number;
  redirectURI?: string;
  element?: React.ReactElement<any>;
  getHTML(): string;
};

let _loaderFactory: (serverRequest: ServerRequest) => Loader;

export function injectLoaderFactory(loaderFactory: (serverRequest: ServerRequest) => Loader) {
  _loaderFactory = loaderFactory;
}

// eslint-disable-next-line no-unused-vars
function noOpWriteData(updater: DataUpdater) {}

export function render(app: App, serverRequest: ServerRequest): Promise<RenderResult> {
  const {handler, params} = matchRoute(app, serverRequest);
  const request = createRequest({
    app,
    loader: _loaderFactory(serverRequest),
    uri: serverRequest.url,
    path: serverRequest.path,
    query: serverRequest.query,
    params,
  });
  const loadPromise = handler.load ?
    handler.load(request)
    : Promise.resolve({});
  return loadPromise.then(
    response => createResult(request, handler, response),
    err => err.status ?
      createResult(request, handler, {}, err.status)
      : Promise.reject<RenderResult>(err)
  );
}

function createResult(request: Request, handler: RouteHandler, response: Response, errorStatus?: number) {
  if (isRedirect(response)) {
    return {
      preloadData: {},
      title: '',
      meta: {},
      redirectURI: (response as Redirect).uri,
      getHTML: () => '',
    };
  }

  const data = response;
  const element = createRouteElement(handler.component, {
    data,
    writeData: noOpWriteData,
    loader: request.loader,
  });
  return {
    preloadData: data,
    title: renderTitle(request.app, handler, data),
    meta: handler.renderMeta ? handler.renderMeta(data) : {},
    errorStatus,
    element,
    getHTML() {
      return ReactDOMServer.renderToString(element);
    }
  };
}
