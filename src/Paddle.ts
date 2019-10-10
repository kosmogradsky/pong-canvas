import { TickReducer, Tick, EMPTY } from "sudetenwaltz/Loop";

export interface State {
  velocity: number;
  y: number;
}

export const paddleWidth = 20;
export const paddleHeight = 100;
const paddleSpeed = 350;

// INITIAL STATE

export const getInitialState = (canvasHeight: number): State => ({
  velocity: 0,
  y: canvasHeight / 2 - paddleHeight / 2
});

// ACTIONS

interface GoUp {
  type: "GoUp";
}

interface GoDown {
  type: "GoDown";
}

interface Stop {
  type: "Stop";
}

export type Action = GoUp | GoDown | Stop;

// REDUCER

export const createReducer = (
  canvasHeight: number
): TickReducer<State, Action> => (prevState, action) => {
  switch (action.type) {
    case "Tick":
      return [
        {
          ...prevState,
          y: Math.min(
            Math.max(
              10,
              (action.frame.deltaTime / 1000) * prevState.velocity + prevState.y
            ),
            canvasHeight - paddleHeight - 10
          )
        },
        EMPTY
      ];
    case "GoUp":
      return [
        {
          ...prevState,
          velocity: -paddleSpeed
        },
        EMPTY
      ];
    case "GoDown":
      return [
        {
          ...prevState,
          velocity: paddleSpeed
        },
        EMPTY
      ];
    case "Stop":
      return [
        {
          ...prevState,
          velocity: 0
        },
        EMPTY
      ];
  }
};

export const render = ({
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
