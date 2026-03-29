// تهيئة Firebase باستخدام مكتبة الإصدار 8 المحمّلة عبر CDN في index.html
// تعتمد على الكائن global `firebase` الذي توفره السكربتات:
// https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js
// https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js

(function () {
  var firebaseConfig = {
    apiKey: "AIzaSyACGmE9_WItkjojDL7ZAYbVK3EoC-pvnVs",
    authDomain: "graduate-system-1faca.firebaseapp.com",
    projectId: "graduate-system-1faca",
    storageBucket: "graduate-system-1faca.firebasestorage.app",
    messagingSenderId: "845497628542",
    appId: "1:845497628542:web:e99e212931654541afa52f",
    measurementId: "G-4LEVCM6XGF"
  };

  if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded. تأكد من وجود سكربتات firebase في index.html قبل هذا الملف.');
    return;
  }

  firebase.initializeApp(firebaseConfig);

  try {
    // إنشاء مرجع عام لقاعدة بيانات Firestore يمكن استخدامه في app.js
    window.db = firebase.firestore();
  } catch (e) {
    console.error('تعذّرت تهيئة Firestore. تحقق من تمكين خدمة Firestore في لوحة Firebase.', e);
  }
})();