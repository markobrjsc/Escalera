// The step progress dots at the bottom of the tutorial.
export function TutorialProgress({ count, step }: { count: number; step: number }) {
  return <div className="tutorial-progress">{Array.from({ length: count }, (_, index) => <span className={index === step ? "is-current" : ""} key={index} />)}</div>;
}
