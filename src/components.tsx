import * as React from 'react';
import {RouteComponent, RouteComponentProps} from './app';
import {uriToString} from './util';
import {AppController} from './client/controller';

export const ControllerContext = React.createContext<AppController | undefined>(undefined);

function isLeftClickEvent(event) {
  return event.button === 0;
}

function isModifiedEvent(event) {
  return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);
}

export interface LinkProps {
  to: string;
  queryParams?: {[key: string]: any};
  onClick?: any;
  target?: string;
  stacked?: boolean;
  returnToParent?: boolean;
}

export function Link(props: LinkProps & React.AnchorHTMLAttributes<any>) {
  const controller = React.useContext(ControllerContext);
  const { to, queryParams = {}, onClick, stacked = false, returnToParent = false, ...restProps } = props;
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

    if (allowTransition && controller) {
      controller.load(uri, { stacked, returnToParent });
    }
  }

  const href = uriToString(uri);
  return <a {...restProps} href={href} onClick={handleClick} />;
}


function Null() {
  return null;
}

export function createRouteElement<D>(component: RouteComponent<D> | undefined | null, props: RouteComponentProps<D>): React.ReactElement<any> {
  if (!component)
    return <Null />;
  return <ControllerContext.Provider value={props.controller}>
    {React.createElement(component, props)}
  </ControllerContext.Provider>;
}
