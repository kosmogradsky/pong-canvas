import { merge, fromEvent, Observable } from "rxjs";
import { scan, map, filter } from "rxjs/operators";
import * as Paddle from "./Paddle";
import * as Ball from "./Ball";
import { frame$ } from "./Frame";

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

// EVENTS

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

const leftPaddle = Paddle.createInstance({
  keyUp$: fromEvent<KeyboardEvent>(document, "keydown").pipe(
    filter(event => event.code === "KeyW")
  ),
  keyDown$: fromEvent<KeyboardEvent>(document, "keydown").pipe(
    filter(event => event.code === "KeyS")
  ),
  keyRelease$: fromEvent<KeyboardEvent>(document, "keyup").pipe(
    filter(event => event.code === "KeyW" || event.code === "KeyS")
  ),
  canvasHeight: height
});

const rightPaddle = Paddle.createInstance({
  keyUp$: fromEvent<KeyboardEvent>(document, "keydown").pipe(
    filter(event => event.code === "ArrowUp")
  ),
  keyDown$: fromEvent<KeyboardEvent>(document, "keydown").pipe(
    filter(event => event.code === "ArrowDown")
  ),
  keyRelease$: fromEvent<KeyboardEvent>(document, "keyup").pipe(
    filter(event => event.code === "ArrowUp" || event.code === "ArrowDown")
  ),
  canvasHeight: height
});

const ball = Ball.createInstance({
  canvasHeight: height,
  canvasWidth: width
});

const initialState: WelcomeState = {
  type: "WelcomeState",
  left: leftPaddle.initialState,
  right: rightPaddle.initialState
};

const tick$ = frame$.pipe(
  map(frame => (prevState: State): State => {
    switch (prevState.type) {
      case "WelcomeState": {
        return {
          type: "WelcomeState",
          left: leftPaddle.tickReducer(prevState.left, frame),
          right: rightPaddle.tickReducer(prevState.right, frame)
        };
      }
      case "WonState": {
        return {
          ...prevState,
          left: leftPaddle.tickReducer(prevState.left, frame),
          right: rightPaddle.tickReducer(prevState.right, frame)
        };
      }
      case "PlayingState": {
        if (prevState.ball.x < 0) {
          const nextRightScore = prevState.right.score + 1;

          if (nextRightScore === maxScore) {
            return {
              type: "WonState",
              winner: "right",
              left: leftPaddle.tickReducer(prevState.left.paddle, frame),
              right: rightPaddle.tickReducer(prevState.right.paddle, frame)
            };
          }

          return {
            type: "PlayingState",
            left: {
              paddle: leftPaddle.tickReducer(prevState.left.paddle, frame),
              score: prevState.left.score
            },
            right: {
              paddle: rightPaddle.tickReducer(prevState.right.paddle, frame),
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
          };
        }

        if (prevState.ball.x + Ball.ballSize > width) {
          const nextLeftScore = prevState.left.score + 1;

          if (nextLeftScore === maxScore) {
            return {
              type: "WonState",
              winner: "left",
              left: leftPaddle.tickReducer(prevState.left.paddle, frame),
              right: rightPaddle.tickReducer(prevState.right.paddle, frame)
            };
          }

          return {
            type: "PlayingState",
            left: {
              paddle: leftPaddle.tickReducer(prevState.left.paddle, frame),
              score: nextLeftScore
            },
            right: {
              paddle: rightPaddle.tickReducer(prevState.right.paddle, frame),
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
          };
        }

        const getBallState = (): Ball.State => {
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
            return {
              ...prevState.ball,
              vy: Ball.getVerticalSpeed(),
              vx: -prevState.ball.vx * 1.03,
              x: rightPaddleX - Ball.ballSize
            };
          }

          if (
            prevState.ball.x < leftPaddleX + Paddle.paddleWidth &&
            isCollidingVertically(prevState.left.paddle)
          ) {
            return {
              ...prevState.ball,
              vy: Ball.getVerticalSpeed(),
              vx: -prevState.ball.vx * 1.03,
              x: leftPaddleX + Paddle.paddleWidth
            };
          }

          if (prevState.ball.y < 0) {
            return {
              ...prevState.ball,
              vy: -prevState.ball.vy,
              y: 0
            };
          }

          if (prevState.ball.y > height - Ball.ballSize) {
            return {
              ...prevState.ball,
              vy: -prevState.ball.vy,
              y: height - Ball.ballSize
            };
          }

          return ball.tickReducer(prevState.ball, frame);
        };

        return {
          type: "PlayingState",
          left: {
            paddle: leftPaddle.tickReducer(prevState.left.paddle, frame),
            score: prevState.left.score
          },
          right: {
            paddle: rightPaddle.tickReducer(prevState.right.paddle, frame),
            score: prevState.right.score
          },
          ball: getBallState()
        };
      }
    }
  })
);

const interaction$ = merge(
  leftPaddle.reducer$.pipe(
    map(reducer => (prevState: State): State =>
      prevState.type === "PlayingState"
        ? {
            ...prevState,
            left: {
              paddle: reducer(prevState.left.paddle),
              score: prevState.left.score
            }
          }
        : {
            ...prevState,
            left: reducer(prevState.left)
          }
    )
  ),
  rightPaddle.reducer$.pipe(
    map(reducer => (prevState: State): State =>
      prevState.type === "PlayingState"
        ? {
            ...prevState,
            right: {
              paddle: reducer(prevState.right.paddle),
              score: prevState.right.score
            }
          }
        : {
            ...prevState,
            right: reducer(prevState.right)
          }
    )
  ),
  fromEvent<KeyboardEvent>(document, "keydown").pipe(
    filter(event => event.code === "Enter"),
    map(() => (prevState: State): PlayingState =>
      prevState.type === "WelcomeState" || prevState.type === "WonState"
        ? {
            type: "PlayingState",
            left: {
              paddle: prevState.left,
              score: 0
            },
            right: {
              paddle: prevState.right,
              score: 0
            },
            ball: ball.getInitialMovingState()
          }
        : prevState
    )
  )
);

let state: State = initialState;

interaction$.subscribe(reducer => {
  state = reducer(state);
});

tick$.subscribe(reducer => {
  state = reducer(state);

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, width, height);

  switch (state.type) {
    case "WelcomeState": {
      leftPaddle.render({ ctx, x: leftPaddleX, state: state.left });
      rightPaddle.render({
        ctx,
        x: rightPaddleX,
        state: state.right
      });

      ball.render({ ctx, state: ball.stillState });

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
      leftPaddle.render({ ctx, x: leftPaddleX, state: state.left });
      rightPaddle.render({
        ctx,
        x: rightPaddleX,
        state: state.right
      });

      ball.render({ ctx, state: ball.stillState });

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
      leftPaddle.render({ ctx, x: leftPaddleX, state: state.left.paddle });
      rightPaddle.render({
        ctx,
        x: rightPaddleX,
        state: state.right.paddle
      });

      ball.render({ ctx, state: state.ball });

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
