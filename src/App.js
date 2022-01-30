import { useState, useEffect } from "react";
import { nanoid } from "nanoid";
import Nav from "./components/Nav";
import Line from "./components/Line";
import Key from "./components/Key";
import getDailyRandomNumber from "./components/randomNumber";

function App() {
  const [numbers, setNumbers] = useState([
    [0, "lightgray"],
    [1, "lightgray"],
    [2, "lightgray"],
    [3, "lightgray"],
    [4, "lightgray"],
    [5, "lightgray"],
    [6, "lightgray"],
    [7, "lightgray"],
    [8, "lightgray"],
    [9, "lightgray"],
  ]);
  const [oldColors, setOldColors] = useState([]);
  const [solution, setSolution] = useState();
  const [oldGuess, setOldGuess] = useState([]);
  const [done, setDone] = useState(false);
  const [guess, setGuess] = useState([" ", " ", " ", " "]);
  const [over, setOver] = useState(false);
  const colors = ["white", "white", "white", "white"];
  const options = { year: 'numeric', month: 'long', day: 'numeric' };

  useEffect(() => {
    const game = localStorage.getItem("game");
    const date = new Date().toLocaleDateString("en-US", options);
    if (game) {
      const gameObj = JSON.parse(game);
      if (gameObj.date === date) {
        setOldGuess(gameObj.oldGuess);
        setOldColors(gameObj.oldColors);
        setNumbers(gameObj.numbers);
        setDone(gameObj.done);
        setSolution(gameObj.solution);
        setGuess(gameObj.guess);
        setOver(true)
      }
    } else {
      const solution = getDailyRandomNumber();
      setSolution(solution.toString());
    }
  }, []);

  function checkColors() {
    const tempGuess = [...guess];
    const tempColors = [...colors];
    const tempNumbers = [...numbers];
    const tempOldColors = [...oldColors];
    const sol = solution.toString().split("");
    for (let i = 0; i < 4; i++) {
      if (tempGuess[i] == sol[i] ) {
        tempColors[i] = "lightgreen";
        tempNumbers[tempGuess[i]][1] = "lightgreen";
      } else if (tempGuess[i] != sol[i] && sol.includes(tempGuess[i])) {
        tempColors[i] = "yellow";
        tempNumbers[tempGuess[i]][1] = "yellow";
      } else if (!sol.includes(tempGuess[i])) {
        tempColors[i] = "darkgray";
        tempNumbers[tempGuess[i]][1] = "darkgray";
      }
    }
    tempOldColors.push(tempColors);
    setOldColors(tempOldColors);
    setNumbers(tempNumbers);
  }

  function pressBackspace(e) {
    e.preventDefault();
    if (guess[0] === " ") {
      console.log("Invalid move.");
    } else {
      const temp = [...guess];
      const index = temp.indexOf(" ");
      temp[index-1] = " ";
      setGuess(temp);
    }
  }
  
  function pressEnter(e) {
    e.preventDefault();
    if (guess.includes(" ")) {
      console.log("Invalid move.");
    } else {
      makeGuess();
    }
  }

  function makeGuess() {
    const temp = [...oldGuess];
    temp.push(guess);
    setOldGuess(temp);
    if (guess.join("") !== solution) {
      setGuess([" ", " ", " ", " "]);
      checkColors();
    } else {
      setDone(true);
      checkColors();
      saveGame();
    }
  }

  function saveGame(){
    const tempOlds = [...oldGuess];
    tempOlds.push(guess);
    const game = {
      date: new Date().toLocaleDateString("en-US", options),
      oldGuess: tempOlds,
      oldColors: oldColors,
      numbers: numbers,
      done: true,
      solution: solution,
      guess: guess
    }
    localStorage.setItem("game", JSON.stringify(game));
  }

  function makeCopy(){
    const date = new Date().toLocaleDateString("en-US", options);
    let text = "Numle " + date.toLocaleString() + ":\n \n";
    for (let i = 0; i < oldColors.length; i++) {
      for (let j = 0; j < 4; j++) {
        if (oldColors[i][j] === "lightgreen") {
          text += " 🟢 ";
        } else if (oldColors[i][j] === "yellow") {
          text += " 🟡 ";
        } else if (oldColors[i][j] === "darkgray") {
          text += " ⚫ ";
        }
      }
      text += "\n";
    }
    if (!text.includes(" 🟢  🟢  🟢  🟢 ")) {
      text += " 🟢  🟢  🟢  🟢 \n";
    }
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }

  return (
    <>
      <div className="app d-flex justify-content-center row overflow-auto col-lg-3 col-md-8 col-sm-12">
          <Nav />

          <div className="game col-12" id="scroll">

            {oldGuess.map((item, index) => (
              <Line 
                key={nanoid()}
                items={item}
                bgColors={oldColors[index]}
              />
            ))}
            {!done && (
              <Line
                key={nanoid()}
                items={guess}
                bgColors={colors}
              />
            )}
            {over && (
              <Line
                key={nanoid()}
                items={guess}
                bgColors={["lightgreen", "lightgreen", "lightgreen", "lightgreen"]}
              />
            )}

            {done && 
              <div className="won">
              <h1>You win!</h1>
              <p>You have guessed the number in {oldGuess.length} steps.</p>
              <button className="btn btn-success copy" onClick={makeCopy}>Copy to clipboard</button>
            </div>}

          </div>

          <div className="keys col-lg-3 col-md-12 col-sm-8 row">
            <form>
              {numbers.map((digit) => (
                <Key
                  key={nanoid()}
                  digit={digit}
                  guess={guess}
                  setGuess={setGuess}
                  setNumbers={setNumbers}
                  done={done}
                />
              ))}
              <button
                type="submit"
                className="key2 col-6"
                disabled={done}
                onClick={(e) => pressEnter(e)}
              >
                Enter
              </button>
              <button
                type="submit"
                className="key2 col-6 backspace"
                disabled={done}
                onClick={(e) => pressBackspace(e)}
              >
                <i className="fas fa-backspace fa-2x"></i>
              </button>
            </form>
          </div>
        </div>
      )
    </>
  );
}

export default App;
