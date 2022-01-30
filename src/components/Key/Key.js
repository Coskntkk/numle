function Key({ digit, guess, setGuess, done }) {
  function keyClick(e, num) {
    e.preventDefault();
    const temp = [...guess];
    if (!temp.includes(num[0]) && !(temp[0] === " " && num[0] == 0)) {
      const index = temp.indexOf(" ");
      temp[index] = num[0];
      setGuess(temp);
    }
  }

  return (
    <button
      className="key column"
      disabled={done || digit[1] === "darkgray"}
      onClick={(e) => keyClick(e, digit[0].toString())}
      style={{ backgroundColor: digit[1] }}
    >
      {digit[0]}
    </button>
  );
}

export default Key;
