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

        // Estrategia de Selección de Voz CONSISTENTE (Prioridad Google)
        // Buscamos voces de Google primero para que suene igual en Chrome PC y Android
        let selectedVoice =
            voices.find(v => v.name === 'Google español de Estados Unidos') ||
            voices.find(v => v.name === 'Google español') ||
            voices.find(v => v.lang === 'es-US' && v.name.includes('Google')) ||
            voices.find(v => v.name.includes('Microsoft Raul')) || // Fallback Windows
            voices.find(v => v.lang === 'es-MX') ||
            voices.find(v => v.lang === 'es-419');

        if (selectedVoice) utterance.voice = selectedVoice;

        utterance.pitch = 0.9; // Tono ligeramente más grave (profesional)
        utterance.rate = 1.1;  // Un poco más rápido y fluido

        window.speechSynthesis.speak(utterance);
    }, [voiceEnabled, voices]);

    return { voiceEnabled, setVoiceEnabled, speak };
};