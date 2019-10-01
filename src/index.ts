import { fromEvent, merge, interval, animationFrameScheduler } from "rxjs";
import { map, filter, scan } from "rxjs/operators";

// INIT

const canvas = document.createElement("canvas");

document.body.prepend(canvas);

const width = 1000;
const height = 700;

const pixelRatio = window.devicePixelRatio || 1;

canvas.width = width * pixelRatio;
canvas.height = height * pixelRatio;

canvas.style.width = width + "px";
canvas.style.height = height + "px";

const ctx = canvas.getContext("2d");

ctx.scale(pixelRatio, pixelRatio);

// EVENTS

interface State {
  velocity: number;
  y: number;
}

const initialState: State = {
  velocity: 0,
  y: 30
};

const goUp$ = fromEvent<KeyboardEvent>(document, "keydown").pipe(
  filter(event => event.key === "ArrowUp" && event.repeat === false),
  map(() => (prevState: State): State => ({ ...prevState, velocity: -5 }))
);

const goDown$ = fromEvent<KeyboardEvent>(document, "keydown").pipe(
  filter(event => event.key === "ArrowDown" && event.repeat === false),
  map(() => (prevState: State): State => ({ ...prevState, velocity: 5 }))
);

const stop$ = fromEvent<KeyboardEvent>(document, "keyup").pipe(
  map(() => (prevState: State): State => ({ ...prevState, velocity: 0 }))
);

const tick$ = interval(0, animationFrameScheduler).pipe(
  map(() => (prevState: State): State => ({
    ...prevState,
    y: prevState.velocity + prevState.y
  }))
);

merge(goUp$, goDown$, stop$, tick$)
  .pipe(scan((acc, reducer) => reducer(acc), initialState))
  .subscribe(state => {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "white";

    const paddleWidth = 20;
    const paddleHeight = 100;
    ctx.fillRect(20, state.y, paddleWidth, paddleHeight);
    ctx.fillRect(width - paddleWidth - 20, state.y, paddleWidth, paddleHeight);
  });
