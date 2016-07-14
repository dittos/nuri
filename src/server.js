/* @flow */

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import type {App, Request, Wire, WireObject, PreloadData, RouteHandler, DataUpdater} from './app';
import {matchRoute, renderTitle} from './app';
import {createRouteElement} from './components';

type ServerRequest = {
  path: string;
  query: {[key: string]: string};
};

type RenderResult = {
  status: number;
  html: string;
  preloadData: PreloadData;
  title: string;
  meta: WireObject;
};

let _loaderFactory: (serverRequest: ServerRequest) => any;

export function injectLoaderFactory(loaderFactory: typeof _loaderFactory) {
  _loaderFactory = loaderFactory;
}

function noOpWriteData(updater: DataUpdater) {}

export function render(app: App, serverRequest: ServerRequest): Promise<RenderResult> {
  const {handler, params} = matchRoute(app, serverRequest);
  const request = {
    app,
    loader: _loaderFactory(serverRequest),
    path: serverRequest.path,
    query: serverRequest.query,
    params,
  };
  const loadPromise = handler.load ?
    handler.load(request)
    : Promise.resolve({});
  return loadPromise.then(
    data => createResult(app, 200, handler, data),
    err => err.status ?
      createResult(app, err.status, handler, {})
      : Promise.reject(err)
  );
}

function createResult(app: App, status: number, handler: RouteHandler, data: WireObject) {
  const element = createRouteElement(handler.component, {
    data,
    writeData: noOpWriteData,
  });
  const html = ReactDOMServer.renderToString(element);
  return {
    status,
    html,
    preloadData: data,
    title: renderTitle(app, handler, data),
    meta: handler.renderMeta ? handler.renderMeta(data) : {},
  };
}
