
function clamp(value: number, min: number, max: number): number {
  return Math.max(Math.min(value, max), min);
}

export {
  clamp,
}
