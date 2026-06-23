// ---------------------------------------------------------------------------
// Firebase yapılandırması
// ---------------------------------------------------------------------------
// Gerçek zamanlı Firestore senkronizasyonu için aşağıdaki değerleri kendi
// Firebase projenizden alıp doldurun (Firebase Console > Proje Ayarları > Web App).
//
// Değerler doldurulmazsa uygulama otomatik olarak "Yerel" moda geçer ve veriler
// tarayıcının localStorage'ında saklanır. Böylece kurulum olmadan da çalışır.
// ---------------------------------------------------------------------------

export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

// Firestore'da verilerin saklanacağı koleksiyon adı.
export const COLLECTION = "checklists";

// Yapılandırmanın geçerli olup olmadığını kontrol eder.
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);
