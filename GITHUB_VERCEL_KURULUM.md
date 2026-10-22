# Marketplace OS — GitHub ve Vercel'e yükleme

Bu ZIP, `package.json`, `package-lock.json`, `src`, `db`, `public`, `tests`, `.github`, `next.config.ts` ve `vercel.json` içeren **gerçek Next.js projesidir**. Ekran görüntülerinden oluşan statik bir prototip değildir. Gizli PostgreSQL parolaları veya `.env.local` dosyası ZIP'e konulmamıştır.

## 1. GitHub

ZIP'i çıkarın, **`marketplace-os-main` klasöründeki dosyaları repository köküne** yükleyin. Ekstra klasör seviyesi oluşturmayın. Var olan repoya yükleme yapıyorsanız yeni branch açıp değişiklikleri gözden geçirin; mevcut şube ve canlı sürümü yanlışlıkla değiştirmeyin.

Komut satırıyla **yeni repoya** örnek:

```bash
cd marketplace-os-main
git init
git add .
git commit -m "UX-04 operational navigation and usability"
git branch -M main
git remote add origin https://github.com/KULLANICI/REPO.git
git push -u origin main
```

Var olan Git reposunda `git init` ve remote ekleme adımlarını tekrar etmeyin. `.env.local`, `node_modules`, `.next`, `.vercel` ve test çıktıları `.gitignore` kapsamındadır.

## 2. Önce teknik kontrol

**Node.js 24** ve ayrı bir PostgreSQL/Neon geliştirme veritabanı hazırlayın. Geliştirme ortamında:

```bash
npm ci
cp .env.example .env.local
# .env.local içine DATABASE_URL ekleyin (repoya push etmeyin)
npm run db:migrate
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

Gerçek DB ve browser E2E testleri için ana README'deki yönergeleri izleyin. `db:migrate` ve demo reset işlemlerini veri barındıran bir üretim veritabanında test amaçlı çalıştırmayın. ZIP'i hazırlayan ortam npm registry DNS erişimi veremediği için tam build sonucu **doğrulanmadı**; bu kontrolleri atlayarak production dağıtımı yapmayın.

## 3. Vercel

1. Vercel'de **Add New → Project → Import Git Repository** üzerinden GitHub reposunu seçin.
2. Framework **Next.js**, Root Directory `/`, Node.js versiyonu **24.x** (Project Settings) olsun.
3. Project Settings → Environment Variables alanına `DATABASE_URL` ekleyin. Production ve Preview için ayrı veritabanı önerilir. `NEXT_PUBLIC_DATABASE_URL` kullanmayın.
4. Vercel'e bağlı veritabanına, doğru bağlantı dizesiyle ve deployment **öncesinde** `npm run db:migrate` uygulayın. Migration build sırasında otomatik yapılmaz.
5. **Dikkat:** Mevcut `vercel.json` içinde `git.deploymentEnabled: false` var. Bu daha önceki yayın kontrol politikasını korur. Dolayısıyla **GitHub'a push yapmak otomatik Vercel deploy'u başlatmaz**.
6. Test ve migration onayından sonra **tek manuel dağıtım** için yerel repo kökünde `npx vercel login`, `npx vercel link`, `npx vercel deploy --prod` kullanılabilir. CLI proje/hesap onayı isteyebilir. Aynı sürüme birden fazla deploy denemeyin.
7. Vercel deployment'ın `READY` durumunu, `/` demo girişini ve `/workspace` operasyon akışını gerçek veri bağlantısıyla doğrulayın.

Bu pakette `vercel.json` otomatik yayın ayarı **değiştirilmemiştir**. Otomatik Git tabanlı yayın özellikle istenirse ayrı bir dağıtım kararı olarak ele alınmalıdır.

## 4. Manuel kalite kontrol

GitHub Actions → **Quality** workflow → **Run workflow** ile bağımsız PostgreSQL, lint, build ve E2E kontrolleri çalıştırılabilir. Bu workflow mevcut tercih doğrultusunda push/PR ile otomatik başlamaz. Önce [UX-04 incelemesi](docs/UX_UI_REVIEW_20261022.md) ve [mevcut test raporu](docs/TEST_REPORT.md) dosyalarını inceleyin.

**Bu teslimde GitHub push veya Vercel production yayını yapılmamıştır.**
