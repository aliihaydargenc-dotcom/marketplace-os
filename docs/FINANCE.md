# Finans veri sözlüğü ve hesaplama kuralları

OPS-02 notu: Siparişler çalışma listesinin tarih filtresi Europe/Istanbul takvim gününe göre işler ve kişisel görünüme kaydedilir. Finans / Operasyon Merkezi göstergelerinin aşağıda tanımlı UTC kohortu bu görevde değişmemiştir. Sipariş listesi filtresi rapor para birimi dönüşümü değildir; FX-01 bekliyor.

Finans görünümü resmi muhasebe veya tahsilat mutabakatı değildir. Demo komisyon/lojistik değerleri kurgusaldır; Ozon tarifesi oldukları iddia edilmez.

- Tutarlar minor-unit tamsayı: 100 kopek = 1 RUB; 100 kuruş = 1 TRY.
- Fiyat: sipariş oluşturulurken ürün fiyatından fotoğraf alınır. RUB fiyatı TRY siparişinde `round(price_rub × fx_rate / 1_000_000)` ile dönüştürülür.
- Kur: `fx_date`, `fx_rate`; `fx_rate/1_000_000` TRY/RUB. Maliyet TRY fotoğrafıdır. RUB maliyet = `round(cost_try × 1_000_000 / fx_rate)` birim başına. Gerçek zamanlı veya resmi kur değildir.
- Sevkiyatta SALE = Σ(quantity × unit_price).
- COMMISSION = −round(SALE × commission_bps / 10_000).
- LOGISTICS = −order.logistics (sipariş para birimi).
- COGS = −Σ(quantity × dönüştürülmüş birim maliyet). Herhangi bir satırın maliyeti eksikse COGS yazılmaz; sıfır maliyet varsayılmaz.
- İade kabulünde (karantinaya girişte) REFUND = −SALE; finansal iade QC'den bağımsız demo politikasıdır. Tam sipariş iadesi desteklenir.
- QC kabulünde COGS_REVERSAL = −COGS. QC reddinde maliyet kaybı korunur.
- İadede komisyon/lojistik otomatik iade edilmez; dış finansal mutabakat yoktur.
- Brüt = ΣSALE; iadeler = −ΣREFUND; net = brüt − iadeler.
- Bilinen maliyet = −ΣCOGS − ΣCOGS_REVERSAL.
- Katkı = net − komisyon − lojistik − bilinen maliyet. Maliyeti eksik siparişin katkısı NULL / hesaplanamaz. Toplam katkı uyarı ile gösterilir ve kesin kâr sayılmaz.
- TRY/RUB ayrı toplamlar. İki para birimi asla doğrudan toplanmaz.

## Dönem ve kaynak

Tarih filtresi siparişin UTC oluşturma gününe göre bir kohort seçer. Seçilen siparişlerin bağlı tüm finans hareketleri toplanır; nakit tahsilat veya yalnız işlem-tarihli finans raporu değildir. Başlıkta kohort bilgisi bulunur. Günlük grafik seçilen siparişlere ait SALE hareketlerini sipariş oluşturma gününe atar; sevkiyat takvimi grafiği değildir. Dashboard operasyon kuyruğu/kritik stok anlık tüm dönemi gösterir; bunların alt metni farklı kapsamı açıklar. Bugün kısayolu Europe/Istanbul takvim gününü seçer; veri filtresinin UTC gün kuralı korunur.

İptal edilen sevkiyatsız sipariş finans satışına hiç girmez. İptal sipariş bedeli operasyon tablolarından izlenir, SALE'den tekrar düşülmez.

Ürün raporu: komisyon/lojistik/iade sipariş satır tutarı oranında tam kuruş/kopek dağıtımıyla tahsis edilir; en büyük kalan yöntemi toplamı korur. Ürün alış maliyeti her satırın kendi maliyet fotoğrafıdır; gelir oranında dağıtılmaz. QC onaylı iadede ilgili satır maliyeti geri alınır. Eksik maliyetli siparişin ürün katkıları da belirsizdir. Adet/gün = iade hariç sevk adedi / seçili takvim günü. Stok devri = dönemde ana depo sevk adedi / ((dönem başı fiziksel + dönem sonu fiziksel)/2). Açılış/kapanış stok ledger'dan hesaplanır, payda sıfırsa boş gösterilir. Ürün devir miktarı fiziksel olduğundan para birimi filtresinden bağımsızdır.

Excel: sipariş bazında brüt/iade/net/gider/maliyet/katkı, eksik maliyet işareti, kur ve kur tarihi; ayrı finans hareket sayfası ve özet. PDF: aynı kohort ve özet + sipariş listesi. Fatura PDF'i tarayıcı yazdırma/PDF kaydet akışıdır ve DEMO / TASLAK işaretlidir. Vergi hesaplaması veya mali geçerlilik yoktur.


## FX-01 — Güncel görüntüleme karşılığı

Özgün tutarın altında ≈ seçili para birimi gösterilir; varsayılan TL. Kur TCMB son yayımlanan bültendeki ForexBuying / Unit, ölçek 10^8. Dönüşüm minor-unit tamsayı × kaynak TRY kuru / hedef TRY kuru; BigInt ile en yakın kuruş, yarımda sıfırdan uzağa yuvarlanır. Son bülten tarihi ve kontrol saati görünür; önceki gün açıkça işaretli. Eksik/bozuk/ağ hatasında karşılık yok, uydurma kur yok. Yedi günden eski veya ileri tarihli bülten reddedilir. [Kaynak ve kapsam](research/FX01_RESEARCH.md).

Bu karşılık güncel gösterge değerlemesidir; geçmiş siparişin kayıtlı fx_rate/fx_date değeri ve demo maliyet hesabı değişmez. TRY/RUB ayrı kaynak toplamlar olarak kalır. Satırların yuvarlanmış karşılık toplamıyla toplamın tek dönüşümü küçük fark gösterebilir; karşılıklar resmi muhasebe mutabakatı değildir. Excel/PDF, grafik ekseni ve tooltip kaynak para biriminde kalır. Tarihsel TL/EUR export bu teslimin kapsamı değildir.
