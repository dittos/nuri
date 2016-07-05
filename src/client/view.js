/* @flow */

import React from 'react';
import type {DataUpdater} from '../app';
import {createRouteElement} from '../app';
import type {Environment} from './env';
import type {AppState} from './controller';

export class AppView {
  environ: Environment;
  state: ?AppState;

  constructor(environ: Environment) {
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

    const {handler, data} = this.state;
    if (handler.renderTitle) {
      this.environ.setTitle(handler.renderTitle(data));
    }
    const element = createRouteElement(handler.component, {
      data,
      writeData: this.writeData.bind(this, this.state),
    });
    this.environ.render(element);
  }

  writeData(state: AppState, updater: DataUpdater) {
    if (!this.state || this.state !== state)
      return;

    // TODO: batch updates
    updater(this.state.data);
    this._render();
  }
}
