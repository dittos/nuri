import React from 'react';
import {createApp} from '../lib/app';

const app = createApp();

app.route('/', {
  component(props) {
    function addItem() {
      props.setData({ posts: [
        {
          id: Date.now(),
          title: new Date().toString()
        },
        ...props.data.posts
      ] });
    }

    return React.createElement('div', null,
      React.createElement('ul', null,
        props.data.posts.map(post => React.createElement('li', {key: post.id},
          React.createElement('a', {href: `/posts/${post.id}`}, post.title)
        ))
      ),
      React.createElement('button', {onClick: addItem}, 'Add Item')
    );
  },

  load(request) {
    return request.loader('/api/posts').then(posts => ({ posts }));
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
  },

  renderTitle(data) {
    return data.title;
  }
});

export default app;
