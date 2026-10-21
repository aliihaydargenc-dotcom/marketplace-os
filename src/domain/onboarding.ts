export type GuideStep = {
  target: string;
  title: string;
  description: string;
};

export type TourBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type TourPlacement = {
  left: number;
  top: number;
  placement: "above" | "below";
};

/** Keep a guide card inside the viewport without obscuring the selected control. */
export function placeTour(
  bounds: TourBounds,
  viewportWidth: number,
  viewportHeight: number,
): TourPlacement {
  const margin = 16;
  const cardWidth = Math.min(336, Math.max(0, viewportWidth - margin * 2));
  const cardHeight = 194;
  const gap = 14;
  const left = Math.max(
    margin,
    Math.min(bounds.left, viewportWidth - cardWidth - margin),
  );
  const belowSpace = viewportHeight - bounds.bottom - gap - margin;
  const aboveSpace = bounds.top - gap - margin;
  const below =
    belowSpace >= cardHeight ||
    (aboveSpace < cardHeight && belowSpace >= Math.max(96, aboveSpace));
  const top = below
    ? Math.max(margin, bounds.bottom + gap)
    : Math.max(margin, bounds.top - cardHeight - gap);
  return { left, top, placement: below ? "below" : "above" };
}

export const entryGuide: readonly GuideStep[] = [
  {
    target: "#demo-role",
    title: "Rol seç",
    description: "Yönetici, depo veya muhasebe görünümünü seç.",
  },
  {
    target: "#demo-section",
    title: "Başlangıç ekranı",
    description: "İlk açılacak çalışma bölümünü belirle.",
  },
  {
    target: "#demo-enter",
    title: "Demoyu aç",
    description: "Örnek kayıtlarla çalışmaya başla.",
  },
];

export const workspaceGuide: readonly GuideStep[] = [
  {
    target: '[data-tour="workspace-nav"]',
    title: "Bölümler",
    description: "Sipariş, hazırlama, stok ve diğer işlemler burada.",
  },
  {
    target: "#workspace-heading",
    title: "Çalışma alanı",
    description: "Seçtiğin bölümün işlemlerini bu ekrandan yönet.",
  },
  {
    target: '[data-tour="workspace-menu"]',
    title: "Oturum ve yardım",
    description: "Rolünü gör, demo merkezine dön veya rehberi yeniden aç.",
  },
];
