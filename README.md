# Marketplace OS

[Canlı demoyu aç](https://marketplace-os-amber.vercel.app/) · [Doğrulama raporu](docs/TEST_REPORT.md)

Ozon Global üzerinde satış yapan bir işletme için masaüstü öncelikli, Türkçe operasyon platformu. **Çalışan FBS demo**: sipariş → rezervasyon → barkod doğrulama → sevkiyat → stok çıkışı → fatura taslağı → finans → Excel/PDF rapor.

Gerçek Ozon/Paraşüt bağlantısı ve e-Fatura gönderimi yoktur. FBO yalnızca açıkça işaretli referans görünümüdür. API anahtarı gerekmez. Belgeler **DEMO / TASLAK** niteliğindedir.

## Çalışan modüller

- Operasyon Merkezi: DB kayıtlarından göstergeler, tarih/para birimi filtreleri, günlük satış ve işlem kuyruğu.
- Siparişler: çok satır, SKU/alıcı araması, durum/model/tarih filtreleri, sıralama, sayfalama, sütun seçimi, toplu rezervasyon/sevkiyat, detay paneli ve geçmiş.
- Stok & Depo: fiziksel/rezerve/kullanılabilir/karantina bakiyeleri, kritik eşik, maliyet kartı güncelleme, gerekçeli sayım farkı, hareket defteri ve iade QC.
- Fatura Merkezi: siparişe bağlı unique taslak, hata/iptal/yeniden açma, yazdırma ve tarayıcıdan PDF kaydı.
- Finans: TRY/RUB ayrı kayıtlar, tarihli kur fotoğrafı, giderler, eksik maliyet uyarısı, sipariş/ürün katkısı, satış hızı, ledger tabanlı stok devri, dönem karşılaştırması, Excel ve PDF raporu.
- Sistem: sunucuda rol kontrolü, mağaza ayarı, otomatik demo taslağı, kullanıcı kayıt yönetimi, audit ve izole sıfırlama.

72 kurgusal SKU/varyant ve 260 tutarlı sipariş sunucuda oluşturulur. Her tarayıcıya ayrı workspace verilir. Demo rol seçimi gerçek üretim kimlik doğrulaması değildir. Oturum HttpOnly cookie ile 7 gün saklanır; çıkış sonrası yeni giriş yeni demo alanı açar. Açık oturumda sayfa yenilendiğinde aynı kayıtlar korunur.

## Yerel kurulum

Node.js 24 ve PostgreSQL 18 (veya Neon PostgreSQL).

```bash
npm ci
cp .env.example .env.local
# .env.local içine kendi DATABASE_URL değerinizi yazın.
npm run db:migrate
npm run dev
```

Uygulama: http://localhost:3000 . Neon için WSS Pool; standart PostgreSQL için TCP pg Pool kullanılır. Migration yalnızca uygulamaya ayrılmış veritabanında çalıştırılmalıdır. SQL migration dosyaları tekrar çalıştırılabilir. Üretim verisi veya kişisel müşteri verisi girmeyin.

## Doğrulama

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Domain testleri gerçek PostgreSQL transaction'ları üzerinde iki ayrı test workspace'i açar; test sonunda yalnız kendi alanlarını kaldırır. Test bağlantısı ortamdan veya gitignore kapsamındaki `.env.local` dosyasından okunur. Testler migration uygulanmış ayrı bir veritabanında çalıştırılmalıdır.

Playwright normalde yerel Chromium kullanır. Kısıtlı ortam için `BUNDLED_CHROMIUM=1 npm run test:e2e` seçeneği ve npm üzerinden gelen headless Chromium paketi bulunur. `BASE_URL` verilirse yerel web sunucusu başlatılmaz. Masaüstü senaryosu 1440×900 ve 1920×1080 ekranlarını, ayrıca 390px taşma kontrolünü içerir.

`.github/workflows/quality.yml` bağımsız PostgreSQL servisinde typecheck/lint/format/test/build/E2E çalıştırır. GitHub Actions sonucunun doğrulanması ayrıca [test raporunda](docs/TEST_REPORT.md) belirtilir.

## Vercel

Next.js framework, Node 24, Frankfurt (`fra1`). `DATABASE_URL` yalnız sunucu ortam değişkenidir; `NEXT_PUBLIC_` öneki kullanılmaz. Migration dağıtımdan önce uygulanır, build sırasında veritabanı sıfırlanmaz veya seed edilmez. İlk demo girişi workspace verisini transaction içinde oluşturur.

Production ve preview için ayrı veritabanı/branch önerilir. Bu demo tek demo veritabanıyla çalıştırılabilir; gerçek müşteri verisine bağlanmamalıdır. Canlıya alınmış olması üretime hazır muhasebe/ERP sertifikasyonu anlamına gelmez.

## Dokümantasyon

- [Araştırma, kaynaklar ve lisans sınırları](docs/REVERSE_ENGINEERING.md)
- [Mimari, veri modeli, güvenlik ve sınırlar](docs/ARCHITECTURE.md)
- [Finans formülleri ve veri kaynakları](docs/FINANCE.md)
- [Doğrulanmış test sonuçları](docs/TEST_REPORT.md)

## Kapsam dışında kalanlar

Gerçek Ozon/Paraşüt/kargo, FBO operasyonu, gerçek kullanıcı daveti/şifre/MFA, kısmi sevkiyat ve kısmi iade, çoklu mağaza/depo tahsisi, genel muhasebe/vergi, fiyat eşitleme, kapsamlı otomasyon ve canlı finansal mutabakat. Ek kullanıcı kayıtları düzenlenebilir ancak demo girişi üç yerleşik hesaba açıktır. Maliyet fotoğrafı önceki siparişlerde sonradan değişmez; bilinmeyen maliyetin düzeltme/mutabakat işlemi henüz yoktur.
