/**
 * Returns a `limit(task)` function that runs at most `max` async tasks
 * concurrently; excess tasks queue and run as slots free up. Used so a
 * dashboard full of cards doesn't fire dozens of screenshot requests at once.
 */
export function createLimiter(max: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  const pump = () => {
    while (active < max && queue.length > 0) {
      const next = queue.shift();
      if (!next) break;
      active++;
      next();
    }
  };

  return function limit<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        task()
          .then(resolve, reject)
          .finally(() => {
            active--;
            pump();
          });
      });
      pump();
    });
  };
}
