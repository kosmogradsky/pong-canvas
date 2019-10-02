import { fromEvent, interval, animationFrameScheduler, merge } from "rxjs";
import { filter, map } from "rxjs/operators";

export interface State {
  velocity: number;
  y: number;
}

export const initialState: State = {
  velocity: 0,
  y: 30
};

export const paddleWidth = 20;
const paddleHeight = 100;

export const createInstance = ({
  upKey,
  downKey,
  canvasHeight
}: {
  upKey: string;
  downKey: string;
  canvasHeight: number;
}) => {
  const goUp$ = fromEvent<KeyboardEvent>(document, "keydown").pipe(
    filter(event => event.code === upKey && event.repeat === false),
    map(() => (prevState: State): State => ({ ...prevState, velocity: -5 }))
  );

  const goDown$ = fromEvent<KeyboardEvent>(document, "keydown").pipe(
    filter(event => event.code === downKey && event.repeat === false),
    map(() => (prevState: State): State => ({ ...prevState, velocity: 5 }))
  );

  const stop$ = fromEvent<KeyboardEvent>(document, "keyup").pipe(
    filter(event => event.code === upKey || event.code === downKey),
    map(() => (prevState: State): State => ({ ...prevState, velocity: 0 }))
  );

  const tickReducer = (prevState: State): State => ({
    ...prevState,
    y: Math.min(
      Math.max(10, prevState.velocity + prevState.y),
      canvasHeight - paddleHeight - 10
    )
  });

  const render = ({
    state,
    ctx,
    x
  }: {
    state: State;
    ctx: CanvasRenderingContext2D;
    x: number;
  }) => {
    ctx.fillStyle = "white";
    ctx.fillRect(x, state.y, paddleWidth, paddleHeight);
  };

  return {
    reducer$: merge(goUp$, goDown$, stop$),
    tickReducer,
    render
  };
};
