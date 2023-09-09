import {describe, it} from 'mocha';
import assert from 'assert';
import React from 'react';
import {createApp, matchRoute, renderTitle} from '../lib/app';

function Component(props) {
  return React.createElement('div');
}

describe('matchRoute', () => {
  it('should match registered routes', () => {
    const app = createApp();
    const handler = {
      component: Component,
      load: () => Promise.resolve({}),
    };
    app.route('/posts/:id', handler);

    const request = matchRoute(app, {path: '/posts/1234'});
    assert.equal(request.handler, handler);
    assert.deepEqual(request.params, {id: 1234});
  });

  it('should return null on no match', () => {
    const app = createApp();

    const fallbackMatch = matchRoute(app, {path: '/no-match'});
    assert.strictEqual(fallbackMatch, null);
  });
});

describe('renderTitle', () => {
  it('should render title', () => {
    const app = createApp();
    const handler = {
      renderTitle: (data) => data.title
    };
    const actual = renderTitle(app, handler, {title: 'Hello'});
    assert.equal(actual, 'Hello');
  });

  it('should render title with app title function', () => {
    const app = createApp();
    app.title = (routeTitle) => '((' + routeTitle + '))';
    const handler = {
      renderTitle: (data) => data.title
    };
    const actual = renderTitle(app, handler, {title: 'Hello'});
    assert.equal(actual, '((Hello))');
  });

  it('should render default title', () => {
    const app = createApp();
    app.title = 'Default';
    const handler = {};
    const actual = renderTitle(app, handler, {title: 'Hello'});
    assert.equal(actual, app.title);
  });
});
