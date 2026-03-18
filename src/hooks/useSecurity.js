import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../core/supabaseClient';

const APP_VERSION = '2.0.1';  // actualizar con cada release
const PRODUCT_ID = 'tasas';
const MIGRATION_VERSION = 'v2.0.1'; // Cambiar para forzar re-migración en clientes atascados

// CLAVE MAESTRA SECRETA (En un entorno real estaría ofuscada o validada en servidor, 
// pero siguiendo la directiva "Offline First" y "Sin Backend", vive aquí).
const DEMO_DURATION_MS = 168 * 60 * 60 * 1000; // 168 horas (7 días)

// --- Force-clear stuck migrations on version change ---
(function() {
  const lastMigVer = localStorage.getItem('license_migration_ver');
  if (lastMigVer !== MIGRATION_VERSION) {
    // Si la versión de migración cambió, limpiar flags para forzar reintento
    const currentStatus = localStorage.getItem('license_migrated');
    if (currentStatus === 'skip') {
      localStorage.removeItem('license_migrated');
    }
    localStorage.setItem('license_migration_ver', MIGRATION_VERSION);
  }
})();


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
                return `RVRS-${hex}`;
            }

            // Mismo hardware = mismo hash SHA-256
            const encoder = new TextEncoder();
            const data = encoder.encode(components);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase().substring(0, 8);
            return `RVRS-${hex}`;
        };

        const initDeviceId = async () => {
            let storedId = localStorage.getItem('device_id');
            if (!storedId) {
                storedId = await generateFingerprint();
                localStorage.setItem('device_id', storedId);
            }
            setDeviceId(storedId);

            // Auto-registro: registrar dispositivo si no existe (sin importar licencia)
            try {
                if (import.meta.env.VITE_SUPABASE_URL) {
                    const clientName = localStorage.getItem('business_name') || '';
                    await supabase.rpc('auto_register_device', { p_device_id: storedId, p_product_id: PRODUCT_ID, p_client_name: clientName });
                }
            } catch (e) { /* silencioso */ }

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
                const { data: license, error } = await supabase
                    .from('licenses')
                    .select('type, active, expires_at')
                    .eq('device_id', deviceId)
                    .eq('product_id', PRODUCT_ID)
                    .maybeSingle();

                if (license && license.active === false && isPremium) {
                    // Revocado desde Estación Maestra
                    localStorage.removeItem('premium_token');
                    setIsPremium(false);
                    setIsDemo(false);
                    setDemoExpiredMsg("Tu licencia ha sido desactivada. Contacta al administrador.");
                } else if (license && license.active === true) {
                    // Verificar si demo venció por fecha
                    if (license.type === 'demo7' && license.expires_at) {
                        const expiresAt = new Date(license.expires_at).getTime();
                        if (Date.now() >= expiresAt && isPremium) {
                            localStorage.removeItem('premium_token');
                            setIsPremium(false);
                            setIsDemo(false);
                            setDemoExpiredMsg("Tu licencia temporal ha finalizado. Esperamos que hayas disfrutado la experiencia completa.");
                            return;
                        }
                    }

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
                // Actualizar last_seen
                const clientName = localStorage.getItem('business_name') || '';
                await supabase.rpc('heartbeat_device', { p_device_id: deviceId, p_product_id: PRODUCT_ID, p_client_name: clientName });
            } catch (e) { }
        };

        universalPing();
        const interval = setInterval(universalPing, 15 * 60 * 1000);
        return () => clearInterval(interval);
    }, [deviceId]);

    // Demo heartbeat: update last_seen_at on demos table
    useEffect(() => {
        if (!isDemo || !deviceId || !import.meta.env.VITE_SUPABASE_URL) return;

        const sendDemoHeartbeat = async () => {
            try {
                await supabase.from('demos')
                    .update({ last_seen_at: new Date().toISOString() })
                    .eq('device_id', deviceId)
                    .eq('product_id', PRODUCT_ID);
            } catch (e) { }
        };

        sendDemoHeartbeat();
        const interval = setInterval(sendDemoHeartbeat, 15 * 60 * 1000); // cada 15 min
        return () => clearInterval(interval);
    }, [isDemo, deviceId]);

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

    const checkLicense = async (currentDeviceId) => {
        let storedToken = localStorage.getItem('premium_token');

        if (!storedToken) {
            // Fallback: verificar si existe licencia activa en Supabase (ej: reactivada remotamente)
            try {
                const { data: remoteLicense, error } = await supabase
                    .from('licenses')
                    .select('type, active, expires_at')
                    .eq('device_id', currentDeviceId)
                    .eq('product_id', PRODUCT_ID)
                    .maybeSingle();

                if (remoteLicense && remoteLicense.active === true) {
                    const isTimeLimited = (remoteLicense.type === 'demo7');
                    const expiresAt = remoteLicense.expires_at ? new Date(remoteLicense.expires_at).getTime() : null;

                    if (isTimeLimited && expiresAt) {
                        if (Date.now() < expiresAt) {
                            const token = { deviceId: currentDeviceId, type: 'demo7', expires: expiresAt };
                            localStorage.setItem('premium_token', JSON.stringify(token));
                            setIsPremium(true);
                            setIsDemo(true);
                            setDemoExpires(expiresAt);
                        }
                        // Si ya expiró, no restaurar
                    } else {
                        // Permanente — restaurar token plano
                        const token = { deviceId: currentDeviceId, type: 'permanent' };
                        localStorage.setItem('premium_token', JSON.stringify(token));
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

        let confirmedPremium = false;
        let confirmedDemo = false;
        let confirmedExpires = null;

        try {
            const tokenObj = JSON.parse(storedToken);
            if (tokenObj && tokenObj.deviceId === currentDeviceId) {
                // Token belongs to this device
                const isTimeLimited = tokenObj.type === 'demo7' || tokenObj.isDemo; // retrocompatibilidad
                if (isTimeLimited) {
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
                    // Permanente
                    setIsPremium(true);
                    setIsDemo(false);
                    confirmedPremium = true;
                }
            } else {
                setIsPremium(false);
            }
        } catch (e) {
            // Unparseable token or old string format (Lifetime License legacy)
            // If it's the old flat string token, we must force re-validation via Edge Function
            // since we don't have the secret to validate it locally anymore.
            // For now, fail safely (user will need to re-enter code, or Edge Function will be called)
            setIsPremium(false);
        }

        // Migración silenciosa de licencias pre-Supabase (solo una vez)
        if (confirmedPremium && !localStorage.getItem('license_migrated')) {
            const migrateToSupabase = async () => {
                try {
                    // Verificar si ya existe en Supabase
                    const { data: existing, error: selectErr } = await supabase
                        .from('licenses')
                        .select('id')
                        .eq('device_id', currentDeviceId)
                        .eq('product_id', PRODUCT_ID)
                        .maybeSingle()

                    if (selectErr) {
                        // Sin red o error de RLS — no reintentar
                        localStorage.setItem('license_migrated', 'skip');
                        return;
                    }

                    if (!existing) {
                        const { error: insertErr } = await supabase.from('licenses').insert({
                            device_id: currentDeviceId,
                            product_id: PRODUCT_ID,
                            type: confirmedDemo ? 'demo7' : 'permanent',
                            active: true,
                            status: 'active',
                            expires_at: confirmedExpires
                                ? new Date(confirmedExpires).toISOString()
                                : null,
                            code: 'MIGRADA-PRESUPABASE',
                            last_seen_at: new Date().toISOString(),
                        })

                        if (insertErr) {
                            console.warn('[Migración] Insert falló, no se reintentará:', insertErr.message);
                        }
                    } else {
                        // Si ya existe, solo actualizar last_seen
                        await supabase.from('licenses')
                            .update({ last_seen_at: new Date().toISOString() })
                            .eq('device_id', currentDeviceId)
                            .eq('product_id', PRODUCT_ID)
                    }

                    // Marcar como migrado para no reintentar NUNCA MÁS
                    localStorage.setItem('license_migrated', 'done');
                } catch (e) {
                    // Error de red — NO marcar, así reintenta en la próxima apertura
                    console.warn('[Migración] Sin red, se reintentará en la próxima apertura');
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
            const { data: existingDemo } = await supabase
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

        const expires = Date.now() + DEMO_DURATION_MS;
        const demoToken = {
            deviceId: deviceId,
            type: 'demo7',
            expires: expires,
        };

        localStorage.setItem('premium_token', encodeToken(JSON.stringify(demoToken)));
        localStorage.setItem('demo_used_history', 'true');

        setIsPremium(true);
        setIsDemo(true);
        setDemoExpires(expires);

        // Reportar demo a Supabase (silencioso)
        try {
            const expiresAt = new Date(expires).toISOString()

            // 1. Registrar en tabla demos
            await supabase.from('demos').upsert({
                device_id: deviceId,
                product_id: PRODUCT_ID,
                expires_at: expiresAt,
                app_version: APP_VERSION,
            }, { onConflict: 'device_id,product_id' })

            // 2. Actualizar registro en licenses (upgrade de 'registered' a 'demo7')
            await supabase.from('licenses').upsert({
                device_id: deviceId,
                product_id: PRODUCT_ID,
                type: 'demo7',
                active: true,
                code: 'DEMO-ACTIVATED',
                expires_at: expiresAt,
                last_seen_at: new Date().toISOString(),
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
        try {
            const cleanCode = (inputCode || "").trim();
            // Validar el código directamente contra la base de datos para saltar fallos en las Edge Functions
            const { data: license, error } = await supabase
                .from('licenses')
                .select('type, active, expires_at, code')
                .eq('device_id', deviceId)
                .eq('product_id', PRODUCT_ID)
                .maybeSingle();

            if (error || !license || license.code !== cleanCode) {
                return { success: false, status: 'INVALID_CODE' };
            }

            const { type, active, expires_at } = license;
            
            if (!active) {
                return { success: false, status: 'LICENSE_REVOKED' };
            }

            const isTimeLimited = (type === 'demo7');
            let expiresAt = expires_at ? new Date(expires_at).getTime() : null;

            if (isTimeLimited) {
                if (!expiresAt) {
                    expiresAt = Date.now() + 168 * 60 * 60 * 1000;
                    try {
                        supabase.from('licenses').update({ expires_at: new Date(expiresAt).toISOString() })
                            .eq('device_id', deviceId).eq('product_id', PRODUCT_ID).then();
                    } catch (e) { console.warn('PWA: Error updating time limited license exp', e); }
                }

                const token = { deviceId, code: inputCode, type: 'demo7', expires: expiresAt };
                localStorage.setItem('premium_token', encodeToken(JSON.stringify(token)));
                setIsPremium(true);
                setIsDemo(true);
                setDemoExpires(expiresAt);
                return { success: true, status: 'PREMIUM_ACTIVATED' };
            }

            // Permanente
            const token = { deviceId, code: inputCode, type: 'permanent' };
            localStorage.setItem('premium_token', encodeToken(JSON.stringify(token)));
            setIsPremium(true);
            setIsDemo(false);
            return { success: true, status: 'PREMIUM_ACTIVATED' };
            
        } catch (err) {
            console.error('Error validating license:', err);
            return { success: false, status: 'SERVER_ERROR' };
        }
    };

    /**
     * Ya no se generan códigos en cliente.
     */
    const generateCodeForClient = async () => null;

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
