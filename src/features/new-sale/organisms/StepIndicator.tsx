type StepIndicatorProps = {
  labels: string[];
  step: number;
};

const StepIndicator = ({ labels, step }: StepIndicatorProps) => (
  <div className="flex items-center">
    {labels.map((label, index) => {
      const n = index + 1;
      const isActive = step === n;
      const isDone = step > n;

      return (
        <div key={n} className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                isDone
                  ? "bg-primary text-primary-foreground"
                  : isActive
                    ? "border-2 border-primary text-primary"
                    : "border-2 border-muted text-muted-foreground"
              }`}
            >
              {isDone ? "\u2713" : n}
            </div>
            <span className={`text-sm ${isActive ? "font-medium text-foreground" : "text-muted-foreground"}`}>
              {label}
            </span>
          </div>
          {index < labels.length - 1 && (
            <div className={`mx-4 h-px w-8 flex-shrink-0 ${isDone ? "bg-primary" : "bg-muted"}`} />
          )}
        </div>
      );
    })}
  </div>
);

export default StepIndicator;
