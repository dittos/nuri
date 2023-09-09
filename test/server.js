import {describe, it} from 'mocha';
import assert from 'assert';
import React from 'react';
import {createApp} from '../lib/app';
import {render} from '../lib/server';
import {wrapHTML} from '../lib/bootstrap';

function Component(props) {
  return React.createElement('div', null, props.data.post.title);
}

describe('Server', () => {
  it('should render request', done => {
    const app = createApp();
    // something similar to Express request object
    const serverRequest = {
      path: '/posts/1234',
      query: {}
    };

    const handler = {
      component: Component,

      load(request) {
        assert.equal(request.loader, serverRequest);
        assert.equal(request.path, serverRequest.path);
        assert.deepEqual(request.query, serverRequest.query);
        return Promise.resolve({
          path: request.path,
          post: { title: 'Hello!' },
        })
      },

      renderTitle(data) { return data.post.title; },
      renderMeta(data) { return {description: data.post.title}; },
    };
    app.route('/posts/:id', handler);

    render(app, serverRequest, serverRequest).then(result => {
      assert.equal(result.getHTML(),
        wrapHTML('<div>Hello!</div>'));
      assert.deepEqual(result.preloadData, {
        path: serverRequest.path,
        post: { title: 'Hello!' }
      });
      assert.equal(result.title, 'Hello!');
      assert.deepEqual(result.meta, {description: 'Hello!'});
      assert.ok(!result.errorStatus);
      assert.ok(!result.redirectURI);
      done();
    }).catch(done);
  });

  it('should return errorStatus 404 on unknown route', done => {
    const app = createApp();
    // something similar to Express request object
    const serverRequest = {
      path: '/posts/1234',
      query: {}
    };

    render(app, serverRequest).then(result => {
      assert.equal(result.errorStatus, 404);
      assert.strictEqual(result.getHTML(), '');
      done();
    }).catch(done);
  });

  it('should redirect', done => {
    const app = createApp();
    app.route('/', {
      load: ({ redirect }) => redirect('gogo'),
      component: () => { assert.fail() },
    });
    // something similar to Express request object
    const serverRequest = {
      path: '/',
      query: {}
    };

    render(app, serverRequest).then(result => {
      assert.ok(!result.errorStatus);
      assert.equal(result.redirectURI, 'gogo');
      done();
    }).catch(done);
  });
});
