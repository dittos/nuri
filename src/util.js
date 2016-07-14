/* @flow */

import querystring from 'querystring';
import type {ParsedURI} from './app';

export function uriToString(parsed: ParsedURI) {
  var path = parsed.path;
  const query = querystring.stringify(parsed.query);
  if (query)
    path += '?' + query;
  return path;
}
