import { TickReducer, Tick, EMPTY } from "sudetenwaltz/Loop";

export interface State {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export const ballSize = 20;
export const horizontalSpeedThreshold = 300;
export const getVerticalSpeed = () => Math.floor(Math.random() * 500) - 250;
export const getHorizontalSpeed = () =>
  Math.ceil(Math.random() * 2) == 1
    ? -horizontalSpeedThreshold
    : horizontalSpeedThreshold;

// INITIAL STATES

export const getInitialStillState = (
  canvasHeight: number,
  canvasWidth: number
): State => ({
  x: canvasWidth / 2 - ballSize / 2,
  y: canvasHeight / 2 - ballSize / 2,
  vx: 0,
  vy: 0
});

export const getInitialMovingState = (
  canvasHeight: number,
  canvasWidth: number
): State => ({
  x: canvasWidth / 2 - ballSize / 2,
  y: canvasHeight / 2 - ballSize / 2,
  vx: getHorizontalSpeed(),
  vy: getVerticalSpeed()
});

// ACTIONS

export type Action = never;

// REDUCER

export const reducer: TickReducer<State, Action> = (prevState, action) => {
  switch (action.type) {
    case "Tick":
      return [
        {
          ...prevState,
          y: (action.frame.deltaTime / 1000) * prevState.vy + prevState.y,
          x: (action.frame.deltaTime / 1000) * prevState.vx + prevState.x
        },
        EMPTY
      ];
  }
};

// RENDER

export const render = ({
  state,
  ctx
}: {
  state: State;
  ctx: CanvasRenderingContext2D;
}) => {
  ctx.fillStyle = "white";
  ctx.fillRect(state.x, state.y, ballSize, ballSize);
};
