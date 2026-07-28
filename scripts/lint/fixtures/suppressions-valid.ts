declare function resolve(value: string): void;

// The settled state makes duplicate resolution intentionally harmless.
// oxlint-disable-next-line promise/no-multiple-resolved
resolve("done");
