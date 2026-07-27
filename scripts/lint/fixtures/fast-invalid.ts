export let mutableValue = 1;

export function executeText(source: string): unknown {
  return eval(source);
}

export function trustAnything(value: any): string {
  return value!.label;
}
