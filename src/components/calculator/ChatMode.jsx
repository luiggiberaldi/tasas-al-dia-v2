import React, { useState, useRef } from 'react';
import { Send, Mic, Camera, RefreshCcw, Copy, Share2, UserCircle, ShieldCheck } from 'lucide-react';
// import { useChatCalculator } from '../../hooks/useChatCalculator'; // Ya no se usa aquí
import { formatBs, formatUsd } from '../../utils/calculatorUtils';
import { Modal } from '../../components/Modal';
import { AccountSelector } from './AccountSelector';
import { PaymentSummaryChat } from './PaymentSummaryChat';

export const ChatMode = ({ rates, accounts, voiceControl, chatState }) => {
    // Desestructuramos del prop, no del hook
    const { messages, isProcessing, messagesEndRef, handleTextSend, handleImageUpload } = chatState;
    const [input, setInput] = useState('');
    const fileInputRef = useRef(null);

    // Estados para el Modal de compartir
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMsgData, setSelectedMsgData] = useState(null);
    const [selectedAccount, setSelectedAccount] = useState(null);

    const handleShareClick = (data) => {
        setSelectedMsgData(data);
        setSelectedAccount(null);
        setIsModalOpen(true);
    };

    const handlePaymentConfirm = (msg) => {
        navigator.clipboard.writeText(msg);
        alert("¡Mensaje de cobro copiado!");
        setIsModalOpen(false);
    };

    const onSend = () => {
        handleTextSend(input);
        setInput('');
    };

    const handleVoiceInput = () => {
        if (!window.webkitSpeechRecognition) return alert("Usa Chrome");
        const recognition = new window.webkitSpeechRecognition();
        recognition.lang = 'es-419';
        recognition.start();
        recognition.onresult = (e) => handleTextSend(e.results[0][0].transcript);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-hide">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-500`}>
                        {msg.role === 'user' ? (
                            <div className="bg-slate-800 text-white rounded-2xl rounded-tr-none py-3 px-4 max-w-[80%] shadow-lg text-sm font-medium">
                                {msg.type === 'image' && <img src={msg.content} className="rounded-lg mb-2 max-h-40 object-cover" alt="upload" />}
                                <p>{msg.content}</p>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl rounded-tl-none max-w-[85%] shadow-sm overflow-hidden">
                                {msg.type === 'text' && (
                                    <div className="p-4">
                                        <div className="text-sm text-slate-600 dark:text-slate-300 font-medium mb-1">{msg.content}</div>
                                        <div className="flex items-center gap-1 opacity-40">
                                            <ShieldCheck size={10} className="text-emerald-500" />
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Verificado por Auditoría VIP</span>
                                        </div>
                                    </div>
                                )}
                                {msg.type === 'calculation' && (
                                    <div className="min-w-[240px]">
                                        <div className="bg-brand/10 p-3 flex justify-between items-center border-b border-brand/10">
                                            <span className="text-[10px] font-black text-brand-dark uppercase tracking-widest">{msg.data.rateName}</span>
                                        </div>
                                        <div className="p-4 bg-white dark:bg-slate-900">
                                            {msg.data.clientName && <div className="flex items-center gap-1 mb-2 text-xs font-bold text-indigo-500 bg-indigo-50 w-fit px-2 py-0.5 rounded-md"><UserCircle size={12} /> {msg.data.clientName}</div>}
                                            <div className="flex items-baseline gap-2 mb-1">
                                                <span className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">
                                                    {msg.data.targetCurrency.includes('VES') ? formatBs(msg.data.resultAmount) : formatUsd(msg.data.resultAmount)}
                                                </span>
                                                <span className="text-xs font-bold text-slate-400">{msg.data.targetCurrency}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-medium border-t border-slate-100 pt-2 mt-2">
                                                Entrada: {msg.data.originalAmount} {msg.data.originalSource}
                                            </p>
                                        </div>
                                        <div className="p-2 bg-slate-50 dark:bg-slate-800 flex gap-2">
                                            <button onClick={() => navigator.clipboard.writeText(msg.data.resultAmount)} className="flex-1 py-2 bg-white dark:bg-slate-700 rounded-xl shadow-sm text-xs font-bold text-slate-600 hover:text-brand-dark flex items-center justify-center gap-1"><Copy size={14} /> Copiar</button>
                                            <button onClick={() => handleShareClick(msg.data)} className="flex-1 py-2 bg-brand text-slate-900 rounded-xl shadow-sm text-xs font-bold hover:brightness-110 flex items-center justify-center gap-1"><Share2 size={14} /> Enviar</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                {isProcessing && <div className="flex justify-start"><div className="bg-white dark:bg-slate-900 p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex gap-2 items-center"><RefreshCcw size={16} className="animate-spin text-brand" /><span className="text-xs font-bold text-slate-400">Pensando...</span></div></div>}
                <div ref={messagesEndRef} />
            </div>

            {/* Modal de Compartir */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Datos de Pago">
                {!selectedAccount ? (
                    <AccountSelector accounts={accounts} onSelect={setSelectedAccount} />
                ) : (
                    <PaymentSummaryChat
                        selectedAccount={selectedAccount}
                        chatData={selectedMsgData}
                        rates={rates}
                        onBack={() => setSelectedAccount(null)}
                        onConfirm={handlePaymentConfirm}
                    />
                )}
            </Modal>

            {/* Input Area */}
            <div className="px-4 pb-4 pt-2">
                <div className={`flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-[2rem] shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 ring-1 ring-slate-100 dark:ring-slate-800/50 ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                    <button onClick={() => fileInputRef.current.click()} disabled={isProcessing} className="p-3 text-slate-400 hover:text-brand-dark hover:bg-slate-50 rounded-full transition-colors"><Camera size={20} /></button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e.target.files[0])} />
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !isProcessing && onSend()}
                        disabled={isProcessing}
                        placeholder={isProcessing ? "Procesando..." : "Escribe aquí (ej: 100 USDT a BCV)..."}
                        className="flex-1 bg-transparent border-none outline-none px-2 py-3 text-sm font-medium text-slate-800 dark:text-white placeholder-slate-400"
                    />
                    {input.trim() ? (
                        <button onClick={onSend} disabled={isProcessing} className="p-3 bg-brand text-slate-900 rounded-full shadow-md hover:scale-105 transition-transform"><Send size={18} fill="currentColor" /></button>
                    ) : (
                        <button onClick={handleVoiceInput} disabled={isProcessing} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 rounded-full transition-colors"><Mic size={18} /></button>
                    )}
                </div>
            </div>
        </div>
    );
};