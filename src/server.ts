import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';
import {App, Request, Response, WireObject, PreloadData, RouteHandler, DataUpdater, isNotFound} from './app';
import {matchRoute, renderTitle, createRequest, isRedirect} from './app';
import {createRouteElement} from './components';
import {wrapHTML} from './bootstrap';

export interface ServerRequest {
  url: string;
  path: string;
  query: {[key: string]: string};
}

export type RenderResult = {
  preloadData: PreloadData;
  title: string;
  meta: WireObject;
  errorStatus?: number;
  redirectURI?: string;
  element?: React.ReactElement<any>;
  getHTML(): string;
};

// eslint-disable-next-line no-unused-vars
function noOpWriteData(updater: DataUpdater<any>) {}

export function render<L>(app: App<L>, serverRequest: ServerRequest, loader: L): Promise<RenderResult> {
  const match = matchRoute(app, serverRequest);
  if (!match) {
    return Promise.resolve(createNotFoundResult());
  }
  const {handler, params} = match;
  const request = createRequest({
    loader,
    uri: serverRequest.url,
    path: serverRequest.path,
    query: serverRequest.query,
    params,
  });
  const loadPromise = handler.load ?
    handler.load(request)
    : Promise.resolve({});
  return loadPromise.then(
    response => createResult(app, request, handler, response),
    err => Promise.reject(err)
  );
}

function createNotFoundResult() {
  return {
    preloadData: {},
    title: '',
    meta: {},
    errorStatus: 404,
    getHTML: () => '',
  };
}

function createResult<D, L>(app: App<L>, request: Request<L>, handler: RouteHandler<D, L>, response: Response<D>) {
  if (isRedirect(response)) {
    return {
      preloadData: {},
      title: '',
      meta: {},
      redirectURI: response.uri,
      getHTML: () => '',
    };
  }
  if (isNotFound(response)) {
    return createNotFoundResult();
  }

  const data = response;
  const element = createRouteElement(handler.component, {
    data,
    writeData: noOpWriteData,
    loader: request.loader,
  });
  return {
    preloadData: data,
    title: renderTitle(app, handler, data),
    meta: handler.renderMeta ? handler.renderMeta(data) : {},
    element,
    getHTML() {
      return wrapHTML(ReactDOMServer.renderToString(element));
    }
  };
}
