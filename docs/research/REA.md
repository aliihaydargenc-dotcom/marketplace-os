# REA incelemesi ve Marketplace OS kararı

Tarih: 21 Ekim 2026. Kaynak: https://github.com/morluto/rea . İncelenen package.json sürümü **6.7.0**. Bu inceleme GitHub kaynak/doküman okumasıdır; REA MCP/CLI çalıştırılması veya rakip runtime analizi yapılmış değildir.

## Saklanan kaynaklar

`references/rea/` içinde README, MIT lisansı, evidence workflow ve JavaScript feature tracing belgesinin kaynak kopyaları var. Her dosyanın URL'si, Git blob SHA'sı ve okuma tarihi `manifest.json` içinde. Dosyalar main'den ayrı çağrılarla okundu; ortak sabit committen alınmış gibi sunulmaz. Blob SHA içerik kimliğidir. Bunlar REA'nın kendi dokümantasyonu; Marketplace OS test/analiz çıktısı değildir.

## Öğrenilen yöntem

| Kaynak gözlemi | Bizim uygulama kararı | Sınır |
| --- | --- | --- |
| README, statik JS/Electron analizinin modül/import/route ilişkilerini çıkarabildiğini ve runtime incelemesinden ayrı olduğunu anlatıyor | Önce kendi repo dosya sınırlarını ve işlem zincirini izle; gerekirse izinli artifact üzerinde REA kullan | Statik import, çalışan entegrasyon kanıtı değildir |
| Evidence workflow; authority, limitations, coverage ve unknown ayrımını koruyor | Her bulguya kaynak/kanıt/durum/belirsizlik yaz; gözlemlenmeyeni doğrulandı diye kapatma | Hiç eşleşme bulunmaması, kısmi kapsamda yokluk kanıtı değildir |
| JavaScript workflow; feature trace'i kaynak kimliğine bağlı graph üzerinde izliyor | UI → route → execute → ledger/finance/fatura zincirini görev bazlı belgeleyerek değiştir | Tam graph analizi yapılmadan tüm kod tabanı kapsandı denmez |
| Kaynak ve sürüm karşılaştırmaları sınırlı iddialar için tanımlanıyor | Her geliştirmede etkilenen dosyalar/iş kuralları/karşılaştırılan kabul sonucu saklanır | Test PASS, ürünün tüm davranışlarında eşdeğerlik değildir |
| HAR görünümü gözlemlenen istekleri raporluyor; endpoint şemasını kesinleştirmiyor | İleride kullanıcının izinli ve temizlenmiş kaydı varsa yalnız gözlemlenen istekler not edilir | Cookie/token/kişisel veri repoya alınmaz; istekler tekrar oynatılmaz |

## Bizim kaynak incelememiz: OPS-01

Başlangıç commit: `84e5de9275e794e157d75ae8bc96debc2199f838`.

- Gözlem: `src/components/workspace.tsx` sipariş detayında barkod formu var; listeye dönmeden sıradaki siparişe ilerleyen çalışma masası yok. Yeni bileşenle seri operasyon eklendi.
- Gözlem: `src/app/api/command/route.ts` komutu mevcut execute servisine iletiyor. `src/server/execute.ts` RESERVE/SCAN/SHIP için stok/durum ve rol kontrollerini transaction içinde yapıyor. Yeni masa bu sınırı kullanır; ledger yazımını istemciye taşımaz.
- Gözlem: `src/domain/integrations/adapters.ts` interface/demo sınıfları var, `execute.ts` içindeki fatura/finans yazımı doğrudan SQL. Entegrasyonun yalnız adaptör değişimiyle çalışacağı henüz doğrulanmadı; INT-01 açık.
- Gözlem: tek aktif siparişte ürün barkodu bir adet paketliyor. Yeni masa bu miktar semantiğini korur; otomatik sevkiyat eklemez.
- Çıkarım: kuyruk + inline scanner + sıradaki işlemi personelin liste/panel dönüşünü azaltabilir. Gerçek operatör ölçümü olmadan hız artışı yüzdesi iddia edilmez.
- Bilinmeyen: gerçek scanner gecikmesi, iki operatörün görev paylaşımı, Ozon gerçek durum/limit eşleştirmesi, A LITTLE BIT'in iç hazırlama davranışı.

Bu bölüm REA çıktısı değil, kaynak dosyalarına dayanan özgün inceleme notudur.

## Sonraki Codex oturumunda isteğe bağlı REA

REA uygulamanın runtime bağımlılığı değildir. Mevcut ortamda gerekli değilse kurulumu geliştirmeyi durdurmaz. Resmi README'nin güncel Node koşulunu doğrula (inceleme sırasında ^22.19 / ^24.11 / >=26). Linux statik JS analizi için procps uyumlu `ps` gerekiyor.

Resmi README'nin CLI örneği, izinli yerel JavaScript/Electron artifact için:

```bash
npx -y rea-agents@latest analyze-javascript-application /absolute/path/to/app --json
```

Önce `--help`/sürümü ve desteklenen input türünü kontrol et. Bu repodaki TS/TSX veya Next.js bundle'ının tam desteklendiği varsayılmaz. `latest` değişebilir; gerçek çalışmada çözülen sürüm, komut, input digest'i, çıktı ve kısıtları kaydet. Çıktıyı önce inceleyip secret içermeyen sınırlı kanıtı `docs/research/evidence/` altında sakla. Bu turda böyle bir çıktı üretilmedi.

MCP setup (`npx rea-agents setup`) ajan konfigürasyonunu değiştirir ve restart gerektirir; kaynak belgesi kopyalamak kurulum değildir. Bu repoya hayali MCP araçları veya otomatik config yazılmadı.

## Lisans

İncelenen LICENSE: MIT, Copyright (c) 2026 morluto. Kopyalanan dokümantasyonla birlikte lisans metni korunur. Üçüncü taraf araçların koşulları ayrıdır. REA'nın MIT lisansı ERPNext GPL veya rakip uygulama varlıklarının lisansını değiştirmez. Rakip kodu/şeması kopyalanmadı.
