import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const APP_VERSION = '2.0.0';  // actualizar con cada release
const PRODUCT_ID = 'tasas';

// CLAVE MAESTRA SECRETA (En un entorno real estaría ofuscada o validada en servidor, 
// pero siguiendo la directiva "Offline First" y "Sin Backend", vive aquí).
const MASTER_SECRET_KEY = "VENEZUELA_PRO_2026_GLOBAL";
const DEMO_DURATION_MS = 168 * 60 * 60 * 1000; // 168 horas (7 días)


let supabaseClient = null;
function getSupa() {
    if (!supabaseClient && import.meta.env.VITE_SUPABASE_URL) {
        supabaseClient = createClient(
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_ANON_KEY
        );
    }
    if (!supabaseClient) throw new Error("No supabase");
    return supabaseClient;
}

export function useSecurity() {
    const [deviceId, setDeviceId] = useState('');
    const [isPremium, setIsPremium] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isDemo, setIsDemo] = useState(false);
    const [demoExpires, setDemoExpires] = useState(null);
    const [demoExpiredMsg, setDemoExpiredMsg] = useState('');
    const [demoTimeLeft, setDemoTimeLeft] = useState('');

    // Calcular tiempo restante formateado
    const updateTimeLeft = useCallback((expiresAt) => {
        if (!expiresAt) { setDemoTimeLeft(''); return; }
        const diff = expiresAt - Date.now();
        if (diff <= 0) { setDemoTimeLeft(''); return; }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) setDemoTimeLeft(`${days}d ${hours}h`);
        else if (hours > 0) setDemoTimeLeft(`${hours}h ${mins}m`);
        else setDemoTimeLeft(`${mins}m`);
    }, []);

    useEffect(() => {
        // 1. Obtener o Generar Device ID a través de fingerprinting
        const generateFingerprint = async () => {
            const nav = window.navigator;
            const screen = window.screen;

            const components = [
                nav.userAgent,
                nav.language,
                nav.hardwareConcurrency || 1,
                nav.deviceMemory || 1,
                screen.width,
                screen.height,
                screen.colorDepth,
                new Date().getTimezoneOffset()
            ].join('|');

            if (!window.crypto || !window.crypto.subtle) {
                // Fallback (solo en http sin SSL)
                let hash = 0;
                for (let i = 0; i < components.length; i++) {
                    hash = ((hash << 5) - hash) + components.charCodeAt(i);
                    hash |= 0;
                }
                const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
                return `TASAS-${hex}`;
            }

            // Mismo hardware = mismo hash SHA-256
            const encoder = new TextEncoder();
            const data = encoder.encode(components);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase().substring(0, 8);
            return `TASAS-${hex}`;
        };

        const initDeviceId = async () => {
            let storedId = localStorage.getItem('device_id');
            if (!storedId) {
                storedId = await generateFingerprint();
                localStorage.setItem('device_id', storedId);
            }
            setDeviceId(storedId);
            checkLicense(storedId);
        };

        initDeviceId();
    }, []);

    // Heartbeat silencioso cada 24h + chequeo de revocación
    useEffect(() => {
        if (!isPremium || !deviceId || !import.meta.env.VITE_SUPABASE_URL) return

        // Función de chequeo rápido de estado
        const verifyStatus = async () => {
            try {
                const supa = getSupa();

                const { data: license } = await supa
                    .from('licenses')
                    .select('active, type')
                    .eq('device_id', deviceId)
                    .eq('product_id', PRODUCT_ID)
                    .maybeSingle()

                if (license && license.active === false && isPremium) {
                    // Revocado
                    localStorage.removeItem('premium_token');
                    setIsPremium(false);
                    setIsDemo(false);
                    setDemoExpiredMsg("Tu licencia ha sido desactivada. Contacta al administrador.");
                } else if (license && license.active === true) {
                    // Si el backend difiere del estado local -> recargar
                    const isDemoLocal = localStorage.getItem('premium_token')?.includes('"isDemo":true');
                    const isMismatch = (license.type === 'permanent' && isDemoLocal) ||
                        (license.type === 'demo7' && !isDemoLocal);

                    if (isMismatch) {
                        localStorage.removeItem('premium_token');
                        window.location.reload();
                    } else if (!isPremium) {
                        // Reactivado remotamente -> Recargar para restaurar
                        window.location.reload();
                    }
                }
            } catch (e) { }
        }

        const sendHeartbeat = async () => {
            verifyStatus(); // Chequeo constante
            try {
                const supa = getSupa();
                // Actualizar last_seen
                await supa.from('licenses')
                    .update({ last_seen_at: new Date().toISOString() })
                    .eq('device_id', deviceId)
                    .eq('product_id', PRODUCT_ID)

                // Registrar heartbeat record
                await supa.from('heartbeats').insert({
                    device_id: deviceId,
                    product_id: PRODUCT_ID,
                    app_version: APP_VERSION,
                })
            } catch (e) { }
        }

        // 1. Ejecutar heartbeat completo al montar y cada 4 horas
        sendHeartbeat();
        const heartbeatInterval = setInterval(sendHeartbeat, 4 * 60 * 60 * 1000);

        // 2. Poll de estado cada 1 minuto para revocaciones rápidas
        const statusInterval = setInterval(verifyStatus, 60 * 1000);

        // 3. Revisar apenas el usuario regrese a la app
        const handleVisibility = () => { if (document.visibilityState === 'visible') verifyStatus(); };
        document.addEventListener('visibilitychange', handleVisibility);

        // 4. Supabase Realtime (Si está habilitado en la tabla)
        let subscription = null;
        try {
            const supa = getSupa();
            subscription = supa.channel(`licenses_sync_${deviceId}`)
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'licenses', filter: `device_id=eq.${deviceId}` },
                    (payload) => {
                        verifyStatus(); // Si hay un cambio, verificar inmediatamente
                    }
                )
                .subscribe();
        } catch (e) { }

        return () => {
            clearInterval(heartbeatInterval);
            clearInterval(statusInterval);
            document.removeEventListener('visibilitychange', handleVisibility);
            if (subscription) subscription.unsubscribe();
        }
    }, [isPremium, deviceId])

    // Countdown timer para demo
    useEffect(() => {
        if (!isDemo || !demoExpires) return;
        updateTimeLeft(demoExpires);
        const interval = setInterval(() => {
            const diff = demoExpires - Date.now();
            if (diff <= 0) {
                // Demo expiró en tiempo real
                clearInterval(interval);
                localStorage.removeItem('premium_token');
                setIsPremium(false);
                setIsDemo(false);
                setDemoTimeLeft('');
                setDemoExpiredMsg("Tu licencia temporal ha finalizado. Esperamos que hayas disfrutado la experiencia completa.");
            } else {
                updateTimeLeft(demoExpires);
            }
        }, 60000); // Cada minuto
        return () => clearInterval(interval);
    }, [isDemo, demoExpires, updateTimeLeft]);

    const generateActivationCode = async (devId) => {
        if (!window.crypto || !window.crypto.subtle) {
            console.warn("⚠️ Crypto API no disponible. Usando fallback.");
            let hash = 5381;
            const str = devId + MASTER_SECRET_KEY;
            for (let i = 0; i < str.length; i++) {
                hash = ((hash << 5) + hash) + str.charCodeAt(i);
            }
            const hex = (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
            return `ACTIV-${hex.substring(0, 4)}-${hex.substring(4, 8)}`;
        }

        const encoder = new TextEncoder();
        const data = encoder.encode(devId + MASTER_SECRET_KEY);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
        return `ACTIV-${hashHex.substring(0, 4)}-${hashHex.substring(4, 8)}`;
    };

    const checkLicense = async (currentDeviceId) => {
        let storedToken = localStorage.getItem('premium_token');

        if (!storedToken) {
            // Fallback: verificar si existe licencia activa en Supabase (ej: reactivada remotamente)
            try {
                const supa = getSupa();
                const { data: remoteLicense } = await supa
                    .from('licenses')
                    .select('type, active, expires_at, code')
                    .eq('device_id', currentDeviceId)
                    .eq('product_id', PRODUCT_ID)
                    .maybeSingle();

                if (remoteLicense && remoteLicense.active === true) {
                    const validCode = await generateActivationCode(currentDeviceId);
                    const isTimeLimited = (remoteLicense.type === 'demo7');
                    const expiresAt = remoteLicense.expires_at ? new Date(remoteLicense.expires_at).getTime() : null;

                    if (isTimeLimited && expiresAt) {
                        if (Date.now() < expiresAt) {
                            const token = { code: validCode, expires: expiresAt, isDemo: true };
                            localStorage.setItem('premium_token', JSON.stringify(token));
                            setIsPremium(true);
                            setIsDemo(true);
                            setDemoExpires(expiresAt);
                        }
                        // Si ya expiró, no restaurar
                    } else {
                        // Permanente — restaurar token plano
                        localStorage.setItem('premium_token', validCode);
                        setIsPremium(true);
                        setIsDemo(false);
                    }
                    setLoading(false);
                    return;
                }
            } catch (e) {
                // Sin red — no se puede restaurar, continuar como free
            }

            setIsPremium(false);
            setLoading(false);
            return;
        }

        const validTokenStr = await generateActivationCode(currentDeviceId);
        let confirmedPremium = false;
        let confirmedDemo = false;
        let confirmedExpires = null;

        try {
            const tokenObj = JSON.parse(storedToken);
            if (tokenObj && tokenObj.code && tokenObj.expires) {
                if (tokenObj.code === validTokenStr) {
                    if (Date.now() < tokenObj.expires) {
                        setIsPremium(true);
                        setIsDemo(true);
                        setDemoExpires(tokenObj.expires);
                        confirmedPremium = true;
                        confirmedDemo = true;
                        confirmedExpires = tokenObj.expires;
                    } else {
                        console.warn("Demo Expirada");
                        localStorage.removeItem('premium_token');
                        setIsPremium(false);
                        setIsDemo(false);
                        setDemoExpiredMsg("Tu licencia temporal ha finalizado. Esperamos que hayas disfrutado la experiencia completa.");
                    }
                } else {
                    setIsPremium(false);
                }
            } else {
                setIsPremium(false);
            }
        } catch (e) {
            // Formato string antiguo (Lifetime License)
            if (storedToken === validTokenStr) {
                setIsPremium(true);
                setIsDemo(false);
                confirmedPremium = true;
                confirmedDemo = false;
            } else {
                setIsPremium(false);
            }
        }

        // Migración silenciosa de licencias pre-Supabase
        if (confirmedPremium) {
            const migrateToSupabase = async () => {
                try {
                    const supa = getSupa();

                    // Verificar si ya existe en Supabase
                    const { data: existing } = await supa
                        .from('licenses')
                        .select('id')
                        .eq('device_id', currentDeviceId)
                        .eq('product_id', PRODUCT_ID)
                        .maybeSingle()

                    // Si NO existe, registrarla ahora
                    if (!existing) {
                        await supa.from('licenses').insert({
                            device_id: currentDeviceId,
                            product_id: PRODUCT_ID,
                            type: confirmedDemo ? 'demo7' : 'permanent',
                            active: true,
                            expires_at: confirmedExpires
                                ? new Date(confirmedExpires).toISOString()
                                : null,
                            code: 'MIGRADA-PRESUPABASE',
                            last_seen_at: new Date().toISOString(),
                        })
                    } else {
                        // Si ya existe, solo actualizar last_seen
                        await supa.from('licenses')
                            .update({ last_seen_at: new Date().toISOString() })
                            .eq('device_id', currentDeviceId)
                            .eq('product_id', PRODUCT_ID)
                    }
                } catch (e) {
                    // Silencioso — nunca afecta la app
                }
            }

            migrateToSupabase()  // llamar sin await para no bloquear
        }

        setLoading(false);
    };

    /**
     * Activa la demo de 7 días sin necesidad de código.
     * Solo puede usarse UNA VEZ por dispositivo.
     */
    const activateDemo = async () => {
        // Verificar si ya se usó (local)
        if (localStorage.getItem('demo_used_history')) {
            return { success: false, status: 'DEMO_USED' };
        }

        // Verificar en servidor (por si se borró localStorage)
        try {
            const supa = getSupa();
            const { data: existingDemo } = await supa
                .from('demos')
                .select('id')
                .eq('device_id', deviceId)
                .eq('product_id', PRODUCT_ID)
                .maybeSingle();

            if (existingDemo) {
                localStorage.setItem('demo_used_history', 'true');
                return { success: false, status: 'DEMO_USED' };
            }
        } catch (e) {
            // Sin red → solo validar local
        }

        const validCode = await generateActivationCode(deviceId);
        const expires = Date.now() + DEMO_DURATION_MS;
        const demoToken = {
            code: validCode,
            expires: expires,
            isDemo: true
        };

        localStorage.setItem('premium_token', JSON.stringify(demoToken));
        localStorage.setItem('demo_used_history', 'true');

        setIsPremium(true);
        setIsDemo(true);
        setDemoExpires(expires);

        // Reportar demo a Supabase (silencioso)
        try {
            const supa = getSupa();
            const expiresAt = new Date(expires).toISOString()

            await supa.from('demos').upsert({
                device_id: deviceId,
                product_id: PRODUCT_ID,
                expires_at: expiresAt,
                app_version: APP_VERSION,
            }, { onConflict: 'device_id,product_id' })
        } catch (e) {
            // Nunca bloquear si falla la red
        }

        return { success: true, status: 'DEMO_ACTIVATED' };
    };

    /**
     * Desbloquea con código de activación.
     * Consulta Supabase para determinar si es permanente o temporal (7/30 días).
     */
    const unlockApp = async (inputCode) => {
        const validCode = await generateActivationCode(deviceId);
        if (inputCode.trim().toUpperCase() !== validCode) {
            return { success: false, status: 'INVALID_CODE' };
        }

        // Consultar Supabase para obtener tipo y expiración
        let licenseType = 'permanent';
        let expiresAt = null;
        let lastSeenAt = null;
        try {
            const supa = getSupa();
            const { data } = await supa
                .from('licenses')
                .select('type, expires_at, last_seen_at')
                .eq('device_id', deviceId)
                .eq('product_id', PRODUCT_ID)
                .maybeSingle();

            if (data?.type) licenseType = data.type;
            // Manejo estricto de fechas UTC
            if (data?.expires_at) expiresAt = new Date(data.expires_at).getTime();
            if (data?.last_seen_at) lastSeenAt = data.last_seen_at;
        } catch (e) {
            // Sin red → tratar como permanente (fallback seguro)
        }

        const isTimeLimited = (licenseType === 'demo7');

        if (isTimeLimited) {
            let finalExpiresAt = expiresAt;
            if (!lastSeenAt) {
                finalExpiresAt = Date.now() + 168 * 60 * 60 * 1000;
                try {
                    getSupa().from('licenses').update({ expires_at: new Date(finalExpiresAt).toISOString() })
                        .eq('device_id', deviceId).eq('product_id', PRODUCT_ID).then();
                } catch (e) { }
            }
            if (finalExpiresAt) {
                expiresAt = finalExpiresAt;
                // Guardar como JSON con expiración (mismo formato que demo)
                const token = { code: validCode, expires: expiresAt, isDemo: true };
                localStorage.setItem('premium_token', JSON.stringify(token));
                setIsPremium(true);
                setIsDemo(true);
                setDemoExpires(expiresAt);
                return { success: true, status: 'PREMIUM_ACTIVATED' };
            }
        }

        // Permanente
        localStorage.setItem('premium_token', validCode);
        setIsPremium(true);
        setIsDemo(false);
        return { success: true, status: 'PREMIUM_ACTIVATED' };
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
        activateDemo,
        generateCodeForClient,
        isDemo,
        demoExpires,
        demoTimeLeft,
        demoExpiredMsg,
        dismissExpiredMsg: () => setDemoExpiredMsg(''),
        demoUsed: typeof window !== 'undefined' && localStorage.getItem('demo_used_history') === 'true'
    };
}
