/* @flow */

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import type {App, Request, Wire, WireObject, PreloadData, RouteHandler, DataUpdater} from './app';
import {matchRoute} from './app';
import {createRouteElement} from './components';

type ServerRequest = {
  path: string;
  query: {[key: string]: string};
};

type RenderResult = {
  status: number;
  html: string;
  preloadData: PreloadData;
  title?: string;
  meta?: WireObject;
};

let _loaderFactory: (serverRequest: ServerRequest) => any;

export function injectLoaderFactory(loaderFactory: typeof _loaderFactory) {
  _loaderFactory = loaderFactory;
}

function noOpWriteData(updater: DataUpdater) {}

export function render(app: App, serverRequest: ServerRequest): Promise<RenderResult> {
  const request = {
    app,
    loader: _loaderFactory(serverRequest),
    path: serverRequest.path,
    query: serverRequest.query,
  };
  const matchedRequest = matchRoute(request);
  const handler = matchedRequest.handler;
  const dataPromise = Promise.resolve(handler.load(matchedRequest));
  return dataPromise.then(
    data => createResult(200, handler, data),
    err => err.status ?
      createResult(err.status, handler, {})
      : Promise.reject(err)
  );
}

function createResult(status: number, handler: RouteHandler, data: WireObject) {
  const element = createRouteElement(handler.component, {
    data,
    writeData: noOpWriteData,
  });
  const html = ReactDOMServer.renderToString(element);
  return {
    status,
    html,
    preloadData: data,
    title: handler.renderTitle ? handler.renderTitle(data) : undefined,
    meta: handler.renderMeta ? handler.renderMeta(data) : undefined,
  };
}
