"use client";

export default function PrintButton() {
  return (
    <button className="pat-button-primary" type="button" onClick={() => window.print()}>
      Print
    </button>
  );
}
