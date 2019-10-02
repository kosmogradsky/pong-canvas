import { merge } from "rxjs";
import { scan, map } from "rxjs/operators";
import * as Paddle from "./Paddle";

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
  left: Paddle.State;
  right: Paddle.State;
}

const initialState: State = {
  left: Paddle.initialState,
  right: Paddle.initialState
};

const leftPaddle = Paddle.createInstance({
  upKey: "KeyW",
  downKey: "KeyS"
});
const rightPaddle = Paddle.createInstance({
  upKey: "ArrowUp",
  downKey: "ArrowDown"
});

merge(
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
  )
)
  .pipe(scan((acc, reducer) => reducer(acc), initialState))
  .subscribe(state => {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, width, height);

    leftPaddle.render({ ctx, x: 20, state: state.left });
    rightPaddle.render({
      ctx,
      x: width - Paddle.paddleWidth - 20,
      state: state.right
    });
  });
