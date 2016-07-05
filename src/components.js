/* @flow */

import React from 'react';
import type {DataUpdater, WireObject, RouteComponent} from './app';
import type {AppController} from './client/controller';

export class ControllerProvider extends React.Component {
  render() {
    return React.Children.only(this.props.children);
  }
  
  getChildContext() {
    return {controller: this.props.controller};
  }
}
ControllerProvider.childContextTypes = {
  controller: React.PropTypes.object
};


function isLeftClickEvent(event) {
  return event.button === 0;
}

function isModifiedEvent(event) {
  return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);
}

export function Link(props: any, context: {controller: ?AppController}) {
  const {to, onClick, ...restProps} = props;

  function handleClick(event) {
    var allowTransition = true;

    if (onClick) onClick(event);

    if (isModifiedEvent(event) || !isLeftClickEvent(event)) return;

    if (event.defaultPrevented === true) allowTransition = false;

    // If target prop is set (e.g. to "_blank") let browser handle link.
    if (props.target) {
      if (!allowTransition) event.preventDefault();

      return;
    }

    event.preventDefault();

    if (allowTransition && context && context.controller) {
      context.controller.load(to);
    }
  }

  return <a {...restProps} href={to} onClick={handleClick} />;
}

Link.contextTypes = {
  controller: React.PropTypes.object
};


export function createRouteElement(component: RouteComponent, props: {
  controller?: AppController,
  data: WireObject,
  writeData: (updater: DataUpdater) => void,
}): React.Element {
  return <ControllerProvider controller={props.controller}>
    {React.createElement(component, props)}
  </ControllerProvider>;
}
