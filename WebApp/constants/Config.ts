import Constants from 'expo-constants';

// Se siamo in sviluppo e su dispositivo fisico/emulatore, usiamo l'IP del debugger di Expo
// Altrimenti inserisci qui l'IP fisso del tuo server per la produzione
const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
const DEV_SERVER_IP = debuggerHost ? `http://${debuggerHost}:3000` : 'http://192.168.1.XXX:3000'; // Sostituisci XXX con il tuo IP

export const SERVER_URL = typeof window !== 'undefined' && window.location?.hostname
    ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`
    : DEV_SERVER_IP;
