import React, { memo, Suspense } from "react";
import clsx from "clsx";
import "./App.css";
import { BehaviorSubject, interval, combineLatest, fromEvent, of } from "rxjs";
import { switchMap, scan, startWith, map, concatMap } from "rxjs/operators";
import { bind } from "@react-rxjs/core";

const gameWidth = 400;
const gameHeight = 600;
const bubbleSize = 25;

const levelChangeThreshold = 20;
const endThreshold = Math.ceil(gameHeight / bubbleSize);
const speedAdjust = 50;

const getRandomLetter = () =>
  String.fromCharCode(
    Math.random() * ("z".charCodeAt(0) - "a".charCodeAt(0)) + "a".charCodeAt(0)
  );

const intervalSubject = new BehaviorSubject(100);

const letters$ = intervalSubject.pipe(
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
);

const key$ = fromEvent<KeyboardEvent>(document, "keydown").pipe(
  map((e: KeyboardEvent) => e.key),
  startWith("")
);

const [useGame] = bind(
  combineLatest([key$, letters$]).pipe(
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
    startWith({
      score: 0,
      letters: [{ letter: "Game start", x: gameWidth / 2, y: gameHeight / 2 }],
      level: 1,
    } as State),
    concatMap((state) => {
      if (state.letters.length >= endThreshold) {
        return of(state, {
          score: state.score,
          letters: [
            { letter: "Game over", x: gameWidth / 2, y: gameHeight / 2 },
          ],
          level: state.level,
        } as State);
      }
      return of(state);
    })
    // endWith({
    //   score: 0,
    //   letters: [{ letter: "Game over", x: gameWidth / 2, y: gameHeight / 2 }],
    //   level: 0,
    // } as State)
  )
);

const Bubble = memo(({ letter, x, y, classes }: Letter) => {
  return (
    <div
      className={clsx(
        "bubble",
        classes,
        (letter === "Game start" || letter === "Game over") && "start-bubble"
      )}
      style={{
        left: x,
        top: y,
        width: bubbleSize,
        height: bubbleSize,
      }}
    >
      {letter}
    </div>
  );
});

const App = () => {
  const game = useGame();

  return (
    <div className="App">
      <div>
        <h4>
          Level: {game.level} <br />
          Score: {game.score}
        </h4>
        <div
          className="game-box"
          style={{ width: gameWidth, height: gameHeight }}
        >
          <Suspense fallback={<p>Loading...</p>}>
            {game.letters.map((letter: Letter, index: number) => (
              <Bubble
                key={index}
                letter={letter.letter}
                x={letter.x}
                y={letter.y}
                classes={[
                  index === game.letters.length - 1 && "current-bubble",
                ]}
              />
            ))}
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default App;
