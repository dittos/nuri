import {App, PreloadData} from '../app';
import {containerElementId, globalVariableName} from '../bootstrap';
import {AppController} from './controller';
import {AppView} from './view';
import {createHistory} from './history';

export {injectLoader} from './controller';

export function render(app: App, container: Element, preloadData?: PreloadData): AppController {
  const history = createHistory();
  const controller = new AppController(app, history);
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

export function bootstrap(app: App, callback: (controller: AppController) => void) {
  const globalVariable = (window as any)[globalVariableName];
  if (!globalVariable) {
    // HTML is not rendered yet
    (window as any)[globalVariableName] = (preloadData: any) => {
      (window as any)[globalVariableName].preloadData = preloadData;
      bootstrap(app, callback);
    };
    return;
  }
  const controller = render(app, document.getElementById(containerElementId)!, globalVariable.preloadData);
  callback(controller);
}
