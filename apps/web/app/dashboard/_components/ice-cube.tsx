// "Frozen" mark: the SpeakPay shield sealed inside a block of ice. Colour comes from currentColor.
export function IceCube({ size = 24, strokeWidth = 2.25 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg
      aria-hidden
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 48 48"
      width={size}
    >
      {/* ice block with a faint frosted fill */}
      <rect fill="currentColor" fillOpacity={0.14} height={38} rx={10} width={38} x={5} y={5} />
      {/* top-left frost highlights */}
      <path d="M11.5 17v-2.5a3 3 0 0 1 3-3H17" strokeOpacity={0.75} />
      <path d="M11.5 22v-1.5" strokeOpacity={0.55} />
      {/* shield frozen inside */}
      <path d="M24 13.5c3.2 2.3 6.3 3 9 3v7.2c0 5.3-3.2 8.6-9 11.3-5.8-2.7-9-6-9-11.3v-7.2c2.7 0 5.8-.7 9-3Z" />
      {/* tiny glint */}
      <path d="M36.5 34.5l1.2-1.2" strokeOpacity={0.75} />
    </svg>
  );
}
