# FX-01 — Özgün tutar ve yaklaşık döviz karşılığı

21 Ekim 2026. Başlangıç: `183baee47fc5ed8ecf59303954a981a949c7feb0`. Son kullanıcı yönlendirmesi, önceki “TL ana tutar” isteğini bu teslim için değiştiriyor: kaynak para birimi sabit, Türkçe seçimle küçük karşılık gösterimi. Görev Aşama 3 içindedir. Sipariş/finans defteri yeniden değerlenmez.

## Gözlem ve kaynak

- TCMB resmi kaynak: https://www.tcmb.gov.tr/kurlar/today.xml — doğrudan HTTP 200 ile XML okundu. Bülten 20.10.2026; RUB ve EUR için Unit / ForexBuying alanları var. Arama okuyucusu application/xml içeriğini desteklemedi; doğrudan okuma ayrı kanıttır. İndirilen gövdenin SHA-256 değeri [manifestte](fx01-sources.json). Gerçek kur asla demo seed dosyasına sabitlenmez.
- TCMB gösterge kur sayfası: https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Istatistikler/Doviz+Kurlari/ — kaynak gösterge niteliğinde; bankada gerçekleşen satış kuru veya platform tahsilat kuru değildir.
- Tabler layout-condensed.astro tekrar okundu; manifest SHA aynı. Sıkı başlık/aksiyon ayrımı kendi kontrol çubuğuna uyarlandı. MIT lisans sınırı önceki LICENSE okumasında kayıtlı; kod, CSS, varlık kopyalanmadı. Yeni görsel şablon veya rakip panel kopyası yok.
- Ozon resmi API sayfası arama okuyucusuna okunabilir içerik vermedi. Bu tur gerçek satış endpointi/yetki doğrulanmadı ve yeni HTTP Ozon adapter yazılmadı. Kullanıcının “Tastak” dediği mağaza bağlantısı belirsiz. Kamu ürün kataloğundaki fiyat/görsel gerçek sipariş/komisyon/satış adedi kanıtı olarak kullanılmayacak. Sonraki katalog incelemesi tam mağaza/ürün bağlantısıyla sınırlı olacak; gerçek sipariş aktarımı ayrıca izinli erişim gerektirir. API anahtarı talep edilmedi.

## Karar ve sınır

1. Özgün RUB/TRY tutar üstte kalır. Varsayılan küçük karşılık TL; Euro, Ruble ve kapatma seçenekleri Türkçe. Kaynak ile hedef aynıysa gereksiz ikinci tutar yok. Seçim bu oturumun ekran state'idir; DB/kayıtlı sipariş görünümü tercihi değildir.
2. `ForexBuying / Unit` normalize edilir; TRY birimi 1. Kur 10^8 ölçekli tamsayı, minor-unit dönüşümü BigInt oranıyla yapılır. İşaret simetrik en yakın kuruş, yarımda sıfırdan uzaklaştırma. `amount × TRY_per_source / TRY_per_target`. RUB→EUR çaprazı aynı bültenden. Kaynak para birimleri birlikte toplanmaz.
3. Kayıtlı sipariş kuru, tarihsel maliyet, finans hareketleri, stok, fatura, form varsayılan demo kuru ve Excel/PDF değiştirilmez. Raporların özgün kuruş mutabakatı korunur. Grafiğin ekseni/tooltip özgün para birimindedir. Küçük karşılıklar güncel yaklaşık değerlemedir; tarihsel gerçekleşmiş TL kârı değildir. Satırların ayrı yuvarlanmasıyla toplamın tek dönüşümü küçük fark verebilir.
4. Kur her tablo satırından ayrı çağrılmaz. Provider tek uygulama isteğiyle paralel yükler; sunucu TCMB isteği no-store, istemci görünürken 15 dakikada / sekmeye dönüşte yeniden kontrol eder. “Kuru kontrol et” aynı API üzerinden kaynağı yeniden çağırır; bu gerçek zamanlı piyasa kuru anlamına gelmez. “Son kontrol” işlem zamanı, yayın/indirme zamanı değildir.
5. Bülten tarihi ve kaynak görünürdür. Önceki güne aitse açık “Önceki tarihli bülten”; tatil günü için tarih uydurma yok. Yedi takvim gününden eski, gelecekte, bozuk veya eksik bülten dönüşüm üretmez. Sekmede kontrol yanıtı iki saatten eskiyse geçersizdir. Kaynak/ağ hatasında sahte fallback kur veya sessiz eski kur kullanılmaz, karşılıklar gizlenir. Asıl tutar okunur kalır.
6. `/api/exchange-rates` session doğrular, sabit TCMB URL'sine sunucu tarafından gider. İstemciden URL/kur kabul etmez; DTD/entity reddi, sayı/tarih doğrulama, zaman aşımı var. Oturumsuz 401, kaynak hatası 503. Gerçek satış erişimi yok.

## Kabul

Siparişler ve Finans: RUB üst tutar sabit; altında ≈ TL, sonra Euro; kapatınca özgün tutar tek başına. Kur bilgisi kaynak+tarih içerir. Kaynak hatasında asıl tutar kalır, karşılıklar yok olur. Finans kayıtları/export aynı kaynak para birimiyle sürer. Bu görev tek teslimdir; Ozon katalog/gerçek veri alma sonraki iş olarak belirsizlikle kaydedildi.
