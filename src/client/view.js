/* @flow */

import React from 'react';
import ReactDOM from 'react-dom';
import type {DataUpdater} from '../app';
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
  }

  setState(state: ?AppState) {
    this.state = state;
    this._render();
  }

  _render() {
    if (!this.state) {
      return;
    }

    const {handler, data, scrollX, scrollY} = this.state;
    if (handler.renderTitle) {
      document.title = handler.renderTitle(data);
    } else {
      // TODO: app default title
    }
    const element = createRouteElement(handler.component, {
      controller: this.controller,
      data,
      writeData: this.writeData.bind(this, this.state),
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
}
