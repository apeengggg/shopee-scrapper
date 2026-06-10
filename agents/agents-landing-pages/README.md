# Landing Page Agent

Dashboard untuk mengimpor lead dari `agents-lead-maps`, menyimpan salinan lead di database terpisah, lalu membuat deskripsi bisnis dan draft landing page bilingual Indonesia/English.

## Setup

1. Install dependencies:

```powershell
npm.cmd install
```

2. Copy environment:

```powershell
Copy-Item .env.example .env
```

3. Jalankan PostgreSQL khusus app ini:

```powershell
docker compose up -d postgres
```

4. Generate Prisma client dan migrate database:

```powershell
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
```

5. Pastikan Lead Maps Agent berjalan, default di `http://localhost:3001`.

6. Jalankan app ini di port berbeda:

```powershell
npm.cmd run dev -- -p 3001
```

Dashboard tersedia di `http://localhost:3001`.

## Cara Pakai

- Pilih status source lead dari Lead Maps Agent, lalu klik `Import`.
- Pilih lead lokal dan klik `Generate Draft`.
- Edit deskripsi bilingual, hero copy, layanan, trust points, CTA, dan contact section.
- Klik `Save` untuk menyimpan perubahan draft.

## Catatan

- Generator memakai OpenAI API jika key tersedia dari Console atau `.env`, lalu fallback ke template deterministik jika gagal.
- Preview publik tersedia di `/p/[slug]` setelah draft dipublish.
- Foto landing page memakai template lokal dari `public/template-photos`.
- App ini tidak mengubah database Lead Maps Agent.
- Data kontak, alamat, dan kategori mengikuti data lead yang diimpor. Generator tidak membuat nomor telepon, alamat, testimonial, harga, atau jam buka palsu.
