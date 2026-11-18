const knobs = [
  { id: "volume", long: "ÂM LƯỢNG", short: "VOL" },
  { id: "tune", long: "DÒ SÓNG", short: "TUNE" },
] as const;

/** Two decorative knobs; the long labels show on desktop, the short ones on mobile. */
export function RadioKnobs() {
  return (
    <div aria-hidden="true" className="radio-knobs">
      {knobs.map((knob) => (
        <div className="radio-knob-wrap" key={knob.id}>
          <span className="radio-knob">
            <span className="radio-knob__mark" />
          </span>
          <span className="radio-knob__label radio-knob__label--long">{knob.long}</span>
          <span className="radio-knob__label radio-knob__label--short">{knob.short}</span>
        </div>
      ))}
    </div>
  );
}
