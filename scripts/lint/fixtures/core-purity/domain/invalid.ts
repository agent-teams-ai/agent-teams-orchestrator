export function createNondeterministicState(): number {
  setTimeout(() => undefined, 0);
  void fetch("https://example.invalid");
  console.log(process.env.NODE_ENV);
  return Date.now() + Math.random();
}
