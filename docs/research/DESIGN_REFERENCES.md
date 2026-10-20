# UI-01 — Tasarım kaynakları ve kararlar

21 Ekim 2026. Kullanıcı talebi: demo niteliği sıradan UI için gerekçe olmasın; açık kaynak repo araştırması yap, Demo Merkezi ve çalışma ekranı ayrı görülebilsin, tek iş bitince kullanıcı kontrolüne sun.

## İncelenen birincil kaynaklar

| Kaynak | Okunan dosya ve gözlem | Marketplace OS kararı |
| --- | --- | --- |
| [Tabler](https://github.com/tabler/tabler) | `preview/pages/sign-in-cover.astro`: giriş işlemi BaseLayout içinde ayrı form/cover kolonları; büyük ekranda görev alanı ayrımı | Beyaz görev/rol formu ile lacivert ürün bağlamı ayrı; kendimize ait CSS/React. Fotoğraf, logo, Bootstrap veya şablon kodu alınmadı |
| Tabler | `preview/pages/layout-condensed.astro`: ortak layout'a başlık, önbaşlık, header action slotu | Operatör ekranındaki işlem başlığı ve eylemleri koru; tanıtım çalışma alanına yayılmasın |
| [Medusa](https://github.com/medusajs/medusa) | `components/layout/public-layout/public-layout.tsx`: public layout document title ve outlet; `shell/shell.tsx`: sidebar/topbar/breadcrumb/ana içerik sınırları | `/` public Demo Merkezi, `/workspace` operasyon kabuğu. Root ekranı Recharts/workspace bileşenini doğrudan yüklemez |
| Medusa | `routes/login/login.tsx`: giriş ve önceki hedefe dönüş ayrı; provider/MFA/SSO akışları var | Yalnız yerel ve role uygun bölüm kimliğine dönüş; gerçek kullanıcı auth varmış gibi login formu yapılmaz |

Dosya URL/ref/blob SHA ve özgün bulgu/karar kayıtları: [design-sources.json](design-sources.json). Kaynaklar branch'ten ayrı okumalarla alındı; ortak commit snapshot'ı olduğu iddia edilmez. Bu inceleme statik kaynak okumasıdır; tam UX audit'i veya rakip runtime ölçümü değildir. REA yöntemi gibi gözlem/çıkarım/bilinmeyen ayrımı korunur; REA CLI/MCP bu görevde çalıştırılmadı.

## Lisans sınırı

Tabler LICENSE MIT. Medusa **open-core**: LICENSE, ENTERPRISE-LICENSE.md kapsamı dışında MIT; Enterprise RBAC/SSO dosyaları ayrı ticari lisans kapsamındadır. İki lisans belgesi de okundu; Medusa'nın tüm reposu koşulsuz MIT diye sunulmaz. Burada hiçbir dış kod, stil, fotoğraf, logo veya Enterprise uygulaması projeye kopyalanmadı; yalnız genel yerleşim/akış ilkelerinden özgün uygulama kararı çıkarıldı. Ek UI framework veya ücretli bağımlılık kurulmadı.

## Bu teslimatın tasarımı

- **Demo Merkezi:** ürün bağlamı, dört iş adımı, role göre değişen görev açıklaması, başlangıç ekranı ve tek bir birincil giriş eylemi. Rastgele sayaç/göstermelik finans grafiği yok.
- **Çalışma ekranı:** mevcut gerçek demo kayıtlarıyla operasyon; merkez tanıtımı tekrar gösterilmez. Üst çubukta merkeze dönüş, döndüğünde aynı bölüme devam.
- **Renk ve yoğunluk:** düz lacivert, mavi, beyaz, nötr zemin; 4–7px köşe; 1px ayırıcılar; kompakt görev satırları; animasyon dekoru/gradyan yok.
- **Rol akışı:** yönetici → Operasyon Merkezi; depo → Hazırlama Masası; muhasebe → Fatura Merkezi. Kullanıcı izinli başka bir başlangıç seçebilir. Mutasyon yetkileri sunucuda kalır.
- **Açık oturum:** mevcut alana devam veya aynı alanda demo rolü değiştirme. Alanı sıfırlama işlemi bu ekranda bulunmaz. Cookie/session güvenlik davranışı değiştirilmedi.
- **Gerçek kullanıcı girişi:** SYS-01 kapsamında bekliyor. Yeni çalışma URL'si üretim hesabı veya Ozon canlı bağlantısı anlamına gelmez.

## Sınırlar ve sonraki kontrol

Bu görev tüm ERP ekranlarının görsel yeniden tasarımı değildir; giriş/çalışma ayrımıdır. Tabloların tümü yeniden düzenlenmedi. Gerçek kullanıcılarla kullanılabilirlik çalışması, cihaz testi ve kapsamlı UI regresyonu henüz yok. Kullanıcıdan üç kontrol istenir: rol ve başlangıç seçimi; çalışma ekranından merkeze dönüşte kayıtların korunması; masaüstünde alanların okunurluğu/geçiş.

FX-01 ayrı finans görevidir; bu UI teslimatında günlük kur veya TL/EUR/RUB dönüşümü yapılmış sayılmaz.
