import 'isomorphic-fetch';
import {injectLoader, render} from '../lib/client';
import app from './app';

function loader(path) {
  return fetch(path).then(r => r.json());
}

injectLoader(loader);

render(app, document.getElementById('app'));
