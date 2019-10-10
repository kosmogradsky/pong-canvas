import { fromEvent, EMPTY as RX_EMPTY } from "rxjs";
import { filter, ignoreElements, tap } from "rxjs/operators";
import * as Paddle from "./Paddle";
import * as Ball from "./Ball";
import {
  TickReducer,
  mapEffect,
  Batch,
  EMPTY,
  Loop,
  createGameStore,
  mapLoop,
  Epic,
  ofType,
  SilentEff
} from "sudetenwaltz/Loop";
import PixiSound from "pixi-sound";

const paddleHit = PixiSound.Sound.from({
  url: "./paddle_hit.wav",
  preload: true
});
const score = PixiSound.Sound.from({ url: "./score.wav", preload: true });
const wallHit = PixiSound.Sound.from({ url: "./wall_hit.wav", preload: true });

// CONSTANTS

const width = 1000;
const height = 700;
const leftPaddleX = 20;
const rightPaddleX = width - Paddle.paddleWidth - 20;
const maxScore = 10;

// INIT

const canvas = document.createElement("canvas");

document.body.prepend(canvas);

const pixelRatio = window.devicePixelRatio || 1;

canvas.width = width * pixelRatio;
canvas.height = height * pixelRatio;

canvas.style.width = width + "px";
canvas.style.height = height + "px";

const ctx = canvas.getContext("2d")!;

ctx.scale(pixelRatio, pixelRatio);

// STATES

interface WelcomeState {
  type: "WelcomeState";
  left: Paddle.State;
  right: Paddle.State;
}

interface WonState {
  type: "WonState";
  winner: "left" | "right";
  left: Paddle.State;
  right: Paddle.State;
}

interface PlayingState {
  type: "PlayingState";
  left: {
    paddle: Paddle.State;
    score: number;
  };
  right: {
    paddle: Paddle.State;
    score: number;
  };
  ball: Ball.State;
}

type State = WelcomeState | PlayingState | WonState;

// INITIAL STATE

const initialLoop: Loop<State, Action> = [
  {
    type: "WelcomeState",
    left: Paddle.getInitialState(height),
    right: Paddle.getInitialState(height)
  },
  EMPTY
];

// ACTIONS

interface LeftPaddleMsg {
  type: "LeftPaddleMsg";
  action: Paddle.Action;
}

interface RightPaddleMsg {
  type: "RightPaddleMsg";
  action: Paddle.Action;
}

interface BallMsg {
  type: "BallMsg";
  action: Ball.Action;
}

interface Start {
  type: "Start";
}

type Action = LeftPaddleMsg | RightPaddleMsg | BallMsg | Start;

// REDUCER

const paddleReducer = Paddle.createReducer(height);

const tickReducer: TickReducer<State, never, State, Action> = (
  prevState,
  action
) => {
  const [leftPaddleState, leftPaddleEffect] = mapEffect(
    paddleReducer(
      prevState.type === "PlayingState"
        ? prevState.left.paddle
        : prevState.left,
      action
    ),
    (paddleAction): LeftPaddleMsg => ({
      type: "LeftPaddleMsg",
      action: paddleAction
    })
  );
  const [rightPaddleState, rightPaddleEffect] = mapEffect(
    paddleReducer(
      prevState.type === "PlayingState"
        ? prevState.right.paddle
        : prevState.right,
      action
    ),
    (paddleAction): RightPaddleMsg => ({
      type: "RightPaddleMsg",
      action: paddleAction
    })
  );

  const paddleEffects = new Batch<Action>([
    leftPaddleEffect,
    rightPaddleEffect
  ]);

  switch (prevState.type) {
    case "WelcomeState": {
      return [
        {
          type: "WelcomeState",
          left: leftPaddleState,
          right: rightPaddleState
        },
        paddleEffects
      ];
    }
    case "WonState": {
      return [
        {
          ...prevState,
          left: leftPaddleState,
          right: rightPaddleState
        },
        paddleEffects
      ];
    }
    case "PlayingState": {
      if (prevState.ball.x < 0) {
        const nextRightScore = prevState.right.score + 1;

        if (nextRightScore === maxScore) {
          return [
            {
              type: "WonState",
              winner: "right",
              left: leftPaddleState,
              right: rightPaddleState
            },
            new Batch([paddleEffects, new PlaySound(score)])
          ];
        }

        return [
          {
            type: "PlayingState",
            left: {
              paddle: leftPaddleState,
              score: prevState.left.score
            },
            right: {
              paddle: rightPaddleState,
              score: nextRightScore
            },
            ball: {
              vx: Ball.horizontalSpeedThreshold,
              vy: Ball.getVerticalSpeed(),
              x: leftPaddleX + Paddle.paddleWidth,
              y:
                prevState.left.paddle.y +
                Paddle.paddleHeight / 2 -
                Ball.ballSize / 2
            }
          },
          new Batch([paddleEffects, new PlaySound(score)])
        ];
      }

      if (prevState.ball.x + Ball.ballSize > width) {
        const nextLeftScore = prevState.left.score + 1;

        if (nextLeftScore === maxScore) {
          return [
            {
              type: "WonState",
              winner: "left",
              left: leftPaddleState,
              right: rightPaddleState
            },
            new Batch([paddleEffects, new PlaySound(score)])
          ];
        }

        return [
          {
            type: "PlayingState",
            left: {
              paddle: leftPaddleState,
              score: nextLeftScore
            },
            right: {
              paddle: rightPaddleState,
              score: prevState.right.score
            },
            ball: {
              vx: -Ball.horizontalSpeedThreshold,
              vy: Ball.getVerticalSpeed(),
              x: rightPaddleX - Ball.ballSize,
              y:
                prevState.right.paddle.y +
                Paddle.paddleHeight / 2 -
                Ball.ballSize / 2
            }
          },
          new Batch([paddleEffects, new PlaySound(score)])
        ];
      }

      const getBallState = (): Loop<Ball.State, Ball.Action> => {
        const isCollidingVertically = (paddle: Paddle.State) => {
          return (
            prevState.ball.y + Ball.ballSize > paddle.y &&
            prevState.ball.y < paddle.y + Paddle.paddleHeight
          );
        };

        if (
          prevState.ball.x + Ball.ballSize > rightPaddleX &&
          isCollidingVertically(prevState.right.paddle)
        ) {
          return [
            {
              ...prevState.ball,
              vy: Ball.getVerticalSpeed(),
              vx: -prevState.ball.vx * 1.03,
              x: rightPaddleX - Ball.ballSize
            },
            new PlaySound(paddleHit)
          ];
        }

        if (
          prevState.ball.x < leftPaddleX + Paddle.paddleWidth &&
          isCollidingVertically(prevState.left.paddle)
        ) {
          return [
            {
              ...prevState.ball,
              vy: Ball.getVerticalSpeed(),
              vx: -prevState.ball.vx * 1.03,
              x: leftPaddleX + Paddle.paddleWidth
            },
            new PlaySound(paddleHit)
          ];
        }

        if (prevState.ball.y < 0) {
          return [
            {
              ...prevState.ball,
              vy: -prevState.ball.vy,
              y: 0
            },
            new PlaySound(wallHit)
          ];
        }

        if (prevState.ball.y > height - Ball.ballSize) {
          return [
            {
              ...prevState.ball,
              vy: -prevState.ball.vy,
              y: height - Ball.ballSize
            },
            new PlaySound(wallHit)
          ];
        }

        return Ball.reducer(prevState.ball, action);
      };

      const [ballState, ballEffect] = mapEffect(
        getBallState(),
        (ballAction): BallMsg => ({ type: "BallMsg", action: ballAction })
      );

      return [
        {
          type: "PlayingState",
          left: {
            paddle: leftPaddleState,
            score: prevState.left.score
          },
          right: {
            paddle: rightPaddleState,
            score: prevState.right.score
          },
          ball: ballState
        },
        new Batch<Action>([paddleEffects, ballEffect])
      ];
    }
  }
};

const reducer: TickReducer<State, Action> = (prevState, action) => {
  switch (action.type) {
    case "Tick": {
      return tickReducer(prevState, action);
    }
    case "LeftPaddleMsg": {
      return mapLoop(
        paddleReducer(
          prevState.type === "PlayingState"
            ? prevState.left.paddle
            : prevState.left,
          action.action
        ),
        (leftPaddle): State =>
          prevState.type === "PlayingState"
            ? {
                ...prevState,
                left: {
                  paddle: leftPaddle,
                  score: prevState.left.score
                }
              }
            : {
                ...prevState,
                left: leftPaddle
              },
        (leftPaddleAction): LeftPaddleMsg => ({
          type: "LeftPaddleMsg",
          action: leftPaddleAction
        })
      );
    }
    case "RightPaddleMsg": {
      return mapLoop(
        paddleReducer(
          prevState.type === "PlayingState"
            ? prevState.right.paddle
            : prevState.right,
          action.action
        ),
        (rightPaddle): State =>
          prevState.type === "PlayingState"
            ? {
                ...prevState,
                right: {
                  paddle: rightPaddle,
                  score: prevState.right.score
                }
              }
            : {
                ...prevState,
                right: rightPaddle
              },
        (rightPaddleAction): RightPaddleMsg => ({
          type: "RightPaddleMsg",
          action: rightPaddleAction
        })
      );
    }
    case "BallMsg": {
      return prevState.type === "PlayingState"
        ? mapLoop(
            Ball.reducer(prevState.ball, action.action),
            (ball): PlayingState => ({ ...prevState, ball }),
            (ballAction): BallMsg => ({ type: "BallMsg", action: ballAction })
          )
        : [prevState, EMPTY];
    }
    case "Start": {
      return prevState.type === "WelcomeState" || prevState.type === "WonState"
        ? [
            {
              type: "PlayingState",
              left: {
                paddle: prevState.left,
                score: 0
              },
              right: {
                paddle: prevState.right,
                score: 0
              },
              ball: Ball.getInitialMovingState(height, width)
            },
            EMPTY
          ]
        : [prevState, EMPTY];
    }
  }
};

// EPIC

class PlaySound extends SilentEff {
  readonly type = "PlaySound";

  constructor(readonly sound: PixiSound.Sound) {
    super();
  }
}

const epic: Epic<Action> = effect$ =>
  effect$.pipe(
    ofType<PlaySound>("PlaySound"),
    tap(({ sound }) => sound.play()),
    ignoreElements()
  );

const store = createGameStore(initialLoop, reducer, epic);

fromEvent<KeyboardEvent>(document, "keydown")
  .pipe(filter(event => event.repeat === false))
  .subscribe(event => {
    switch (event.code) {
      case "KeyW": {
        store.dispatch({ type: "LeftPaddleMsg", action: { type: "GoUp" } });
        break;
      }
      case "KeyS": {
        store.dispatch({ type: "LeftPaddleMsg", action: { type: "GoDown" } });
        break;
      }
      case "ArrowUp": {
        store.dispatch({ type: "RightPaddleMsg", action: { type: "GoUp" } });
        break;
      }
      case "ArrowDown": {
        store.dispatch({ type: "RightPaddleMsg", action: { type: "GoDown" } });
        break;
      }
    }
  });

fromEvent<KeyboardEvent>(document, "keyup").subscribe(event => {
  if (event.code === "KeyW" || event.code === "KeyS") {
    store.dispatch({ type: "LeftPaddleMsg", action: { type: "Stop" } });
    return;
  }

  if (event.code === "ArrowUp" || event.code === "ArrowDown") {
    store.dispatch({ type: "RightPaddleMsg", action: { type: "Stop" } });
    return;
  }
});

fromEvent<KeyboardEvent>(document, "keydown")
  .pipe(filter(event => event.code === "Enter"))
  .subscribe(() => {
    store.dispatch({ type: "Start" });
  });

store.model$.subscribe(state => {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, width, height);

  switch (state.type) {
    case "WelcomeState": {
      Paddle.render({ ctx, x: leftPaddleX, state: state.left });
      Paddle.render({
        ctx,
        x: rightPaddleX,
        state: state.right
      });

      Ball.render({ ctx, state: Ball.getInitialStillState(height, width) });

      ctx.font = "1rem 'Press Start 2P', sans-serif";

      const welcomeText = "Welcome to Pong!";
      const welcomeTextWidth = ctx.measureText(welcomeText).width;
      ctx.fillText(welcomeText, width / 2 - welcomeTextWidth / 2, 50);

      const beginText = "Press Enter to begin";
      const beginTextWidth = ctx.measureText(beginText).width;
      ctx.fillText(beginText, width / 2 - beginTextWidth / 2, 80);

      break;
    }
    case "WonState": {
      Paddle.render({ ctx, x: leftPaddleX, state: state.left });
      Paddle.render({
        ctx,
        x: rightPaddleX,
        state: state.right
      });

      Ball.render({ ctx, state: Ball.getInitialStillState(height, width) });

      ctx.font = "1rem 'Press Start 2P', sans-serif";

      const wonText =
        (state.winner === "left" ? "Left" : "Right") + " player won!";
      const wonTextWidth = ctx.measureText(wonText).width;
      ctx.fillText(wonText, width / 2 - wonTextWidth / 2, 50);

      const restartText = "Press Enter to restart";
      const restartTextWidth = ctx.measureText(restartText).width;
      ctx.fillText(restartText, width / 2 - restartTextWidth / 2, 80);

      break;
    }
    case "PlayingState": {
      Paddle.render({ ctx, x: leftPaddleX, state: state.left.paddle });
      Paddle.render({
        ctx,
        x: rightPaddleX,
        state: state.right.paddle
      });

      Ball.render({ ctx, state: state.ball });

      ctx.font = "3rem 'Press Start 2P', sans-serif";

      const leftScore = state.left.score.toString();
      const leftScoreWidth = ctx.measureText(leftScore).width;
      ctx.fillText(leftScore, width / 2 - 100 - leftScoreWidth, 80);

      const rightScore = state.right.score.toString();
      ctx.fillText(rightScore, width / 2 + 100, 80);

      break;
    }
  }
});
