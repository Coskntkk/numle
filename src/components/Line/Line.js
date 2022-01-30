import { nanoid } from "nanoid";

function Line({ items, bgColors }) {
  return (
    <div className="line row d-flex d-flex d-flex justify-content-center">
      {items.map((digit, index) => {
        try {
          return (
            <div
              className="box col-1"
              key={nanoid()}
              style={{ backgroundColor: bgColors[index] }}
            >
              <h4 className="digit">{digit}</h4>
            </div>
          );
        } catch (error) {
          return;
        }
      })}
    </div>
  );
}

export default Line;
