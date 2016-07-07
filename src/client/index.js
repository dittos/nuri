/* @flow */

import type {App, PreloadData} from '../app';
import {
  injectLoader,
  AppController,
} from './controller';
import {AppView} from './view';
import {BrowserEnvironment} from './env';

export {injectLoader} from './controller';

export function render(app: App, container: Node, preloadData?: PreloadData) {
  const environ = new BrowserEnvironment(container);
  const controller = new AppController(app, environ);
  const view = new AppView(controller, environ);
  controller.subscribe(() => view.setState(controller.state));
  controller.start(preloadData);
}