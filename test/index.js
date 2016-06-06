import {describe, it} from 'mocha';
import assert from 'assert';
import React from 'react';
import {createApp, matchRoute} from '../lib/app';

function Component(props) {
  return React.createElement('div');
}

describe('App', () => {
  it('should match registered routes', () => {
    const app = createApp();
    const handler = {
      component: Component,
      load: () => ({}),
    };
    app.route('/posts/:id', handler);

    const request = matchRoute({app, path: '/posts/1234'});
    assert.equal(request.handler, handler);
    assert.deepEqual(request.params, {id: 1234});

    assert.equal(matchRoute({app, path: '/no-match'}), null);
  });
});
