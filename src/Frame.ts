import { Observable } from "rxjs";
import { pairwise, map, startWith } from "rxjs/operators";

const timestamp$ = new Observable<number>(subscriber => {
  const loop = (timestamp: number) => {
    subscriber.next(timestamp);
    currentAnimationFrame = requestAnimationFrame(loop);
  };

  let currentAnimationFrame = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(currentAnimationFrame);
  };
});

export interface Frame {
  timestamp: number;
  deltaTime: number;
}

export const frame$: Observable<Frame> = timestamp$.pipe(
  pairwise(),
  map(([prevTimestamp, nextTimestamp]) => ({
    timestamp: nextTimestamp,
    deltaTime: nextTimestamp - prevTimestamp
  })),
  startWith({ timestamp: 0, deltaTime: 0 })
);
