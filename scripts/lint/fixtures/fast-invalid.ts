export let mutableValue = 1;

export function executeText(source: string): unknown {
  return eval(source);
}
