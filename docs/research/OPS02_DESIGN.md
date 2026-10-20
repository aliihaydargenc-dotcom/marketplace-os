# OPS-02 — Kayıtlı görünüm ve sipariş çalışma listesi

21 Ekim 2026. Başlangıç commit'i: `7c9e37c147530fe768db266e84230903c0141312`. Kullanıcının “Devam” talimatıyla repodaki sıradaki tek işe geçildi.

## Kaynak okuması

Medusa `develop` branch'inde order-list-table ve data-table kaynak dosyaları okundu. URL, blob SHA ve ayrı gözlem/karar kayıtları [ops02-sources.json](ops02-sources.json) içinde. Önceki [tasarım referanslarında](DESIGN_REFERENCES.md) okunan Medusa LICENSE / ENTERPRISE-LICENSE.md sınırı korundu. Medusa open-core; tüm repo koşulsuz MIT varsayılmadı. Kod/varlık/Enterprise modül alınmadı.

- Gözlem: sipariş listesi Container altında heading/action, filtre, query, pagination ve table durumunu birlikte düzenliyor.
- Gözlem: ortak DataTable view selector, sütun görünürlüğü, sorting/filter/search state ve row selection API'lerini ayrı ele alıyor; filtre alanı içerik eklenince düzen kaymasını azaltmak için korunuyor.
- Karar: bizim listede üstte kişisel görünüm aracı, ardından durum sekmeleri ve birleşik filtreler; seçim olduğunda aday sayılarıyla toplu eylem çubuğu. Aksiyon ve seçim gezinmeden ayrı.
- Çıkarım: tekrar kurulan filtreler ve gereksiz başarısız toplu istekler azalabilir. Operatör hız artışı yüzdesi ölçülmedi.
- Sınır: karşılaştırılan kaynaklar statik dosyalardır; Medusa'nın tüm veri modeli, sunucu görünüm saklama biçimi veya kullanıcı deneyimi birebir doğrulanmadı. REA CLI çalıştırılmadı.

## Özgün uygulama kararları

1. `OrdersView` sipariş listesini büyük Workspace gövdesinden ayırır. Görünümler/filtre/sonuçlar bu bileşendedir; ortak DataTable controlled layout alabilir ve sipariş domain'ine bağımlı değildir.
2. Tercihler `workspaces.settings.orderViewPreferences[userId]` altında sürümlü JSON olarak tutulur. En fazla 12 görünüm; sorgu 200, ad 50 karakter; kolon kimlikleri whitelist; sayfa boyutu 20/50/100. Yeni migration gerekmez. Gerçek kullanıcı/ölçek aşamasında ayrı tercih tablosu düşünülebilir.
3. Kimlik, workspace ve kullanıcı istemci gövdesinden alınmaz. Session actor, aktiflik, generation, revision ve workspace kilidi sunucuda uygulanır. Aynı revision'daki eşzamanlı yazmalardan biri 409 olur; otomatik overwrite yok.
4. Shared snapshot yalnız `autoDraft` mağaza ayarını projekte eder. Kişisel query/view verileri diğer rollere yayılmaz. SETTINGS komutu JSON merge yapar; tercihler silinmez. Reset operasyon verilerini yenilerken tercihleri korur; eski ekranın yazması generation ile reddedilir.
5. Aktif görünüm yeniden açılır. Kaydedilmeyen düzen değişiklikleri açıkça işaretlenir; kayıtlı görünümü değiştirmez. Kayıtlı tarih aralıkları sabittir. Filtreler Türkiye takvim gününe göredir; finans raporunun UTC kohortu ayrı kalır.
6. Filtre/görünüm değişince seçim temizlenir. Sayfalar arasında seçim korunur; komutlar yalnız mevcut filtreye ait seçili kayıtlardan üretilir. Seçim ve sayfa numarası sunucuda saklanmaz.
7. FBO, yanlış durum ve eksik doğrulama istemcide aday sayısına alınmaz. Son stok, rol, rezervasyon ve idempotency kontrolleri mevcut execute transaction'ında kalır. Her sipariş ayrı işlem; atlanan, başarılı, hatalı sonuçlar listelenir. Ağ sonucu belirsizse otomatik retry yok.

## Doğrulama ve test ortamı

4 saf + 4 gerçek PostgreSQL testi PASS (19.02s). İzole Neon proje/dal: `wispy-grass-18111636` / `br-royal-fog-bael0zdv`, ad `dev-ops02-validation`. Bu dal yalnız demo projesinden türetildi; canlı bağlantı değiştirilmedi. Test iki yeni UUID alanını oluşturup sonunda yalnız bu alanları sildi. Compute `ep-green-lake-baeb6evi` için iş sonunda suspend çağrısı yapıldı; test dalı sonraki Codex kontrolü için tutuluyor. Hesap özel suspend süresini değiştirmeyi reddettiği için varsayılan hesap ayarı korundu. Secret bağlantı URL'si gizli stdin ile yalnız test alt sürecine geçirildi; repoya/.env dosyasına yazılmadı.

Typecheck/lint/format/build geçti. Kapsamlı eski domain/E2E paketi bu turda tekrarlanmadı; yeni tarayıcı kabulü [test devir listesinde](../planning/TEST_HANDOFF.md). Canlı smoke yapılırsa yalnız gözlenen dar kapsamıyla ayrıca kaydedilir.

## Kullanıcı kontrolü

Siparişler → FBS / Sevke hazır filtrele → sütun/sıralama ayarla → ad verip kaydet → yenile. Sonra görünümü değiştirip satır seçimini ve toplu işlem uygun adetlerini kontrol et. Kullanıcıdan geri bildirim gelmeden sonraki göreve geçilmez. FX-01 bu teslimatta yapılmış değildir.
