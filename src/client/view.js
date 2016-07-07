/* @flow */

import React from 'react';
import type {DataUpdater} from '../app';
import {createRouteElement} from '../components';
import type {Environment} from './env';
import type {AppState, AppController} from './controller';

export class AppView {
  controller: AppController;
  environ: Environment;
  state: ?AppState;

  constructor(controller: AppController, environ: Environment) {
    this.controller = controller;
    this.environ = environ;
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
      this.environ.setTitle(handler.renderTitle(data));
    }
    const element = createRouteElement(handler.component, {
      controller: this.controller,
      data,
      writeData: this.writeData.bind(this, this.state),
    });
    this.environ.render(element);
    this.environ.scrollTo(scrollX, scrollY);
  }

  writeData(state: AppState, updater: DataUpdater) {
    if (!this.state || this.state !== state)
      return;

    // TODO: batch updates
    updater(this.state.data);
    this._render();
  }
}
