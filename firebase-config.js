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
  apiKey: "AIzaSyBSVNaXDKLqr0t7ShmwWguzcgtj8c2l-4Y",
  authDomain: "arinchecklist.firebaseapp.com",
  databaseURL: "https://arinchecklist-default-rtdb.firebaseio.com",
  projectId: "arinchecklist",
  storageBucket: "arinchecklist.firebasestorage.app",
  messagingSenderId: "1034107230641",
  appId: "1:1034107230641:web:b807728e1fdcedd88c8590",
  measurementId: "G-BDV4FLCVY4",
};

// Firestore'da verilerin saklanacağı koleksiyon adı.
export const COLLECTION = "checklists";

// Yapılandırmanın geçerli olup olmadığını kontrol eder.
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);
