# QA-01 — Bağımlılık güvenliği ve kabul kapısı (21 Ekim 2026)

Bu kayıt `feature/ux03-order-360` dalının yerel doğrulamasıdır; üretim yayını, gerçek cihaz doğrulaması veya kullanıcı onayı değildir. Ortam: Node 24, Next.js 16.4.2 ve yalnız `127.0.0.1:55432` üzerindeki izole PostgreSQL 18.4 test veritabanı. Canlı veritabanı üzerinde test/migration çalıştırılmadı.

## Güvenlik bulguları

| Denetim | Kritik | Yüksek | Orta | Toplam |
| --- | ---: | ---: | ---: | ---: |
| Başlangıç (`npm audit`) | 2 | 6 | 3 | **11** |
| Düzeltme sonrası (`npm audit`) | 0 | 5 | 0 | **5** |
| Üretim bağımlılıkları (`npm audit --omit=dev`) | 0 | 0 | 0 | **0** |

- `drizzle-orm`: 0.44.7 → 0.45.4. SQL identifier escaping güvenlik bulgusu giderildi. Mevcut PostgreSQL transaction ve servis testleri tekrar çalıştırıldı.
- `vitest`: 3.2.7 → 5.0.5. `@vitest/mocker`, `tinypool` ve Vitest zincirindeki iki kritik / ilgili orta bulgular kapandı. Tam test paketi tekrar çalıştırıldı.
- `exceljs` → `uuid`: ExcelJS 4.4.0 sürümü tutuldu; `overrides.exceljs.uuid` ile 8.3.2 → 11.1.1 çözümlendi. Excel raporunun tarayıcı üzerinden indirilmesi E2E içinde doğrulandı. Gelecekte ExcelJS güncellendiğinde override yeniden değerlendirilmeli.
- **Açık beş yüksek bulgu:** geliştirme bağımlılığı `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces` zincirinden kaynaklanıyor. Kurulu Next ESLint 16.4.2 ile uyumlu yayımlanmış bir çözüm audit tarafından sunulmadı; önerilen otomatik `--force` çözümü `eslint-config-next` 14.2.35'e düşürerek Next 16 ile sürüm uyumsuzluğu yaratıyor. Bu nedenle zorlamalı downgrade yapılmadı. Lint yalnız yerel/CI geliştirici aracıdır; üretim bağımlılık taraması temizdir. **Tam audit sıfır değildir; bu beş bulgu açık izlenir.**

Bu sayılar bağımlılık düğümlerini ifade eder; 11 ayrı istismar gözlendiği anlamına gelmez. `npm audit --omit=dev` sonucu, üretimdeki uygulamanın başka güvenlik kusuru bulunmadığını kanıtlamaz.

## Düzeltme sonrası regresyon

| Kontrol | Sonuç |
| --- | --- |
| Temiz DB kurulumu / 0001–0009 tekrar / 0007'den 0008–0009 yükseltme | **PASS**, migration testleri |
| Mevcut verinin korunması, claim FK ve workspace cascade | **PASS**, migration testleri |
| Eşzamanlı sevkiyat, idempotency, rol ve workspace izolasyonu | **PASS**, PostgreSQL testleri |
| Vitest tüm DB bayraklarıyla | **104/104 PASS**, 22 dosya, skipped yok |
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** |
| `npm run format:check` | **PASS** |
| `npm run build` | **PASS**, Next.js 16.4.2 |
| `npm run test:e2e` | **12/12 PASS**, Chromium, 0 retry |

Tüm DB senaryoları `ORDER_VIEWS_DB_TEST`, `CATALOG_DB_TEST`, `INVENTORY_DB_TEST`, `OPERATIONS_DB_TEST`, `CONCURRENCY_DB_TEST`, `MIGRATION_DB_TEST` değişkenleri `1` iken çalıştırıldı. Browser testleri kurgusal veri ve yerel production build kullanır. Regression bu sürüm için tekrar koşuldu; fiziksel cihaz yerine hızlı barkod/Enter tuşları emüle edildi.

## Fiziksel scanner kabulü — cihaz başında gerekli

1. Kullanıcının kullandığı barkod okuyucuyu gerçek cihazına bağla; bir barkodun tek karakter dizisi ve Enter sonlandırması gönderdiğini gözlemle. Türkçe klavye/IME farkını doğrula.
2. Depo rolüyle Hazırlama Masası'nda yeni FBS siparişini üstlen, ürün etiketini art arda üç kez okut. Her okuma yalnız bir adet sayılmalı, sıra korunmalı; yanlış barkod açık hata vermeli.
3. Aynı siparişi ikinci oturumda üstlenmeye çalış; engel görünmeli. Yönetici devraldığında ilk terminal yeni okutmayı kaydetmemeli.
4. Ağ kesintisi/yenileme, sekme kapanışı, gecikmiş scanner girdisi ve lease süresi sonrasında tekrar dene; yanlış sevkiyat, çift düşüm ve yetki atlaması olmamalı.
5. Gerçek cihazda sevk sonrası stok ledger, taslak fatura, finans ve sipariş 360° geçmişini karşılaştır. Görünümü 1440×900 ve 1920×1080 ekranlarda incele.

**Fiziksel scanner: BEKLİYOR.** Bağlı cihazdan gerçek test çıktısı veya kullanıcı onayı alınmadı. Klavye emülasyonu fiziksel cihaz testinin yerine geçirilmedi.

## Kullanıcı kabulü ve yayın

Kullanıcı; 30 farklı sipariş / en az 3 blokaj, 1.000+ kayıt performansı, iki gerçek operatör, üst gezinme, sipariş satır detayı, hazırlama, fatura/iade/finans akışı, gerçek cihaz okuması ve ekran geçişlerini sınayarak kabul verir. Bu denetimler kullanıcının adına tamamlandı olarak işaretlenemez.

**Kullanıcı kabulü: BEKLİYOR.** GitHub'a feature dalı push edilmesi üretim yayını veya `main` merge'i değildir. Yeni bir canlı test bağlantısı ve `READY`/smoke kanıtı olmadıkça eski production adresi bu aday sürümün kabul adresi olarak sunulmaz. Uzak CI workflow'u kullanıcı istemediği e-posta bildirimlerini tetiklememek için otomatik çalıştırılmaz.
