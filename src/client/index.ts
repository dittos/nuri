import {App, PreloadData} from '../app';
import {containerElementId} from '../bootstrap';
import {AppController} from './controller';
import {AppView, ClientSideErrorHandler} from './view';
import {createHistory} from './history';
import {onPreloadDataReady} from './preload';

export function render<L>(
  app: App<L>,
  container: Element,
  loader: L,
  errorHandler: ClientSideErrorHandler,
  preloadData?: PreloadData,
): AppController<L> {
  const history = createHistory();
  const controller = new AppController(app, history, loader);
  const view = new AppView(controller, container, errorHandler);
  controller.subscribe({
    willLoad() {},
    didLoad() {},
    didAbortLoad() {},
    didCommitState(state, ancestorStates) {
      view.setState(state, ancestorStates);
    }
  });
  controller.start(preloadData);
  return controller;
}

export function bootstrap<L>(app: App<L>, loader: L, errorHandler: ClientSideErrorHandler, callback: (controller: AppController<L>) => void) {
  onPreloadDataReady(preloadData => {
    const controller = render(app, document.getElementById(containerElementId)!, loader, errorHandler, preloadData);
    callback(controller);
  });
}
