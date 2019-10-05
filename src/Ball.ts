import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Frame } from "./Frame";

export interface State {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export const ballSize = 20;

export const createInstance = ({
  start$,
  canvasWidth,
  canvasHeight
}: {
  start$: Observable<unknown>;
  canvasHeight: number;
  canvasWidth: number;
}) => {
  const initialState: State = {
    x: canvasWidth / 2 - ballSize / 2,
    y: canvasHeight / 2 - ballSize / 2,
    vx: 0,
    vy: 0
  };

  const headstart$ = start$.pipe(
    map(() => (prevState: State): State => ({
      x: canvasWidth / 2 - ballSize / 2,
      y: canvasHeight / 2 - ballSize / 2,
      vx: Math.ceil(Math.random() * 2) == 1 ? -200 : 200,
      vy: Math.floor(Math.random() * 200) - 100
    }))
  );

  const tickReducer = (prevState: State, frame: Frame): State => ({
    ...prevState,
    y: (frame.deltaTime / 1000) * prevState.vy + prevState.y,
    x: (frame.deltaTime / 1000) * prevState.vx + prevState.x
  });

  const render = ({
    state,
    ctx
  }: {
    state: State;
    ctx: CanvasRenderingContext2D;
  }) => {
    ctx.fillStyle = "white";
    ctx.fillRect(state.x, state.y, ballSize, ballSize);
  };

  return {
    initialState,
    reducer$: headstart$,
    tickReducer,
    render
  };
};
