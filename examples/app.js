import React from 'react';
import {createApp, Link} from '../lib';

const app = createApp();
app.title = 'Hello';

app.route('/', {
  component(props) {
    function addItem() {
      props.writeData(data => {
        data.posts.push({
          id: Date.now(),
          title: new Date().toString()
        });
      });
    }

    return <div>
      <ul>
        {props.data.posts.map(post =>
          <li key={post.id}>
            <Link to={`/posts/${post.id}`}>{post.title}</Link>
            {' '}
            <Link to={`/posts/${post.id}`} stacked>[stacked]</Link>
          </li>
        )}
      </ul>
      <button onClick={addItem}>Add Item</button>
    </div>;
  },

  load(request) {
    return request.loader('/api/posts').then(posts => ({ posts }));
  }
});

app.route('/posts/:id', {
  component(props) {
    return <div style={props.data.stacked ? {position: 'fixed', top: 0, left: '50%'} : {}}>
      {props.data.stacked && <Link to="/" returnToParent>Close</Link>}
      <h1>{props.data.post.title}</h1>
    </div>;
  },

  load(request) {
    return request.loader(`/api/posts/${request.params.id}`).then(post => ({
      post,
      stacked: request.stacked,
    }));
  },

  renderTitle(data) {
    return data.post.title;
  }
});

app.route('/:id', {
  load(request) {
    return request.redirect(`/posts/${request.params.id}`);
  }
});

export default app;
