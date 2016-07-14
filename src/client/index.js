/* @flow */

import type {App, PreloadData} from '../app';
import {
  injectLoader,
  AppController,
} from './controller';
import {AppView} from './view';
import {BrowserHistory} from './history';

export {injectLoader} from './controller';

export function render(app: App, container: Node, preloadData?: PreloadData): AppController {
  const history = new BrowserHistory();
  const controller = new AppController(app, history);
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
