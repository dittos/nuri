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
    didCommitState(state, ancestorStates) {
      view.setState(state, ancestorStates);
    }
  });
  controller.start(preloadData);
  return controller;
}

export function bootstrap<L>(app: App<L>, loader: L, callback: (controller: AppController<L>) => void) {
  const globalVariable = (window as any)[globalVariableName];
  if (!globalVariable) {
    // HTML is not rendered yet
    (window as any)[globalVariableName] = (preloadData: any) => {
      (window as any)[globalVariableName].preloadData = preloadData;
      bootstrap(app, loader, callback);
    };
    return;
  }
  const controller = render(app, document.getElementById(containerElementId)!, loader, globalVariable.preloadData);
  callback(controller);
}
