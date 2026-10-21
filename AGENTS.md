# Marketplace OS — çalışma talimatları

## Önce oku

1. `docs/PRODUCT_REQUIREMENTS.md`: kullanıcının ürün kapsamı ve kabul şartları.
2. `docs/planning/ROADMAP.md`: sıradaki iş ve bağımlılıkları.
3. `docs/planning/PROGRESS.md`: uygulanan / doğrulanan / bekleyen ayrımı.
4. `docs/planning/TEST_HANDOFF.md`: Codex toplu test devri ve kullanıcı kontrolleri.
5. `docs/REVERSE_ENGINEERING.md` ve `docs/research/SOURCE_INDEX.md`: kaynaklar, kararlar ve belirsizlikler.

## Çalışma biçimi

- Mevcut Next.js / PostgreSQL projesi üzerinden devam et. Statik prototiple değiştirme.
- Her iş için kısa plan yaz: sorun, sınır, bağımlılık, kabul şartı, gerekli kontrol. Ardından uygula; planlama döngüsünde durma.
- 21 Ekim sonraki kullanıcı yönlendirmesi: her teslim diliminde tek görev tamamla. Ardından kullanıcıya açacağı ekranı ve 2–3 somut kontrolü söyle; geri bildirim gelmeden sonraki geliştirme görevine geçme. Aynı görevde gereken düzeltme ve dokümantasyon bunun parçasıdır. Yayın aşağıdaki toplu teslim politikasına bağlıdır; her görev sonunda deploy yapılmaz.
- Tasarım değişikliğinden önce ilgili açık kaynak repo/dosyalarını ve lisans sınırlarını incele; gözlem/karar/kaynak SHA kayıtlarını araştırma dizinine ekle. Demo olması sıradan veya işlevsiz UI teslimini haklı çıkarmaz. Demo Merkezi tanıtım/rol seçimi, çalışma ekranı günlük operasyon içindir; gerçek kullanıcı kimliği eklenmeden gerçek login varmış gibi gösterme.
- `ROADMAP.md` görev kimliklerini commit ve ilerleme notlarında kullan. Durumlar: BACKLOG, IN_PROGRESS, IMPLEMENTED, VERIFIED, BLOCKED. Yazılmış kodu doğrulanmış özellik diye işaretleme.
- Kullanıcının 21 Ekim yönlendirmesi: geliştirmeye ağırlık ver; arayüz/geçiş denemelerini kullanıcı yapacak, kapsamlı regresyon Codex'te sonra yapılacak. Büyük test döngülerini her değişiklikte tekrarlama. Kod değişikliklerinde typecheck/lint ve uygun derleme, iş kuralı değişikliğinde ilgili hedefli test yeterlidir. Çalıştırılmayan testleri devir listesinde açık bırak.
- Stok, yetki, finans veya migration değişiyorsa ilgili bütünlük sorununu çözmeden sonraki özelliğe geçme. Bu kontrolü kullanıcıya devretme.
- Masaüstü 1440×900 / 1920×1080 öncelikli; Türkçe arayüz, İngilizce teknik adlar. Beyaz/lacivert/mavi, yoğun tablolar, belirgin durumlar; gereksiz boşluk ve gradyan ekleme.
- Yeni ekranları ayrı bileşenlerde geliştir; `workspace.tsx` ve `execute.ts` dosyalarını daha da büyütmek yerine aşamalı modül ayrımı yap.
- Fiziksel stok yalnız referanslı ledger hareketiyle değişir. Rezervasyon fiziksel çıkış değildir. Sevkiyat/finans/fatura işlemleri transaction ve idempotency sınırını korur.
- Yetki sunucuda kontrol edilir; FBO referans kaydı FBS işlemine sokulmaz. Her sorgu/yazma workspace sınırını korur.
- Gerçek Ozon/Paraşüt erişimi ve e-Fatura bu aşamada yok; tüm belgeler DEMO / TASLAK. API anahtarı isteme, doğrulanmamış endpoint yazma.
- Araştırmada gözlem, çıkarım ve bilinmeyeni ayır. Kaynak URL, ref/dosya SHA, erişim tarihi ve uygulama kararını kaydet. Rakip girişini aşma, gizli API/veri arama, GPL kod/şema kopyalama.
- REA referanslarını `docs/research/REA.md` üzerinden kullan. REA kurulmuş/çalıştırılmış gibi davranma; gerçek çıktılar varsa sürüm/komut/kapsamla sakla. Araç bağımlılığını uygulamanın runtime'ına ekleme.
- Secret, DATABASE_URL, cookie, müşteri verisi veya ham kimlik bilgili HAR dosyasını commitleme. Kurgusal veri kullan.
- Commit/push sonrası yalnız doğruladığın sonucu bildir. Vercel otomatik deployment tetiklenmesi READY olduğunun kanıtı değildir.

## Komutlar

`npm ci`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build`, `npm run test:e2e`.

DB testleri ve migration için uygulamaya özel ayrı PostgreSQL gerekir. Üretim DB'sinde toplu test/reset çalıştırma. Kurulum ve alternatif Chromium ayarı README'de.

## 21 Ekim — Tasarım ve kota kararı (güncel yönlendirme)

- Kapsamlı görsel düzenleme UX-01: Aşama 3 sonu / Aşama 4 başında, INV-01 mal kabul-sayım ile FIN-01/DOC-01 ana akışları oturduktan sonra ve QA-01 tam tarayıcı kabulünden önce. Şimdi yalnız kullanımı engelleyen arayüz sorunlarını düzelt; erken kapsamlı yeniden tasarıma başlama. Gerçek Ozon API veya üretim login'i bu demo tasarım turunu bekletme nedeni değildir.
- `vercel.json` içindeki `git.deploymentEnabled=false` tüm dallarda otomatik Git deploy'unu kapatır. Bu ayarı küçük bir değişikliği yayına almak için aç/kapat yapma. GitHub'a kaydetmek canlı yayına almak değildir.
- Birbiriyle ilgili geliştirmeleri ve belgelerini paketle; yerel/izole kontrolleri bitir; yalnız anlamlı ve test edilmiş teslim paketi sonunda tek manuel production deploy yap. Aynı SHA için Git otomatiği + manuel deploy birlikte çalıştırılmaz. Dokümantasyon, test kanıtı, plan ve commit düzeltmesi için ayrı deploy yapılmaz.
- Normal hedef günde en fazla bir planlı toplu yayın; kullanıcının açık ek yayın isteği veya canlıyı bozan acil düzeltme istisnadır. Bu bir çalışma politikasıdır, Vercel hesabı limitini değiştirmez veya zamanlanmış otomasyon oluşturmaz. Diğer projelerin kullanımını kontrol etmeden toplam hesap kotasının çözüldüğünü iddia etme.
- Manuel yayın öncesi son canlı commit ile aday SHA'yı ve aynı SHA için mevcut deploy olup olmadığını kontrol et. Günlük limite takılınca otomatik/tekrarlı retry, başka proje açma veya belgeler için yeni deploy denemesi yapma; kodu GitHub'da koru ve engeli bildir.
- Her teslimde yerel doğrulama, GitHub durumu ve canlı sürümü ayrı söyle. Yayınlanmamış değişiklikler için kullanıcıyı eski canlı ekranda yeni özelliği denemeye gönderme. Yeni canlı kanıtı sonraki çalışma commit'ine kat; salt kanıt yazımı için yeniden yayın çıkarma.
