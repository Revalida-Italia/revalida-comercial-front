import { siStripe } from "simple-icons";

type StripeMarkProps = {
  className?: string;
};

const StripeMark = ({ className }: StripeMarkProps) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path fill="currentColor" d={siStripe.path} />
  </svg>
);

export default StripeMark;
