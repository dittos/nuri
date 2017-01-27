/* @flow */

import React from 'react';
import type {DataUpdater, WireObject, RouteComponent, Loader} from './app';
import {uriToString} from './util';
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

export function Link(props: {
  to: string,
  queryParams?: {[key: string]: any},
  onClick: any,
}, context: {controller: ?AppController}) {
  const { to, queryParams = {}, onClick, ...restProps } = props;
  const uri = {
    path: to,
    query: queryParams,
  };

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
      context.controller.load(uri);
    }
  }

  const href = uriToString(uri);
  return <a {...restProps} href={href} onClick={handleClick} />;
}

Link.contextTypes = {
  controller: React.PropTypes.object
};


function Null() {
  return null;
}

export function createRouteElement(component?: RouteComponent, props: {
  controller?: AppController,
  data: WireObject,
  writeData: (updater: DataUpdater) => void,
  loader: Loader,
}): React.Element<any> {
  if (!component)
    return <Null />;
  return <ControllerProvider controller={props.controller}>
    {React.createElement(component, props)}
  </ControllerProvider>;
}
