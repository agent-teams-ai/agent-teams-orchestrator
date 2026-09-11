/* oxlint-disable */

// eslint-disable-next-line no-console
console.log("hidden");

// oxlint-disable-next-line no-console
console.log("missing explanation");

// This tries to bypass a protected architecture boundary.
// oxlint-disable-next-line no-restricted-globals
Date.now();
