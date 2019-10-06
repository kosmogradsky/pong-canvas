import { merge, Observable } from "rxjs";
import { filter, map } from "rxjs/operators";
import { Frame } from "./Frame";

export interface State {
  velocity: number;
  y: number;
}

export const paddleWidth = 20;
export const paddleHeight = 100;
const paddleSpeed = 350;

export const createInstance = ({
  keyUp$,
  keyDown$,
  keyRelease$,
  canvasHeight
}: {
  keyUp$: Observable<KeyboardEvent>;
  keyDown$: Observable<KeyboardEvent>;
  keyRelease$: Observable<KeyboardEvent>;
  canvasHeight: number;
}) => {
  const initialState: State = {
    velocity: 0,
    y: canvasHeight / 2 - paddleHeight / 2
  };

  const goUp$ = keyUp$.pipe(
    filter(event => event.repeat === false),
    map(() => (prevState: State): State => ({
      ...prevState,
      velocity: -paddleSpeed
    }))
  );

  const goDown$ = keyDown$.pipe(
    filter(event => event.repeat === false),
    map(() => (prevState: State): State => ({
      ...prevState,
      velocity: paddleSpeed
    }))
  );

  const stop$ = keyRelease$.pipe(
    map(() => (prevState: State): State => ({ ...prevState, velocity: 0 }))
  );

  const tickReducer = (prevState: State, frame: Frame): State => ({
    ...prevState,
    y: Math.min(
      Math.max(10, (frame.deltaTime / 1000) * prevState.velocity + prevState.y),
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
    initialState,
    reducer$: merge(goUp$, goDown$, stop$),
    tickReducer,
    render
  };
};
