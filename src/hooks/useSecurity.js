import { useState, useEffect } from 'react';

// CLAVE MAESTRA SECRETA (En un entorno real estaría ofuscada o validada en servidor, 
// pero siguiendo la directiva "Offline First" y "Sin Backend", vive aquí).
const MASTER_SECRET_KEY = "VENEZUELA_PRO_2026_GLOBAL";

export function useSecurity() {
    const [deviceId, setDeviceId] = useState('');
    const [isPremium, setIsPremium] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Obtener o Generar Device ID
        let storedId = localStorage.getItem('device_id');
        if (!storedId) {
            // Generar ID formato TASAS-XXXX
            const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
            storedId = `TASAS-${randomPart}`;
            localStorage.setItem('device_id', storedId);
        }
        setDeviceId(storedId);

        // 2. Verificar Licencia
        checkLicense(storedId);
    }, []);

    const generateActivationCode = async (devId) => {
        // Genera el hash SHA-256 de (deviceId + SECRET)
        const encoder = new TextEncoder();
        const data = encoder.encode(devId + MASTER_SECRET_KEY);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

        // Tomamos los primeros 8 caracteres para que sea fácil de escribir
        return `ACTIV-${hashHex.substring(0, 4)}-${hashHex.substring(4, 8)}`;
    };

    const checkLicense = async (currentDeviceId) => {
        const storedToken = localStorage.getItem('premium_token');

        if (!storedToken) {
            setIsPremium(false);
            setLoading(false);
            return;
        }

        // Validar si el token guardado coincide con el esperado para este device
        const validToken = await generateActivationCode(currentDeviceId);

        if (storedToken === validToken) {
            setIsPremium(true);
        } else {
            setIsPremium(false); // Token inválido o de otro dispositivo
        }
        setLoading(false);
    };

    const unlockApp = async (inputCode) => {
        // Esperamos que el código ingresado coincida con lo que generamos nosotros
        const validCode = await generateActivationCode(deviceId);

        if (inputCode.trim().toUpperCase() === validCode) {
            localStorage.setItem('premium_token', validCode);
            setIsPremium(true);
            return true;
        }
        return false;
    };

    /**
     * Solo para el panel de admin: Genera el código para un CLIENTE (otro ID)
     */
    const generateCodeForClient = async (clientDeviceId) => {
        return await generateActivationCode(clientDeviceId);
    };

    return {
        deviceId,
        isPremium,
        loading,
        unlockApp,
        generateCodeForClient
    };
}
