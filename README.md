# Kişisel Portfolyo & CV Web Sitesi

Modern, tek sayfalık kişisel özgeçmiş ve portfolyo web sitesi. Next.js 14, TypeScript ve Tailwind CSS ile geliştirilmiştir.

## 🚀 Özellikler

- ✨ Modern ve şık tasarım
- 📱 Tam responsive (mobil uyumlu)
- 🎨 Özelleştirilebilir renk paleti
- ⚡ Hızlı sayfa yükleme
- 🌙 Karanlık tema
- 💫 Yumuşak animasyonlar
- 📄 Tek sayfa yapısı

## 📦 Kurulum

### Gereksinimler

- Node.js 18.17 veya üzeri
- npm veya yarn

### Adımlar

1. Bağımlılıkları yükleyin:

```bash
npm install
```

2. Geliştirme sunucusunu başlatın:

```bash
npm run dev
```

3. Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresini açın.

## 🎨 Kişiselleştirme

Tüm kişisel bilgilerinizi `src/app/page.tsx` dosyasındaki değişkenleri düzenleyerek güncelleyebilirsiniz:

```typescript
const personalInfo = {
  name: "Adınız Soyadınız",
  title: "Ünvanınız",
  bio: "Kısa biyografiniz...",
  email: "email@example.com",
  phone: "+90 555 123 4567",
  location: "Şehir, Ülke",
  github: "https://github.com/kullaniciadiniz",
  linkedin: "https://linkedin.com/in/kullaniciadiniz",
}
```

Ayrıca şunları da güncelleyebilirsiniz:
- `skills` - Teknik yetenekleriniz
- `experiences` - İş deneyimleriniz
- `education` - Eğitim geçmişiniz
- `projects` - Projeleriniz
- `certifications` - Sertifikalarınız

## 🏗️ Proje Yapısı

```
├── src/
│   └── app/
│       ├── globals.css    # Global stiller
│       ├── layout.tsx     # Ana layout
│       └── page.tsx       # Ana sayfa bileşeni
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

## 📝 Scriptler

- `npm run dev` - Geliştirme sunucusunu başlatır
- `npm run build` - Prodüksiyon için derler
- `npm run start` - Prodüksiyon sunucusunu başlatır
- `npm run lint` - Kod kalitesi kontrolü

## 🛠️ Teknolojiler

- [Next.js 14](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Tip güvenliği
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [Lucide React](https://lucide.dev/) - İkon kütüphanesi

## 📄 Lisans

MIT License - İstediğiniz gibi kullanabilirsiniz!


