export function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

export function isNonZeroInteger(value) {
  return Number.isInteger(value) && value !== 0;
}

export function hasConsistentAdjustmentArithmetic({
  previousQuantity,
  quantityChange,
  newQuantity,
}) {
  if (
    !isNonNegativeInteger(previousQuantity) ||
    !isNonZeroInteger(quantityChange) ||
    !isNonNegativeInteger(newQuantity)
  ) {
    return false;
  }

  return previousQuantity + quantityChange === newQuantity;
}
