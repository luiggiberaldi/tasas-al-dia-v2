import { useState, useCallback, useEffect, useRef } from 'react';

export const useSpeech = () => {
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [voices, setVoices] = useState([]);
    const voicesLoaded = useRef(false);

    // Cargar voces dinámicamente (Chrome/Android a veces tardan)
    useEffect(() => {
        const loadVoices = () => {
            const availVoices = window.speechSynthesis.getVoices();
            if (availVoices.length > 0) {
                setVoices(availVoices);
                voicesLoaded.current = true;
            }
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
        return () => { window.speechSynthesis.onvoiceschanged = null; };
    }, []);

    const speak = useCallback((text) => {
        if (!voiceEnabled || !window.speechSynthesis) return;

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);

        // Estrategia de Selección de Voz LATINA MASCULINA (Prioridad)
        // 1. Microsoft Raul - Spanish (Mexico) -> Nativo Windows MASCULINO
        // 2. Google Español de Estados Unidos -> Suele ser neutra buena
        // 3. Sabina (Mujer) como fallback de alta calidad si no hay Raul
        let selectedVoice = voices.find(v => v.name.includes('Microsoft Raul')) ||
            voices.find(v => v.name === 'Google Español de Estados Unidos') ||
            voices.find(v => v.lang === 'es-MX') ||
            voices.find(v => v.lang === 'es-419') ||
            voices.find(v => v.lang === 'es-US');

        if (selectedVoice) utterance.voice = selectedVoice;

        utterance.pitch = 0.9; // Tono ligeramente más grave (profesional)
        utterance.rate = 1.1;  // Un poco más rápido y fluido

        window.speechSynthesis.speak(utterance);
    }, [voiceEnabled, voices]);

    return { voiceEnabled, setVoiceEnabled, speak };
};