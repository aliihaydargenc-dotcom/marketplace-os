# Doğrulama raporu

## 21 Ekim 2026 — FX-01 gösterim karşılığı

`npx vitest run tests/exchange-rates.test.ts`: **5/5 PASS** (son koşu 300ms toplam, 29ms test). Kur birimi normalizasyonu; kaynak/tarih meta; RUB/TRY/EUR çapraz dönüşüm; pozitif/negatif yarım yuvarlama; tamsayı sınırı; eksik/bozuk/DTD/tekrarlı/ileri/eski bülten reddi; sabit kaynak fetch ve HTTP/HTML başarısızlığı. Gerçek HTTP 200 TCMB XML gövdesi parserdan geçti (bülten 20.10.2026). Önceki kapsamlı domain/DB/E2E paketi bu görevde tekrarlanmadı; kur testleri gerçek satış veya muhasebe kabulü değildir. Build ilk denemede eski Turbopack persistence dizininden hata verdi; üretilmiş .next kenara taşınıp temiz build geçti. Son kaynak için typecheck/lint (0 uyarı)/format/production build PASS. Yayın/canlı gözlem ayrıca kaydedilecek.

---

## 21 Ekim 2026 — OPS-02 kayıtlı görünümler

Canlı ek kayıt: `1b5c1aa` kodu production READY. Kişisel görünüm kaydet → tam yenile → filtre/sıralama geri yükleme gözlendi. 20 seçimin toplu aday sayıları kontrol edildi; sevkiyat gönderilmedi. [Kanıt ve kapsam sınırı](research/OPS02_SMOKE.md).

TypeScript, lint (0 uyarı), format ve production build PASS. `/api/order-views` route'u build edildi. `ORDER_VIEWS_DB_TEST=1 npx vitest run tests/order-views.test.ts tests/order-views.db.test.ts`: **8/8 PASS**, 19.02s. 4 saf test: tarih/sütun doğrulama, Türkçe isim tekilliği/silme, birleşik SKU/barkod/Türkiye günü filtresi, FBO/hazırlama uygunluğu. 4 gerçek PostgreSQL testi: workspace/kullanıcı izolasyonu ve shared snapshot redaksiyonu; mağaza ayarında view/sentinel korunması; aynı revision'da eşzamanlı yazmalardan birinin 409 olması; eski generation/pasif kullanıcı reddi. Testler ayrı Neon `dev-ops02-validation` dalında çalıştı, yalnız kendi iki UUID workspace'ini oluşturup temizledi. Canlı veritabanında test/reset/migration yok. Önceki tam domain/E2E paketi bu dilimde tekrarlanmadı; [yeni kabul listesi](planning/TEST_HANDOFF.md) açık. Uzak Actions başarısı ayrıca doğrulanmalıdır.

---

## 21 Ekim 2026 — UI-01 giriş / çalışma ayrımı

Canlı ek kayıt: `a11f607` kodu Vercel production'da READY. Mevcut yönetici oturumunda merkeze/çalışma ekranına geçiş ve Hazırlama Masası'na dönüş seçimi gözlendi. [Smoke kapsamı ve görüntü](research/UI01_SMOKE.md); yeni oturum/rol değişimi ve tam E2E bu kapsamda değil.

TypeScript, lint (sıfır uyarı), biçim kontrolü ve production build PASS. `npx vitest run tests/navigation.test.ts`: **2/2 PASS**; role uygun başlangıç, yasak bölüm ve allowlist dışı URL/nesne/prototype değerlerinde güvenli varsayılan. `/` Demo Merkezi ve `/workspace` session kontrollü çalışma rotası build edildi. Session/stock/finans yazma kuralları değiştirilmedi; `currentActor` mevcut resolver'ın salt okuma paylaşımıdır. DB entegrasyon/E2E bu turda çalıştırılmadı. Önceki E2E helper'ı yeni rol seçimine uyarlandı; test kaynak güncellemesi başarılı test koşusu anlamına gelmez. Kullanıcı kontrolü ve kapsamlı regresyon [test devir listesinde](planning/TEST_HANDOFF.md) bekliyor.

---

## 21 Ekim 2026 — OPS-01 ek kontrolü

Hazırlama masası ve repo planlama kayıtları eklendi. Typecheck, lint, format kontrolü ve production build PASS. `npx vitest run tests/packing.test.ts`: **3/3 PASS**, FBS/durum uygunluğu, sıra, rezervasyon/stok engeli, kuyruk ayrımı ve arama. Yeni UI için browser/DB E2E ve fiziksel scanner testi bu turda çalıştırılmadı. Sonraki Codex/kullanıcı kabul listesi: [TEST_HANDOFF.md](planning/TEST_HANDOFF.md). Bu sonuçlar aşağıdaki önceki çalışma sonuçlarını güncel sürümde tekrar doğrulamaz. Vercel yeni commit için ayrı izlenmelidir.

---

Tarih: 20 Ekim 2026, Europe/Istanbul. Yalnız kurgusal demo verisi kullanıldı.

## Yerel sonuçlar

| Kontrol                | Sonuç                                      | Kanıt                                                             |
| ---------------------- | ------------------------------------------ | ----------------------------------------------------------------- |
| TypeScript             | Başarılı                                   | `npm run typecheck`                                               |
| ESLint                 | Başarılı, sıfır uyarı                      | `npm run lint`                                                    |
| Biçim                  | Başarılı                                   | `npm run format:check`                                            |
| Production build       | Başarılı                                   | Next.js 16.4.2, App Router, Node 24                               |
| PostgreSQL entegrasyon | 15/15 başarılı                             | Gerçek Neon PostgreSQL 18, iki izole test workspace'i             |
| HTTP regresyon         | 2/2 başarılı                               | Origin/Host kontrolü ve sahte forwarded host reddi                |
| Finans birim testleri  | 2/2 başarılı                               | Tam kuruş gider tahsisi, ürün maliyeti ve toplam katkı mutabakatı |
| Playwright E2E         | 2/2 başarılı (son revizyon: 57.2s + 21.7s) | Headless Chromium, production Next.js sunucusu                    |

Veritabanı paketinin son başarılı çalışması 143.21 saniye sürdü. Toplam 19 domain/HTTP/finans testi ayrı test koşularında doğrulandı. İlk bulunan foreign key temizlik sırası hatası deferred FK migration ile giderildi; testler ve cleanup tekrar geçti. Kısıtlı ortamda tarayıcı dağıtımı npm Chromium paketiyle sağlandı; web güvenliği kapatan ve çoklu context'i bozan Chromium bayrakları kaldırıldı.

## Kapsanan senaryolar

1. Rezervasyon fiziksel stoğu değiştirmez, tekrar rezervasyon miktarı büyütmez.
2. Sevkiyat bir stok çıkışı, bir sevkiyat ve tekil finans hareketleri oluşturur.
3. İptal rezervasyonu çözer; sevk edilmemiş sipariş için sahte fiziksel stok girişi oluşmaz.
4. Yetersiz stok rezervasyonu rollback eder; rezervasyonsuz hazırlama engellenir.
5. İki eşzamanlı sipariş aynı stoğu aşamaz.
6. Aynı idempotency anahtarlı barkod okutma ikinci adet yazmaz; farklı payload aynı anahtarla reddedilir.
7. Karantina iadesi QC öncesinde satılabilir stoğu artırmaz; tekrarlanan QC ikinci stok girişi üretmez.
8. Reddedilen QC satılabilir stoğu artırmaz, ürün maliyet kaybını korur.
9. Fatura unique DEMO / TASLAK kaydıdır; gerçek e-Fatura gönderimi kapalıdır.
10. Brüt satış finans defteri ile sevk edilen temel sipariş tutarlarının toplamına eşittir; bilinmeyen maliyette katkı NULL'dır.
11. Rol kontrolü sunucuda işler; depo rolü maliyet/finans ve yönetim audit içeriğini alamaz.
12. Farklı workspace'in siparişi hedeflenemez, stokları etkilenmez.
13. FBO siparişinde yerel FBS işlemine izin verilmez.
14. Reset yalnız kendi alanını değiştirir, yeni generation üretir ve eski sekmenin işlemini reddeder.
15. Ürün katkısında her ürünün gerçek maliyet fotoğrafı kullanılır; gider tahsisi toplam kuruş/kopeği korur.

## Tarayıcı kanıtı

- İki ürünlü sipariş, iki adet aynı barkod ve bir adet ikinci barkod ile doğrulandı.
- Rezervasyon → sevkiyat → taslak belge açma → finans görünümü → Excel indirme → geçerli PDF yanıtı → karantina iade → QC onayı zinciri geçti.
- 1440×900 ve 1920×1080 ekran görüntüleri üretildi ve incelendi. 390px görünümde sayfa yatay taşması kontrol edildi. Gerçek fiziksel cihaz testi yapılmadı.
- Depo rolü finans menüsünü görmez ve rapor HTTP isteği 403 alır.
- İki ayrı browser context farklı workspace alır; ikinci alan sıfırlanınca ilk alanın generation/sipariş sayısı korunur.

## Yayın doğrulaması

- GitHub: `main` dalına araştırma/çekirdek, altı modüllü uygulama ve rapor/erişim düzeltmesi anlamlı ayrı commit'lerle aktarıldı.
- Yayındaki uygulama commit'i: `facdcb52da6b0345d77fe0cf62732152f57419ea`.
- Vercel production: **READY**, deployment `dpl_GUtLgrZyMgHCnzApW2bigCwypx8B`; fonksiyon bölgesi `fra1`, Node 24, Next.js 16.4.2.
- Canlı adres: https://marketplace-os-amber.vercel.app/
- Canlı tarayıcıda izole alan açıldı; `DEMO-0CBF31BA` siparişi oluşturuldu → rezerve edildi → `8690100000002` barkodu doğrulandı → sevk edildi → DEMO fatura taslağı oluşturuldu.
- Kaynak sonuç: 1.175,00 RUB satış − 176,25 RUB komisyon − 250,00 RUB lojistik − 128,87 RUB ürün maliyeti = **619,88 RUB katkı**. Ana depo çıkışı −1 adet ve tek sevkiyat referansı detayda görüldü.
- Son deployment sonrasında sayfa yenilendi; aynı workspace ve oluşturulan sipariş/fatura korundu.
- Son deployment için error/fatal runtime log sorgusunda kayıt bulunmadı. Harici monitoring/alerting veya log drain kurulmadı; uzun dönem gözlemlenebilirlik iddia edilmez.
- GitHub Actions **başarısız / doğrulanamadı**: ilk run `39492346366`, verify job `118868507625`, adımlar boş. Günlük isteği **404 BlobNotFound**. Kök neden loglardan kanıtlanamadı; uzak CI başarılı olarak raporlanmaz. Yerel doğrulamalar ve Vercel build sonucu bundan ayrıdır.
- İlk başarısız fixture temizlik adımından kalan iki test workspace'i, oluşturulma zamanı ve UUID'leri doğrulanarak yalnız bu iki kaydı hedefleyen işlemle temizlendi.

![Canlı sipariş, fatura taslağı ve finans kanıtı](live-verification-20261020.jpg)

## Üretim sınırları

FBS yerel demo akışı doğrulanmıştır. Gerçek Ozon/Paraşüt, FBO operasyonu, elektronik belge/vergi uygunluğu, kargo taşıyıcısı takibi, üretim kullanıcı kimliği ve gerçek cihaz testi yapılmış değildir. Detaylar ARCHITECTURE.md ve REVERSE_ENGINEERING.md içindedir.

