# Nuri

**Nuri** is a URL routing library for React with integrated data fetching and server-side rendering support.

## Writing a Nuri app

### Write shared (isomorphic) app code

*app.js*

```js
import React from 'react';
import {createApp} from 'nuri';

var app = createApp();

app.route(
  // Path pattern is similar to Express
  '/posts/:id',
  
  {
    // `Post` component is rendered on path `/posts/blahblah`
    component: Post,
    
    // `load` hook returns promise
    // The component is rendered after the promise resolved
    load: (request) => {
      // What is `loader`? It'll be explained later.
      return request.loader('/api/posts/' + request.params.id);
    },
    
    // Set document title (optional)
    renderTitle: (data) => data.title,
  }
});

function Post(props) {
  // Data loaded by `load` hook is provided as `data` prop.
  return <h1>{props.data.title}</h1>;
}

export default app;
```

### Boot the app in the browser

(Assuming you are using bundler)

```js
import {injectLoader, render} from 'nuri/client';
import {app} from './app';

// Inject loader to be accesible from `load` hook
injectLoader(function loader(path) {
  return fetch(path).then(r => r.json());
});

render(
  // Render `app` to DOM node
  app,
  document.getElementById('container'),
  
  // Provide the data preloaded from server.
  // If exist, for the first route, `load` hook is skipped and
  // component is rendered immediately without additional data fetching.
  window.preloadData
);
```

### Server-side rendering

```js
import 'isomorphic-fetch';
import {injectLoaderFactory, render} from 'nuri/server';
import app from './app';

// Loader Factory is called per request and returned loader is passed into `load` hook
injectLoaderFactory(serverRequest => {
  return function loader(path) {
    return fetch('http://localhost:9000' + path).then(r => r.json());
  };
});

// Let's use fake server request
// This would come from server library in real app
var serverRequest = {
  path: '/posts/123',
  query: {},
};

render(app, serverRequest).then(result => {
  // `result` contains several properties:
  // - html: prerendered HTML markup
  // - preloadData: fetched data from `load` hook
  // - title: document title from `renderTitle` hook
  // - meta: arbitary metadata from `renderMeta` hook (useful for SEO!)
  
  // Generate full HTML page with these information.
  // Use any templating engine you like. Or just concat strings.
});
```

For the full working code, see the [examples/](https://github.com/dittos/nuri/tree/master/examples) directory.

## State management

Nuri has a simple built-in state management system, so you don't need to use React state or Redux/Flux store.

You can mutate the `data` prop by calling `writeData` function provided to the handler component.

```
class Posts extends React.Component {
  render() {
    return <ul>
      {this.props.data.posts.map(post => <li>{post.title}</li>)}
      <li><button onClick={this._addPost.bind(this)}>Add Post</button></li>
    </ul>
  },
  
  _addPost() {
    this.props.writeData(data => {
      // You can *mutate* the data
      data.posts.push({ title: new Date().toString() });
    });
    // The component is re-rendered with the changed data.
  }
}
```

An extra benefit of using built-in state system is that the data is tied to the current location. If you visit other page after changing the data, and press the back button then the previous changed state is restored.

## Navigating around

You should use Nuri's API to move into other routes without page refresh.

### Using `Link` component

`Link` components is basically HTML `<a>` tag with click handler attached.

```
import {Link} from 'nuri';

// `/path/to/route?a=b`
<Link
  to={"/path/to/route"}
  queryParams={{a: 'b'}}
  className={"link" /* props are passed through to the <a> element */}
>
  Link Text
</Link>
```

### Programatically navigate

Use the `controller` prop.

```
this.props.controller.load({
  path: '/path/to/route',
  query: {a: 'b'},
});
```
