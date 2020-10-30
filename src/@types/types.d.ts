interface Letter {
  letter: string;
  x: number;
  y: number;
}

interface Letters {
  letters: Letter[];
  interval: number;
}

interface State {
  score: number;
  letters: Letter[];
  level: number;
}
