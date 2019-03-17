export const containerElementId = '__nuri_root';

export const globalVariableName = '__nuri';
export const preludeScript = `(function(w,n){w[n]=w[n]||function(p){w[n].preloadData=p}})(window,${JSON.stringify(globalVariableName)});`;

export function wrapHTML(content: string): string {
  return `<div id="${containerElementId}">${content}</div><script>${preludeScript}</script>`;
}
