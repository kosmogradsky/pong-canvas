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
  downKey
}: {
  upKey: string;
  downKey: string;
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
    map(() => (prevState: State): State => ({ ...prevState, velocity: 0 }))
  );

  const tick$ = interval(0, animationFrameScheduler).pipe(
    map(() => (prevState: State): State => ({
      ...prevState,
      y: prevState.velocity + prevState.y
    }))
  );

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
    reducer$: merge(goUp$, goDown$, stop$, tick$),
    render
  };
};
