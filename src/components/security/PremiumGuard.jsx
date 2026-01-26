import React, { useState } from 'react';
import { Lock, Copy, Check, Star, Sparkles, Send, Bot, Store, MessageCircle, Database, Calculator } from 'lucide-react'; // [UPDATED imports]
import { useSecurity } from '../../hooks/useSecurity';

export default function PremiumGuard({ children, featureName = "Esta función", isAI = false, isShop = false }) { // [UPDATED]
    const { deviceId, isPremium, loading, unlockApp } = useSecurity();
    const [inputCode, setInputCode] = useState('');
    const [error, setError] = useState(false);
    const [success, setSuccess] = useState(false);
    const [copied, setCopied] = useState(false);

    // Mientras carga el estado de seguridad, mostramos un loader simple o nada
    if (loading) return <div className="p-10 text-center text-slate-400">Verificando licencia...</div>;

    // Si es Premium, renderizamos el contenido protegido
    if (isPremium) return children;

    // Si NO es Premium, mostramos el Paywall
    const handleUnlock = async (e) => {
        e.preventDefault();
        const result = await unlockApp(inputCode);
        if (result) {
            setSuccess(true);
            setError(false);
        } else {
            setError(true);
            if (navigator.vibrate) navigator.vibrate([50, 50, 50]); // [NEW] Haptic Error
            setTimeout(() => setError(false), 2000);
        }
    };

    const copyToClipboard = () => {
        if (typeof window !== 'undefined') {
            navigator.clipboard.writeText(deviceId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const openWhatsApp = () => {
        const message = `Hola! Quiero adquirir una licencia Premium para Mister Cambio. Mi ID de instalación es: ${deviceId}`;
        const url = `https://wa.me/584124051793?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    // [NEW] Configuration Logic
    let title, message, Icon, iconColor, benefits;

    // ESTILO "LIGHT & CLEAN" (Unificado para todas las variantes para evitar peso visual)
    const bgContainer = "bg-white/95"; // Fondo blanco sólido (o muy sutil)
    const containerClasses = "bg-white border border-slate-100 shadow-2xl shadow-slate-200/50"; // Sombra suave, borde sutil

    if (isShop) {
        title = <span>TasasAlDía <span className="text-amber-500">Business</span> 👑</span>;
        message = "Gestiona productos y genera cotizaciones profesionales al instante.";
        Icon = Store;
        iconColor = "text-indigo-600 animate-pulse"; // Indigo para Shop
        benefits = (
            <>
                <BenefitItem icon={<MessageCircle size={15} className="text-green-500" />} text="Cotizaciones para WhatsApp." />
                <BenefitItem icon={<Calculator size={15} className="text-amber-500" />} text="Cálculo Precio Cash (+5%)." />
                <BenefitItem icon={<Database size={15} className="text-blue-500" />} text="Catálogo Offline (Sin Internet)." />
            </>
        );
    } else if (isAI) {
        title = "Asesoría VIP Agotada ⚡";
        message = "Para continuar con análisis precisos y visión ilimitada, activa tu licencia.";
        Icon = Bot;
        iconColor = "text-violet-600 animate-pulse"; // Violeta para AI
        benefits = (
            <>
                <BenefitItem icon={<Sparkles size={15} className="text-violet-600" />} text="Análisis de brecha real" />
                <BenefitItem icon={<Star size={15} className="text-amber-500" />} text="Acceso a Catálogo VIP" />
                <BenefitItem icon={<Check size={15} className="text-green-600" />} text="Soporte Prioritario 24/7" />
            </>
        );
    } else {
        title = <span>Mister Cambio <span className="text-amber-500">Premium</span> 👑</span>;
        message = <span>Acceso exclusivo a <strong>{featureName}</strong> para miembros.</span>;
        Icon = Lock;
        iconColor = "text-amber-500";
        benefits = (
            <>
                <BenefitItem icon={<Sparkles size={15} className="text-purple-600" />} text="Calculadora IA Ilimitada" />
                <BenefitItem icon={<Star size={15} className="text-amber-500" />} text="Catálogo de Productos" />
                <BenefitItem icon={<Check size={15} className="text-green-600" />} text="Soporte Prioritario" />
            </>
        );
    }

    return (
        <div className={`flex flex-col items-center justify-center min-h-[50vh] p-2 text-center`}>
            <div className={`w-full max-w-[320px] sm:max-w-sm rounded-[2rem] p-5 sm:p-6 relative overflow-hidden ${containerClasses}`}>

                {/* Decorative Background Elements (Light & Subtle) */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>

                {/* Icon & Title */}
                <div className="mb-4 relative z-10">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 bg-slate-50 border border-slate-100 shadow-sm">
                        <Icon className={iconColor} size={28} strokeWidth={2} />
                    </div>
                    <h2 className="text-xl font-black mb-2 tracking-tight text-slate-900 leading-tight">
                        {title}
                    </h2>
                    <p className="text-xs sm:text-sm font-medium leading-normal text-slate-500 px-2">
                        {message}
                    </p>
                </div>

                {/* Benefits */}
                <div className="space-y-2 mb-6 text-left relative z-10 px-2">
                    {benefits}
                </div>

                {/* Device ID Section */}
                <div className="bg-slate-50 rounded-xl p-3 mb-5 border border-slate-100">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-bold">Tu ID de Instalación</p>
                    <div className="flex items-center justify-between gap-2">
                        <code className="text-base font-mono font-bold text-slate-900 tracking-wider">
                            {deviceId}
                        </code>
                        <button
                            onClick={copyToClipboard}
                            className="p-1.5 bg-white hover:scale-105 shadow-sm border border-slate-100 rounded-lg transition-all text-slate-400 hover:text-amber-500"
                            title="Copiar ID"
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>

                {/* CTA Button */}
                <button
                    onClick={openWhatsApp}
                    className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 mb-4 transition-all shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5 active:scale-95 text-sm"
                >
                    <Send size={18} fill="white" />
                    <span>Solicitar Licencia</span>
                </button>

                {/* Activation Form */}
                <form onSubmit={handleUnlock} className="border-t border-slate-100 pt-4">
                    <p className="text-[10px] text-slate-400 mb-2 font-bold uppercase tracking-wide">Código de Activación</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={inputCode}
                            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                            placeholder="XP-CODE"
                            className={`flex-1 bg-white border ${error ? 'border-red-500' : 'border-slate-200'} rounded-xl px-3 py-2 text-center font-mono text-xs font-bold tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all uppercase placeholder:text-slate-300 shadow-sm`}
                        />
                        <button
                            type="submit"
                            className="bg-slate-900 text-white font-bold px-4 rounded-xl text-xs hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
                        >
                            <Check size={16} strokeWidth={3} />
                        </button>
                    </div>
                    {error && <p className="text-[10px] text-red-500 mt-2 font-bold animate-pulse">Código inválido.</p>}
                    {success && <p className="text-[10px] text-green-500 mt-2 font-bold">¡Activado!</p>}
                </form>

            </div>
        </div>
    );
}

function BenefitItem({ icon, text }) {
    return (
        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-700">
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-white border border-slate-100 shadow-sm">
                {icon}
            </div>
            <span>{text}</span>
        </div>
    );
}
