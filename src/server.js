/* @flow */

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import type {App, Request, Response, Redirect, WireObject, PreloadData, RouteHandler, DataUpdater, Loader} from './app';
import {matchRoute, renderTitle, createRequest, isRedirect} from './app';
import {createRouteElement} from './components';

type ServerRequest = {
  path: string;
  query: {[key: string]: string};
};

type RenderResult = {
  html: string;
  preloadData: PreloadData;
  title: string;
  meta: WireObject;
  errorStatus?: number;
  redirectURI?: string;
};

let _loaderFactory: (serverRequest: ServerRequest) => Loader;

export function injectLoaderFactory(loaderFactory: typeof _loaderFactory) {
  _loaderFactory = loaderFactory;
}

function noOpWriteData(updater: DataUpdater) {}

export function render(app: App, serverRequest: ServerRequest): Promise<RenderResult> {
  const {handler, params} = matchRoute(app, serverRequest);
  const request = createRequest({
    app,
    loader: _loaderFactory(serverRequest),
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
      : Promise.reject(err)
  );
}

function createResult(request: Request, handler: RouteHandler, response: Response, errorStatus?: number) {
  const data = !isRedirect(response) ? response : {};
  const element = createRouteElement(handler.component, {
    data,
    writeData: noOpWriteData,
    loader: request.loader,
  });
  const html = ReactDOMServer.renderToString(element);
  return {
    html,
    preloadData: data,
    title: renderTitle(request.app, handler, data),
    meta: handler.renderMeta ? handler.renderMeta(data) : {},
    errorStatus,
    redirectURI: isRedirect(response) ?
      ((response: any): Redirect).uri
      : undefined,
  };
}
