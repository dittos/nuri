import {globalVariableName} from '../bootstrap';

export function onPreloadDataReady(callback: (preloadData: any) => void, globalScope: any = window) {
  const globalVariable = globalScope[globalVariableName];
  if (!globalVariable.preloadData) {
    // HTML is not rendered yet
    globalScope[globalVariableName] = (preloadData: any) => {
      globalScope[globalVariableName].preloadData = preloadData;
      callback(preloadData);
    };
    return;
  }
  callback(globalVariable.preloadData);
}
