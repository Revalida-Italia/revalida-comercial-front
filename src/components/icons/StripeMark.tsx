import { siStripe } from "simple-icons";

type StripeMarkProps = {
  className?: string;
};

// Lucide Eye (the Ver link icon) draws about 13.3 units tall inside the shared 24 viewBox.
// The Stripe path is 24 units tall, so the same CSS box would paint a taller glyph.
const STRIPE_GLYPH_SCALE = 13.3 / 24;

const StripeMark = ({ className }: StripeMarkProps) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <g transform={`translate(12 12) scale(${STRIPE_GLYPH_SCALE}) translate(-12 -12)`}>
      <path fill="currentColor" d={siStripe.path} />
    </g>
  </svg>
);

export default StripeMark;
