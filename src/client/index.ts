import {App, PreloadData} from '../app';
import {AppController} from './controller';
import {AppView} from './view';
import {createHistory} from './history';

export {injectLoader} from './controller';

export function render(app: App, container: Node, preloadData?: PreloadData): AppController {
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
