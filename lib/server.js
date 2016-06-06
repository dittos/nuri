/* @flow */

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import type {App, Request, Wire, WireObject} from './app';
import {matchRoute} from './app';

type ServerRequest = {
  path: string;
  query: {[key: string]: string};
};

type RenderResult = {
  html: string;
  preloadData: Wire;
  title?: string;
  meta?: WireObject;
};

let _loaderFactory: (serverRequest: ServerRequest) => any;

export function injectLoaderFactory(loaderFactory: typeof _loaderFactory) {
  _loaderFactory = loaderFactory;
}

export function createRequest(app: App, serverRequest: ServerRequest): Request {
  return {
    app,
    loader: _loaderFactory(serverRequest),
    path: serverRequest.path,
    query: serverRequest.query,
  };
}

export function render(request: Request): Promise<RenderResult> {
  const matchedRequest = matchRoute(request);
  if (!matchedRequest)
    return Promise.reject();

  const handler = matchedRequest.handler;
  const dataPromise = Promise.resolve(handler.load(matchedRequest));
  return dataPromise.then(data => {
    const element = React.createElement(handler.component, { data });
    const html = ReactDOMServer.renderToString(element);
    return {
      html,
      preloadData: data,
      title: handler.renderTitle ? handler.renderTitle(data) : undefined,
      meta: handler.renderMeta ? handler.renderMeta(data) : undefined,
    };
  });
}
