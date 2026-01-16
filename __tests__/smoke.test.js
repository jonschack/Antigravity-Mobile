describe('Smoke Test', () => {
  it('should ensure the test harness is working', () => {
    expect(true).toBe(true);
  });

  it('should handle async tests', async () => {
    const value = await Promise.resolve(42);
    expect(value).toBe(42);
  });
});
