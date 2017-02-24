/* @flow */

import type {App, PreloadData, Loader} from '../app';
import {AppController} from './controller';
import {AppView} from './view';
import {createHistory} from './history';

let _loader: Loader;

export function injectLoader(loader: typeof _loader) {
  _loader = loader;
}

export function render(app: App, container: Node, preloadData?: PreloadData): AppController {
  const history = createHistory();
  const controller = new AppController(app, history, _loader);
  const view = new AppView(controller, container);
  controller.subscribe({
    willLoad() {},
    didLoad() {},
    didAbortLoad() {},
    didCommitState() {
      view.setState(controller.state);
    },
  });
  controller.start(preloadData);
  return controller;
}
