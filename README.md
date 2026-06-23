# ARIN Resort Bodrum · Operasyon Takip

Misafir İlişkileri departmanı için **mobil öncelikli (mobile-first)**, modern bir günlük operasyon kontrol listesi (Operational Checklist) uygulaması. Saf **HTML + CSS + JavaScript** ile yazılmıştır; build adımı gerektirmez.

## Özellikler

- 📱 **Modern mobil UI/UX** — resort kurumsal kimliğine uygun yeşil/altın tema, dairesel ilerleme göstergesi, dokunmatik dostu kartlar.
- ✅ **Günlük operasyon formu** — Sabah / Öğle / Akşam / Gün Sonu bölümleri, her göreve **not** ekleme.
- 🔄 **Firebase Firestore realtime** — birden fazla cihaz arasında anlık senkronizasyon (`onSnapshot`).
- 🗓️ **Günlük / Haftalık / Aylık** görünümler ve bölüm bazlı tamamlanma oranları.
- 🗂️ **Arşiv** — geçmiş günleri tamamlanma yüzdesiyle listeleme ve açma.
- ✍️ Sorumlu kişi ve departman yöneticisi imza alanları.
- 🟢 **Firebase yapılandırılmazsa** otomatik olarak `localStorage` ile çevrimdışı çalışır.

## Kurulum

1. Bu klasörü statik bir sunucuda yayınlayın (GitHub Pages, Firebase Hosting, Netlify vb.) veya yerelde:
   ```bash
   npx serve .
   ```
   > Not: ES module kullanıldığı için dosyayı `file://` ile değil bir HTTP sunucusu üzerinden açın.

2. **Firebase realtime senkronizasyon** için `firebase-config.js` dosyasını kendi proje bilgilerinizle doldurun:
   ```js
   export const firebaseConfig = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "...",
   };
   ```
   Değerler Firebase Console > **Proje Ayarları > Web Uygulaması** bölümünden alınır.

3. Firestore'da `checklists` koleksiyonu kullanılır. Her gün `YYYY-MM-DD` kimlikli bir dokümanda saklanır.

### Önerilen Firestore güvenlik kuralları (giriş eklerseniz)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /checklists/{date} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Veri Modeli

```
checklists/{YYYY-MM-DD}
  tasks: { "morning:0": { done: true, note: "..." }, ... }
  sign:  { responsible: "...", manager: "..." }
  updatedAt: ISO string
```

Görev anahtarları `bölüm:indeks` biçimindedir; bölüm sırası `app.js` içindeki `TEMPLATE` ile tanımlanır.

## Güvenlik (Safezone)

- Hassas anahtarlar koda gömülmez; `firebase-config.js` boş bırakıldığında uygulama yerel modda çalışır.
- Tüm kullanıcı girdileri ekrana basılmadan önce `escapeHtml` ile temizlenir (XSS koruması).
- Üretim ortamında Firestore'a kimlik doğrulama (Firebase Auth) eklemeniz önerilir.
