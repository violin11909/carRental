const validatePickupAndReturnDate = (pickupDate, returnDate) => {
  const checkList = { pickupBeforeReturn: true};
  if (pickupDate > returnDate) {
    checkList.pickupBeforeReturn = false;
  }
  return checkList;
};

module.exports = {
  validatePickupAndReturnDate,
};
