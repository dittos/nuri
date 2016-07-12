import {describe, it} from 'mocha';
import assert from 'assert';
import React from 'react';
import {createApp, matchRoute} from '../src/app';

function Component(props) {
  return React.createElement('div');
}

describe('App', () => {
  it('should match registered routes', () => {
    const app = createApp();
    const handler = {
      component: Component,
      load: () => Promise.resolve({}),
    };
    app.route('/posts/:id', handler);

    const request = matchRoute({app, path: '/posts/1234'});
    assert.equal(request.handler, handler);
    assert.deepEqual(request.params, {id: 1234});
  });

  it('should match default fallback route', () => {
    const app = createApp();

    const fallbackMatch = matchRoute({app, path: '/no-match'});
    assert.equal(fallbackMatch.handler, app.defaultHandler);
    assert.deepEqual(fallbackMatch.params, {});
  });

  it('should match user fallback route', () => {
    const app = createApp();
    const handler = {
      component: Component,
      load: () => Promise.resolve({}),
    };
    app.route('*', handler);

    const fallbackMatch = matchRoute({app, path: '/no-match'});
    assert.equal(fallbackMatch.handler, handler);
    assert.deepEqual(fallbackMatch.params, {});
  });
});
