test.only("focused test", () => {
  expect(true).toBe(true);
});

test.skip("disabled test", () => {
  expect(true).toBe(true);
});

test("assertion-free test", () => undefined);
