/** Decorative speaker grille with the "Radio 199X" badge. */
export function RadioSpeaker() {
  return (
    <div aria-hidden="true" className="radio-speaker">
      <div className="radio-grille" />
      <div className="radio-badge">
        <span className="radio-badge__title">Radio 199X</span>
        <span className="radio-badge__sub">BẮT SÓNG KÝ ỨC</span>
      </div>
    </div>
  );
}
