import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {DataUpdater} from '../app';
import {renderTitle} from '../app';
import {createRouteElement} from '../components';
import {AppState, AppController} from './controller';

export class AppView {
  controller: AppController;
  container: Node;
  state: AppState | null;
  ancestorStates: AppState[];

  constructor(controller: AppController, container: Node) {
    this.controller = controller;
    this.container = container;
    this.state = null;

    window.addEventListener('scroll', () => {
      const docEl = document.documentElement;
      if (docEl) {
        this._onScrollChange(
          window.pageXOffset || docEl.scrollLeft,
          window.pageYOffset || docEl.scrollTop
        );
      }
    }, false);
  }

  setState(state: AppState | null, ancestorStates: AppState[]) {
    this.state = state;
    this.ancestorStates = ancestorStates;
    this._render();
  }

  _render() {
    const state = this.state;
    if (!state) {
      return;
    }

    const parent = this.ancestorStates.length > 0 ? this.ancestorStates[0] : null;
    const {handler, data, scrollX = (parent && parent.scrollX) || 0, scrollY = (parent && parent.scrollY) || 0} = state;
    document.title = renderTitle(this.controller.app, handler, data);
    const element = createRouteElement(handler.component, {
      controller: this.controller,
      data,
      writeData: this.writeData.bind(this, state),
      loader: this.controller.getLoader(),
    });
    const ancestors = this.ancestorStates.map(it => createRouteElement(it.handler.component, {
      controller: this.controller,
      data: it.data,
      writeData: this.writeData.bind(this, it),
      loader: this.controller.getLoader(),
    }));
    ReactDOM.render(<React.Fragment>{ancestors}{element}</React.Fragment>, this.container);
    window.scrollTo(scrollX, scrollY);
  }

  writeData(state: AppState, updater: DataUpdater) {
    // TODO: batch updates
    updater(state.data);
    this._render();
  }

  _onScrollChange(x: number, y: number) {
    if (this.state) {
      this.state.scrollX = x;
      this.state.scrollY = y;
    }
  }
}
