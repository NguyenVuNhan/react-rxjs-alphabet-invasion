import React, { memo, Suspense } from "react";
import "./App.css";
import { BehaviorSubject, interval, combineLatest, fromEvent } from "rxjs";
import {
  switchMap,
  scan,
  startWith,
  map,
  takeWhile,
  withLatestFrom,
  filter,
} from "rxjs/operators";
import { bind } from "@react-rxjs/core";

const gameWidth = 400;
const gameHeight = 600;

const levelChangeThreshold = 20;
const endThreshold = gameHeight / 20;
const speedAdjust = 50;

const getRandomLetter = () =>
  String.fromCharCode(
    Math.random() * ("z".charCodeAt(0) - "a".charCodeAt(0)) + "a".charCodeAt(0)
  );

const intervalSubject = new BehaviorSubject(600);

const [useLetters, letters$] = bind(
  intervalSubject.pipe(
    switchMap((i) =>
      interval(i).pipe(
        scan<number, Letters>(
          (letters) => ({
            interval: i,
            letters: [
              {
                letter: getRandomLetter(),
                x: Math.floor(Math.random() * (gameWidth - 20)),
                y: 20,
              },
              ...letters.letters,
            ],
          }),
          { letters: [], interval: 0 }
        )
      )
    )
  )
);

const key$ = fromEvent<KeyboardEvent>(document, "keydown").pipe(
  map((e: KeyboardEvent) => e.key),
  startWith("")
);

const match$ = key$.pipe(
  withLatestFrom(letters$),
  filter(
    ([key, letters]) =>
      letters.letters[letters.letters.length - 1] &&
      letters.letters[letters.letters.length - 1].letter === key
  )
);

const game$ = combineLatest([key$, letters$]).pipe(
  scan<[string, Letters], State>(
    (state, [key, letters]) => (
      letters.letters[letters.letters.length - 1] &&
      letters.letters[letters.letters.length - 1].letter === key
        ? ((state.score = state.score + 1), letters.letters.pop())
        : () => {},
      state.score > 0 && state.score % levelChangeThreshold === 0
        ? ((letters.letters = []),
          (state.level = state.level + 1),
          (state.score = state.score + 1),
          intervalSubject.next(letters.interval - speedAdjust))
        : () => {},
      { score: state.score, letters: letters.letters, level: state.level }
    ),
    { score: 0, letters: [], level: 1 }
  ),
  startWith({ score: 0, letters: [{ letter: "a", x: 10, y: 0 }], level: 1 }),
  takeWhile((state) => state.letters.length < endThreshold)
);

const Bubble = memo(({ letter, x, y }: Letter) => {
  return (
    <div className="bubble" style={{ left: x, top: y }}>
      {letter}
    </div>
  );
});

const [useStat] = bind(
  game$.pipe(
    map((state) => ({
      score: state.score,
      level: state.level,
      gameOver: state.letters.length < endThreshold,
    }))
  )
);

const Stat = () => {
  const { level, score, gameOver } = useStat();

  return gameOver ? (
    <h4>
      Level: {level} <br />
      Score: {score}
    </h4>
  ) : (
    <h4>Game over</h4>
  );
};

const [useGame] = bind(game$);

const App = () => {
  // const letters = useLetters();
  const game = useGame();

  // const letters = useLetters();

  return (
    <div className="App">
      <div>
        {/* <Stat /> */}
        {/* <h4>
          Level: {game.level} <br />
          Score: {game.score}
        </h4> */}
        <div
          className="game-box"
          style={{ width: gameWidth, height: gameHeight }}
        >
          {/* <Suspense fallback={<p>Loading...</p>}> */}
          {game.letters.map((letter: Letter) => (
            <Bubble letter={letter.letter} x={letter.x} y={letter.y} />
          ))}
          {/* </Suspense> */}
        </div>
      </div>
    </div>
  );
};

export default App;
