declare namespace JSX {
  interface Element {
    readonly type: "fixture-element";
  }

  interface IntrinsicElements {
    span: {
      children?: unknown;
    };
  }
}
