/**
 * PersistentMemory.js
 * 
 * Gestiona el almacenamiento local de lecciones aprendidas.
 * Estas lecciones se inyectan en el prompt para evitar errores recurrentes.
 */

const STORAGE_KEY = 'tasasaldia_ai_lessons';
const MAX_LESSONS = 10; // Mantener solo las más recientes para no saturar el prompt

export const persistentMemory = {
    /**
     * Guarda una nueva lección basada en una corrección del auditor.
     */
    saveLesson: (query, from, to, expected) => {
        try {
            const lessons = persistentMemory.getLessons();

            const newLesson = {
                timestamp: new Date().toISOString(),
                query: query.substring(0, 50), // Guardamos un fragmento de la pregunta
                pattern: `${from} -> ${to}`,
                expected: expected,
                instruction: `Cuando el usuario pregunte "${query}", el cálculo correcto es de ${from} a ${to} resultando en ${expected}.`
            };

            // Evitar duplicados recientes
            if (lessons.length > 0 && lessons[0].query === newLesson.query) return;

            const updatedLessons = [newLesson, ...lessons].slice(0, MAX_LESSONS);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLessons));
        } catch (e) {
            console.error("Error saving lesson:", e);
        }
    },

    /**
     * Recupera el historial de lecciones para inyectar en el prompt.
     */
    getLessons: () => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    },

    /**
     * Formatea las lecciones para el bloque de texto del prompt.
     */
    getFormattedLessons: () => {
        const lessons = persistentMemory.getLessons();
        if (lessons.length === 0) return "No hay lecciones previas registradas.";

        return lessons.map((l, i) => `${i + 1}. [CASO]: ${l.query} | [CORRECCIÓN]: Operar de ${l.pattern}.`).join('\n');
    }
};
