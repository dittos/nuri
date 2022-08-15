import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {applyAppTitle, DataUpdater} from '../app';
import {renderTitle} from '../app';
import {createRouteElement} from '../components';
import {AppState, AppController} from './controller';

export type ErrorHandlerProps = {
  error: any;
}

export type ClientSideErrorHandler = {
  component: React.ComponentType<ErrorHandlerProps>;
  renderTitle?: (error: any) => string;
}

export class AppView<L> {
  state: AppState | null = null;
  ancestorStates: AppState[] = [];

  constructor(
    private controller: AppController<L>,
    private container: Element,
    private errorHandler: ClientSideErrorHandler,
  ) {
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

  setState(state: AppState, ancestorStates: AppState[]) {
    this.state = state;
    this.ancestorStates = ancestorStates;
    this._render();
  }

  _render() {
    const state = this.state;
    if (!state) {
      return;
    }

    const parent = this.ancestorStates.length > 0 ? this.ancestorStates[this.ancestorStates.length - 1] : null;
    const {scrollX = (parent && parent.scrollX) || 0, scrollY = (parent && parent.scrollY) || 0} = state;
    if (state.status === 'ok') {
      const {handler, data} = state;
      document.title = renderTitle(this.controller.app, handler, data);
      const elements = [...this.ancestorStates, state].map(it =>
        it.status === 'ok' ? (
          createRouteElement(it.handler.component, {
            controller: this.controller,
            data: it.data,
            writeData: this.writeData.bind(this, it),
            loader: this.controller.getLoader(),
          })
        ) : React.createElement('span')
      );
      ReactDOM.render(elements, this.container);
    } else if (state.status === 'error') {
      const routeTitle = this.errorHandler.renderTitle ? this.errorHandler.renderTitle(state.error) : '';
      document.title = applyAppTitle(this.controller.app, routeTitle);
      ReactDOM.render(React.createElement(this.errorHandler.component, {error: state.error}), this.container);
    }
    window.scrollTo(scrollX, scrollY);
  }

  writeData(state: AppState, updater: DataUpdater<any>) {
    if (state.status !== 'ok') return;
    
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
