# INV-02 — Ayrı iade ve kalite kontrol masası

21 Ekim 2026. Başlangıç `c5c9d371c390459508df8ba7635481467f34259d`. Kullanıcı devam izni verdi; CAT-01 ayrıntılı kullanıcı kabulü yapılmış sayılmaz. Bu teslim Aşama 2'de ayrı QC çalışma ekranıdır. INV-01 mal kabul belgesi ARCH-01 servis ayrımına bağlı; onu olmuş gibi sunmadan mevcut QC kurallarıyla çalışılabilen INV-02 seçildi.

## Kaynak ve tasarım

Medusa OrderListTable tekrar okundu: başlık/aksiyon, arama/filtre/sayfalama ve detay navigasyonu ayrı. Dosya SHA ve karar [manifestte](inv02-sources.json). Medusa open-core; önceki LICENSE / ENTERPRISE-LICENSE sınırı korunur. Kod, CSS, metin veya varlık kopyalanmadı. REA CLI çalıştırılmadı. Kendi Hazırlama Masası'ndaki kuyruk/istasyon yaklaşımı özgün iade masasına uyarlandı; bu kaynak Ozon iade prosedürünün doğrulanması değildir.

## Özgün iş akışı

- Yönetici/depo için ayrı `returns` bölümü; muhasebe bölüm başlangıcı allowlist'ten reddedilir. Navigasyon bir yetki duvarı değildir: mevcut QC sunucu komutu ayrıca role, aktif kullanıcıya, workspace'e, generation'a ve transaction sınırına bakar. Yeni endpoint veya yetki genişletmesi yok.
- Read modeli returns + order + product kayıtlarını bağlar. FBS iadeler pending/accepted/rejected/all; en eski iade tarihi ve order ID sırası; sipariş/alıcı/ürün/SKU/barkod/gerekçe araması. Sekme sayıları mevcut aramaya göre hesaplanır. Finans tarih filtresi uygulanmaz; tüm tarihler açıkça yazılır.
- Seçili iadede bütün satırlar ve miktarlar, bu iade referansının net karantina ledger miktarı ve ürünün güncel satılabilir stoku ayrı gösterilir. Başka iadeden kalan toplam karantina, bu iadenin miktarıymış gibi sunulmaz.
- İade bekliyor + sipariş RETURN_PENDING + ürünler mevcut + bu referansın her satır karantina toplamı iade miktarına eşitse UI karar formu açılır. Tutarsız kayıtta işlem gizlemek yerine engel açıklanır. Bu read-side ön kontrolü sunucu yetki/transaction kontrolünün yerine geçmez.
- Tam sipariş kararı: satışa uygun / uygun değil, 3–300 karakter gerekçe ve bütün ürünlerin kontrol edildiği açık checkbox. İlk karar önceden seçili değil. Kısmi kabul/ret ve sonradan karar değiştirme mevcut sunucu modelinde yok; UI bunu açıklar.
- Kabul mevcut QC komutuyla karantinadan çıkıp ana depoya girer; varsa COGS geri alınır. Ret karantinadan çıkış, satılabilir artış yok ve maliyet kaybını korur. REFUND iade alınırken zaten oluşur; QC'de yeniden satış iadesi üretilmez. Komisyon/lojistik otomatik iade edilmez.
- Tamamlanmış kayıt salt okunur; karar gerekçesi/tarihi ve ledger geçmişi görünür. Mevcut returns.reason QC'de değişir: ilk gerekçe varsa RETURN audit'inden okunur, yoksa uydurulmaz. Seed kayıtlarında ayrı ilk gerekçe audit'i olmayabilir.
- Finans alanı yöneticiye bağlı REFUND ve COGS_REVERSAL kayıtlarını gösterir; eksik maliyet açık. Depoya tutar döndürülmeyen mevcut snapshot kullanılır, maliyet hesaplanmış gibi görünmez. Muhasebe bu masayı kullanmaz; finans ekranı üzerinden raporlar.
- İstek sürerken seçim/karar kilitli, ref ile seri submit engellenir. Ağ/işlem hatası sonrası otomatik retry yok; tam sayfa yenilemeyle güncel kayıt kontrolü istenir. Sunucu daha önce tamamlanan QC için no-op dönebildiğinden UI istenen kararın kesin uygulandığını söylemez; güncel kaydı kontrol etmeye yönlendirir. Başarılı yanıt/yenileme ardından sıradaki uygun kayıt seçilir.
- Bekleme saati yaklaşık tam saat: ekran açılışı veya açık kuyruk yenilemesi anına göre. Canlı SLA sayacı değildir. Aktif siparişten mevcut geçmiş yan paneli açılır.

## Kapsam ve kontrol

Yeni migration, ledger/finans formülü, QC servis değişikliği veya seed yok. `domain/inventory/returns.ts`, `components/returns-workbench.tsx/.css`, navigasyon ve Workspace bağlantısı. ARCH-01, INV-01, kısmi iade, harici Ozon iade senkronu, QC fotoğrafı/hasar kodu, cihaz testi ve iki operatör görev sahipliği bu teslimin dışında.

Hedefli saf testler: FBS/status/orphan/sıralama/immutability, Türkçe arama, referans bazlı karantina/kimlik/durum engeli, bekleme yaşı. Navigasyon rolleri ayrı testte. Eski DB/E2E paketi bu turda koşulmadı; mevcut QC kuralı yeniden uygulanmadı. Yeni browser kararı ve eşzamanlı operatör kabulü devir listesinde.
