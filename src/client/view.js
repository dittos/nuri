/* @flow */

import ReactDOM from 'react-dom';
import type {DataUpdater} from '../app';
import {renderTitle} from '../app';
import {createRouteElement} from '../components';
import type {AppState, AppController} from './controller';

export class AppView {
  controller: AppController;
  container: Node;
  state: ?AppState;

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

  setState(state: ?AppState) {
    this.state = state;
    this._render();
  }

  _render() {
    const state = this.state;
    if (!state) {
      return;
    }

    const {handler, data, scrollX = 0, scrollY = 0} = state;
    document.title = renderTitle(this.controller.app, handler, data);
    const element = createRouteElement(handler.component, {
      controller: this.controller,
      data,
      writeData: this.writeData.bind(this, state),
      loader: this.controller.getLoader(),
    });
    ReactDOM.render(element, this.container);
    window.scrollTo(scrollX, scrollY);
  }

  writeData(state: AppState, updater: DataUpdater) {
    if (!this.state || this.state !== state)
      return;

    // TODO: batch updates
    updater(this.state.data);
    this._render();
  }

  _onScrollChange(x: number, y: number) {
    if (this.state) {
      this.state.scrollX = x;
      this.state.scrollY = y;
    }
  }
}
