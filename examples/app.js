import React from 'react';
import {createApp} from '../lib/app';

const app = createApp();

app.route('/', {
  component(props) {
    return React.createElement('div', null,
      props.data.map(post => React.createElement('li', {key: post.id},
        React.createElement('a', {href: `/posts/${post.id}`}, post.title)
      ))
    );
  },

  load(request) {
    return request.loader('/api/posts');
  }
});

app.route('/posts/:id', {
  component(props) {
    return React.createElement('div', null,
      React.createElement('h1', null, props.data.title)
    );
  },

  load(request) {
    return request.loader(`/api/posts/${request.params.id}`);
  }
});

export default app;
