import {App, PreloadData} from '../app';
import {containerElementId, globalVariableName} from '../bootstrap';
import {AppController} from './controller';
import {AppView} from './view';
import {createHistory} from './history';

export function render<L>(app: App<L>, container: Element, loader: L, preloadData?: PreloadData): AppController<L> {
  const history = createHistory();
  const controller = new AppController(app, history, loader);
  const view = new AppView(controller, container);
  controller.subscribe({
    willLoad() {},
    didLoad() {},
    didAbortLoad() {},
    didFailLoad() {},
    didCommitState(state, ancestorStates) {
      view.setState(state, ancestorStates);
    }
  });
  controller.start(preloadData);
  return controller;
}

export function onPreloadDataReady(callback: (preloadData: any) => void) {
  const globalVariable = (window as any)[globalVariableName];
  if (!globalVariable.preloadData) {
    // HTML is not rendered yet
    (window as any)[globalVariableName] = (preloadData: any) => {
      (window as any)[globalVariableName].preloadData = preloadData;
      callback(preloadData);
    };
    return;
  }
  callback(globalVariable.preloadData);
}

export function bootstrap<L>(app: App<L>, loader: L, callback: (controller: AppController<L>) => void) {
  onPreloadDataReady(preloadData => {
    const controller = render(app, document.getElementById(containerElementId)!, loader, preloadData);
    callback(controller);
  });
}
