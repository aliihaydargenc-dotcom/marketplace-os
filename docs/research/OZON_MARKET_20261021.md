# OZON-REAL-01 · 21 Ekim 2026 gerçek ürün gözlemi

## Durum / sınır

Ozon'un kamuya açık 10 ayrı ürün sayfasındaki ID, kısa özellik ve bağlantılar doğrulandı. Sekiz ürünün **banka koşullu** ve **diğer bankalar** RUB fiyatı 21 Ekim 2026 tarihinde taranmış sayfalarda görüldü; iki üründe güncel ve koşulu net fiyat bulunmadığı için null. Bu bir **tarihli gözlem**, canlı senkron değil. Görsel/kullanıcı yorumu/uzun ürün açıklaması kopyalanmadı, yetkisiz Seller API kullanılmadı.

Bu liste **gerçek ürün ve gerçek gözlenmiş ilan fiyatı**dır, satıcı satışları veya kendi stokları değildir. Üç FBS kurgusal örnek sipariş, tahmini maliyetler, gelir, stok, alıcı, barkod ve muhasebe tutarları ayrı kalır. Ozon Seller API Client-Id/Api-Key ancak yetkili hesabın özel siparişlerini getirebilir. Başkasının satıcı iç verisi kamuya açık değildir.

## Kanıt

| Ozon ID | Banka (RUB) | Diğer bankalar (RUB) | Kaynak |
|---|---:|---:|---|
| 3867869659 | 874 | 971 | https://www.ozon.ru/product/polotentse-mahrovoe-2-sht-harmonia-nabor-mahrovyh-polotenets-dlya-ruk-2h-50h90-sm-modalin-3867869659/ |
| 1847089555 | 3393 | 3711 | https://www.ozon.ru/product/nabor-mahrovyh-polotenets-brooklin-50h90-2-shtuki-1847089555/ |
| 3028526150 | 1504 | 1672 | https://www.ozon.ru/product/hobby-home-collection-polotentse-dlya-litsa-ruk-terma-hlopok-50x90-sm-krasnyy-3028526150/ |
| 1322337545 | — | — | https://www.ozon.ru/product/3-sht-konteyner-dlya-ovoshchey-pod-rakovinu-10-5l-3sht-bezhevyy-yashchik-dlya-hraneniya-1322337545/ |
| 165088562 | 797 | 886 | https://www.ozon.ru/product/konteyner-dlya-hraneniya-veshchey-plastikovyy-6-65-l-s-kryshkoy-vstavkoy-prozrachnyy-korobka-165088562/ |
| 1416873033 | — | — | https://www.ozon.ru/product/organayzer-dlya-holodilnika-20h30h5-sm-s-kryshkoy-1416873033/ |
| 3087563922 | 23218 | 23572 | https://www.ozon.ru/product/crucial-1-tb-vnutrenniy-ssd-disk-m-2-pci-e-4-0-ct1000t500ssd5-3087563922/ |
| 735199999 | 442 | 483 | https://www.ozon.ru/product/konteyner-pishchevoy-3-l-28h16h12-sm-pryamougolnyy-tsvet-prozrachnyy-goluboy-735199999/ |
| 4681090966 | 565 | 595 | https://www.ozon.ru/product/organayzer-dlya-holodilnika-5200-ml-1-sht-polipropilen-4681090966/ |
| 5471004835 | 439 | 462 | https://www.ozon.ru/product/konteyner-pishchevoy-3-sht-plastik-5471004835/ |

- 1322337545: farklı varyant/birim fiyatları birlikte görünüyor; koşulu belli tek fiyat yok.
- 1416873033: erişilebilir fiyat kaydı 5 ay önceki taramadan; güncel diye sunulmadı.
- Hesaplanan güncel satış/komisyon/mağaza stoğu bulunmuyor.
- Depolama: `src/domain/catalog/ozon-market-snapshot.ts`. Arayüz: Operasyon Merkezi özet, Stok & Depo aranabilir liste, eşleşen ürün kartında kaynak fiyatı.
- Test/derleme/tarayıcı/DB CI sonuçları bu veri kaydıyla otomatik olarak PASS sayılmaz.
