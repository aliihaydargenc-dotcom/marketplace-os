"use client";
export function PrintButton() {
  return (
    <button className="no-print primary" onClick={() => window.print()}>
      Yazdır / PDF olarak kaydet
    </button>
  );
}
