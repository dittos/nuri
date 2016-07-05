/* @flow */

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import type {App, Request, Wire, WireObject, PreloadData, DataUpdater} from './app';
import {matchRoute, createRouteElement} from './app';

type ServerRequest = {
  path: string;
  query: {[key: string]: string};
};

type RenderResult = {
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
  if (!matchedRequest)
    return Promise.reject();

  const handler = matchedRequest.handler;
  const dataPromise = Promise.resolve(handler.load(matchedRequest));
  return dataPromise.then(data => {
    const element = createRouteElement(handler.component, {
      data,
      writeData: noOpWriteData,
    });
    const html = ReactDOMServer.renderToString(element);
    return {
      html,
      preloadData: data,
      title: handler.renderTitle ? handler.renderTitle(data) : undefined,
      meta: handler.renderMeta ? handler.renderMeta(data) : undefined,
    };
  });
}
