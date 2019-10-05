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

interface State {
  left: Paddle.State;
  right: Paddle.State;
  ball: Ball.State;
}

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
  start$: fromEvent<KeyboardEvent>(document, "keydown").pipe(
    filter(event => event.code === "Enter")
  ),
  canvasHeight: height,
  canvasWidth: width
});

const initialState: State = {
  left: Paddle.initialState,
  right: Paddle.initialState,
  ball: ball.initialState
};

const tick$ = frame$.pipe(
  map(frame => (prevState: State): State => {
    const getBallState = (): Ball.State => {
      const isCollidingVertically = (paddle: Paddle.State) => {
        return (
          prevState.ball.y + Ball.ballSize > paddle.y &&
          prevState.ball.y < paddle.y + Paddle.paddleHeight
        );
      };

      if (
        prevState.ball.x + Ball.ballSize > rightPaddleX &&
        isCollidingVertically(prevState.right)
      ) {
        return {
          ...prevState.ball,
          vy: prevState.ball.vy * Math.random() * 2,
          vx: -prevState.ball.vx * 1.03,
          x: rightPaddleX - Ball.ballSize
        };
      }

      if (
        prevState.ball.x < leftPaddleX + Paddle.paddleWidth &&
        isCollidingVertically(prevState.left)
      ) {
        return {
          ...prevState.ball,
          vy: prevState.ball.vy * Math.random() * 2,
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
      left: leftPaddle.tickReducer(prevState.left, frame),
      right: rightPaddle.tickReducer(prevState.right, frame),
      ball: getBallState()
    };
  })
);

const interaction$ = merge(
  leftPaddle.reducer$.pipe(
    map(reducer => (prevState: State): State => ({
      ...prevState,
      left: reducer(prevState.left)
    }))
  ),
  rightPaddle.reducer$.pipe(
    map(reducer => (prevState: State): State => ({
      ...prevState,
      right: reducer(prevState.right)
    }))
  ),
  ball.reducer$.pipe(
    map(reducer => (prevState: State): State => ({
      ...prevState,
      ball: reducer(prevState.ball)
    }))
  )
);

let state = initialState;

interaction$.subscribe(reducer => {
  state = reducer(state);
});

tick$.subscribe(reducer => {
  state = reducer(state);

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, width, height);

  leftPaddle.render({ ctx, x: leftPaddleX, state: state.left });
  rightPaddle.render({
    ctx,
    x: rightPaddleX,
    state: state.right
  });
  ball.render({ ctx, state: state.ball });
});
