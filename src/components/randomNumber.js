let seedrandom = require("seedrandom");
const options = { year: "numeric", month: "numeric", day: "numeric" };
let date = new Date().toLocaleDateString("en-US", options);

function getDailyRandomNumber() {
  let numbersArr = [];
  for (let number = 1000; number < 10000; number++) {
    let numArr = new Set(number.toString().split(""));
    if (numArr.size === 4) {
      numbersArr.push(number);
    }
  }

  let rng = seedrandom(date);
  let randomRaw = rng();
  let randomNumber = Math.floor(randomRaw * numbersArr.length);
  let solution = numbersArr[randomNumber];

  return solution;
}

module.exports = getDailyRandomNumber;
