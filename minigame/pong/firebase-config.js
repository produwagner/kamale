// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyC36Cd4l0ih-tirmFrmMzaVlMGJMH1pdmA",
    authDomain: "kamalegames-581b6.firebaseapp.com",
    databaseURL: "https://kamalegames-581b6-default-rtdb.firebaseio.com",
    projectId: "kamalegames-581b6",
    storageBucket: "kamalegames-581b6.firebasestorage.app",
    messagingSenderId: "632456610407",
    appId: "1:632456610407:web:664ec6e896eeda9eb6cac2"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);

// Inicializa Authentication
var auth = firebase.auth();
var authProvider = new firebase.auth.GoogleAuthProvider();