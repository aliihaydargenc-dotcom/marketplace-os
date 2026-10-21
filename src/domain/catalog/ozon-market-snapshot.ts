/** Public Ozon offer snapshot, checked on 2026-10-21; not Seller API or live synchronization.
 * Prices are split by bank payment conditions. Missing prices are null.
 * This module contains no seller orders, inventory, cost or customer information. */
export type OzonMarketObservation = {
  id: string; title: string; details: string; category: string; url: string;
  observedOn: string; bankPriceRub: number | null; otherBankPriceRub: number | null;
};
export const ozonMarketObservedOn = "2026-10-21";
export const ozonMarketObservations: readonly OzonMarketObservation[] = [
  {
    "id": "3867869659",
    "title": "Modalin HARMONIA pamuklu havlu seti",
    "details": "50×90 cm · 2 adet",
    "category": "Ev Tekstili",
    "url": "https://www.ozon.ru/product/polotentse-mahrovoe-2-sht-harmonia-nabor-mahrovyh-polotenets-dlya-ruk-2h-50h90-sm-modalin-3867869659/",
    "observedOn": "2026-10-21",
    "bankPriceRub": 874,
    "otherBankPriceRub": 971
  },
  {
    "id": "1847089555",
    "title": "BROOKLIN pamuklu havlu seti",
    "details": "50×90 cm · 2 adet · latte",
    "category": "Ev Tekstili",
    "url": "https://www.ozon.ru/product/nabor-mahrovyh-polotenets-brooklin-50h90-2-shtuki-1847089555/",
    "observedOn": "2026-10-21",
    "bankPriceRub": 3393,
    "otherBankPriceRub": 3711
  },
  {
    "id": "3028526150",
    "title": "Hobby Home Collection el havlusu",
    "details": "Pamuk · 50×90 cm · kırmızı",
    "category": "Ev Tekstili",
    "url": "https://www.ozon.ru/product/hobby-home-collection-polotentse-dlya-litsa-ruk-terma-hlopok-50x90-sm-krasnyy-3028526150/",
    "observedOn": "2026-10-21",
    "bankPriceRub": 1504,
    "otherBankPriceRub": 1672
  },
  {
    "id": "1322337545",
    "title": "Üçlü sebze saklama kutusu",
    "details": "3 adet · 10,5 L · plastik",
    "category": "Mutfak",
    "url": "https://www.ozon.ru/product/3-sht-konteyner-dlya-ovoshchey-pod-rakovinu-10-5l-3sht-bezhevyy-yashchik-dlya-hraneniya-1322337545/",
    "observedOn": "2026-10-21",
    "bankPriceRub": null,
    "otherBankPriceRub": null
  },
  {
    "id": "165088562",
    "title": "Kapaklı plastik saklama kutusu",
    "details": "6,65 L · 29×19×18 cm",
    "category": "Ev Düzenleme",
    "url": "https://www.ozon.ru/product/konteyner-dlya-hraneniya-veshchey-plastikovyy-6-65-l-s-kryshkoy-vstavkoy-prozrachnyy-korobka-165088562/",
    "observedOn": "2026-10-21",
    "bankPriceRub": 797,
    "otherBankPriceRub": 886
  },
  {
    "id": "1416873033",
    "title": "Kapaklı buzdolabı düzenleyicisi",
    "details": "20×30×5 cm · şeffaf",
    "category": "Mutfak",
    "url": "https://www.ozon.ru/product/organayzer-dlya-holodilnika-20h30h5-sm-s-kryshkoy-1416873033/",
    "observedOn": "2026-10-21",
    "bankPriceRub": null,
    "otherBankPriceRub": null
  },
  {
    "id": "3087563922",
    "title": "Crucial T500 SSD 1 TB",
    "details": "M.2 · PCI-E 4.0 · CT1000T500SSD5",
    "category": "Elektronik",
    "url": "https://www.ozon.ru/product/crucial-1-tb-vnutrenniy-ssd-disk-m-2-pci-e-4-0-ct1000t500ssd5-3087563922/",
    "observedOn": "2026-10-21",
    "bankPriceRub": 23218,
    "otherBankPriceRub": 23572
  },
  {
    "id": "735199999",
    "title": "Şeffaf gıda saklama kabı 3 L",
    "details": "28×16×12 cm · polipropilen",
    "category": "Mutfak",
    "url": "https://www.ozon.ru/product/konteyner-pishchevoy-3-l-28h16h12-sm-pryamougolnyy-tsvet-prozrachnyy-goluboy-735199999/",
    "observedOn": "2026-10-21",
    "bankPriceRub": 442,
    "otherBankPriceRub": 483
  },
  {
    "id": "4681090966",
    "title": "Buzdolabı düzenleyicisi 5,2 L",
    "details": "5200 ml · polipropilen",
    "category": "Mutfak",
    "url": "https://www.ozon.ru/product/organayzer-dlya-holodilnika-5200-ml-1-sht-polipropilen-4681090966/",
    "observedOn": "2026-10-21",
    "bankPriceRub": 565,
    "otherBankPriceRub": 595
  },
  {
    "id": "5471004835",
    "title": "Üçlü plastik gıda saklama kabı",
    "details": "3 adet · gıda uyumlu plastik",
    "category": "Mutfak",
    "url": "https://www.ozon.ru/product/konteyner-pishchevoy-3-sht-plastik-5471004835/",
    "observedOn": "2026-10-21",
    "bankPriceRub": 439,
    "otherBankPriceRub": 462
  }
];
export function findOzonObservation(id: string) {
  return ozonMarketObservations.find((item) => item.id === id);
}
