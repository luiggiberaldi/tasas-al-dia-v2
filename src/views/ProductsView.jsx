import React, { useState, useEffect, useRef } from 'react';
import { Package, Plus, Trash2, Camera, X, Store, Tag, Pencil, Banknote, Search, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import { Modal } from '../components/Modal';
import { ProductShareModal } from '../components/ProductShareModal';
import { formatBs, formatUsd } from '../utils/calculatorUtils';
import { useWallet } from '../hooks/useWallet';

export const ProductsView = ({ rates, triggerHaptic }) => {
    const [products, setProducts] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Share State
    const [shareProduct, setShareProduct] = useState(null); // Producto a compartir
    const { accounts } = useWallet();

    // Paginación y Búsqueda
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 8;

    // Form State (Restaurado)
    const [editingId, setEditingId] = useState(null);
    const [name, setName] = useState('');
    const [priceUsdt, setPriceUsdt] = useState('');
    const [image, setImage] = useState(null);
    const fileInputRef = useRef(null);

    // Cargar productos al montar
    useEffect(() => {
        const saved = localStorage.getItem('my_products_v1');
        if (saved) setProducts(JSON.parse(saved));
    }, []);

    // Guardar al cambiar
    useEffect(() => {
        if (products.length > 0) localStorage.setItem('my_products_v1', JSON.stringify(products));
        else localStorage.removeItem('my_products_v1');
    }, [products]);

    // Función comprimir imagen (OPTIMIZADA PDA v1.0: 400x400 WebP 70%)
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 400; // Max 400px

                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Conversión a WebP y compresión 70%
                setImage(canvas.toDataURL('image/webp', 0.7));
            };
        };
    };

    // Lógica de Filtrado y Paginación
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    const paginatedProducts = filteredProducts.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Resetear página al buscar
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handleSave = () => {
        triggerHaptic && triggerHaptic();
        if (!name || !priceUsdt) return alert("Nombre y precio requeridos");

        // Auto-Capitalize
        const formattedName = name.replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase());

        if (editingId) {
            const updatedProducts = products.map(p =>
                p.id === editingId
                    ? { ...p, name: formattedName, priceUsdt: parseFloat(priceUsdt), image: image || p.image }
                    : p
            );
            setProducts(updatedProducts);
        } else {
            const newProduct = {
                id: crypto.randomUUID(),
                name: formattedName,
                priceUsdt: parseFloat(priceUsdt),
                image,
                createdAt: new Date().toISOString()
            };
            setProducts([newProduct, ...products]);
        }
        handleClose();
    };

    const handleEdit = (product) => {
        triggerHaptic && triggerHaptic();
        setEditingId(product.id);
        setName(product.name);
        setPriceUsdt(product.priceUsdt);
        setImage(product.image);
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        triggerHaptic && triggerHaptic();
        if (confirm("¿Borrar producto?")) {
            const clean = products.filter(p => p.id !== id);
            setProducts(clean);
        }
    };

    const handleClose = () => {
        setName(''); setPriceUsdt(''); setImage(null); setEditingId(null); setIsModalOpen(false);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-3 sm:p-6 overflow-hidden">

            {/* Header + Search */}
            <div className="shrink-0 mb-6 space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                            <Store size={26} className="text-brand" /> Catálogo
                        </h2>
                        <p className="text-sm text-slate-400 font-medium ml-1">Mis Productos</p>
                    </div>
                    <button
                        onClick={() => { triggerHaptic && triggerHaptic(); setIsModalOpen(true); }}
                        className="p-3 bg-brand text-slate-900 rounded-2xl shadow-lg shadow-brand/20 hover:scale-105 transition-transform"
                    >
                        <Plus size={24} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar producto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-brand/50 shadow-sm"
                    />
                </div>
            </div>

            {/* Grid Productos */}
            {products.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 space-y-4">
                    <Package size={64} strokeWidth={1} />
                    <p className="text-sm font-medium">No has agregado productos</p>
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-2">
                    <Search size={48} className="opacity-20" />
                    <p className="text-sm">No se encontraron productos</p>
                </div>
            ) : (
                <>
                    <div className="flex-1 overflow-y-auto pb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 scrollbar-hide">
                        {paginatedProducts.map(p => {
                            // --- LÓGICA DE NEGOCIO (CORREGIDA) ---
                            // 1. Monto Real en Bolívares (Precio Base * Tasa USDT)
                            const valBs = p.priceUsdt * rates.usdt.price;

                            // 2. Referencias Oficiales (Monto Bs / Tasa Oficial)
                            const refBcv = valBs / rates.bcv.price;
                            const refEur = valBs / rates.euro.price;

                            return (
                                <div key={p.id} className="bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex gap-4 items-start relative group">
                                    {/* Imagen con Aspect Ratio cuadrado */}
                                    <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl shrink-0 overflow-hidden relative">
                                        {p.image ? (
                                            <img src={p.image} className="w-full h-full object-cover" alt={p.name} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <Tag size={24} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-800 dark:text-white mb-1 leading-tight line-clamp-2 pr-28 h-10">{p.name}</h3>

                                        <div className="flex items-baseline gap-1 mb-2">
                                            <span className="text-xl font-black text-brand-dark">{formatUsd(p.priceUsdt)}</span>
                                            <span className="text-xs font-bold text-slate-400">USDT (Digital)</span>
                                        </div>

                                        {/* Costo Efectivo (Nuevo - Smart Rounding) */}
                                        <div className="flex items-center gap-1.5 mb-3 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg w-fit border border-emerald-100 dark:border-emerald-900/30">
                                            <Banknote size={14} className="text-emerald-600 dark:text-emerald-400" />
                                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                                Efectivo: {(() => {
                                                    const raw = p.priceUsdt * 1.05;
                                                    const decimal = raw - Math.floor(raw);
                                                    const final = decimal < 0.2 ? Math.floor(raw) : Math.ceil(raw);
                                                    return `$${final}`;
                                                })()}
                                            </span>
                                        </div>

                                        {/* Conversiones (Lógica corregida) */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-400">Total Bs:</span>
                                                <span className="font-black text-slate-600 dark:text-slate-200">{formatBs(valBs)} Bs</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] text-slate-400">
                                                <span>Ref. Dolar (BCV):</span>
                                                <span className="font-mono text-slate-500">${formatUsd(refBcv).replace('$', '')}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] text-slate-400">
                                                <span>Ref. Euro (BCV):</span>
                                                <span className="font-mono text-slate-500">€{formatUsd(refEur).replace('$', '').replace('€', '')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Botones de Acción (Edit y Delete) */}
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setShareProduct(p)} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all" title="Compartir Cotización">
                                            <Share2 size={16} />
                                        </button>
                                        <button onClick={() => handleEdit(p)} className="p-2 text-slate-400 hover:text-brand hover:bg-brand/10 dark:hover:bg-brand/10 rounded-xl transition-all">
                                            <Pencil size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Paginación */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 py-4 shrink-0">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                <ChevronLeft size={20} className="text-slate-600 dark:text-slate-400" />
                            </button>
                            <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                                Página {currentPage} de {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                <ChevronRight size={20} className="text-slate-600 dark:text-slate-400" />
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Modal Añadir / Editar */}
            <Modal isOpen={isModalOpen} onClose={handleClose} title={editingId ? "Editar Producto" : "Nuevo Producto"}>
                <div className="space-y-4">
                    {/* Upload */}
                    <div onClick={() => fileInputRef.current.click()} className="h-32 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-brand transition-colors relative overflow-hidden">
                        {image ? <img src={image} className="w-full h-full object-cover" /> : (
                            <>
                                <Camera size={24} className="text-slate-400 mb-2" />
                                <span className="text-xs font-bold text-slate-500">Toca para subir foto</span>
                            </>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                        {image && <button onClick={(e) => { e.stopPropagation(); setImage(null); }} className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full"><X size={12} /></button>}
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold text-slate-400 ml-1 mb-1 block uppercase">Nombre</label>
                            <input
                                value={name} onChange={e => setName(e.target.value)}
                                autoFocus
                                placeholder="Ej: Zapatos Nike"
                                className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-brand/50 capitalize"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 ml-1 mb-1 block uppercase">Precio Base (USDT)</label>
                            <input
                                type="number"
                                value={priceUsdt} onChange={e => setPriceUsdt(e.target.value)}
                                placeholder="0.00"
                                className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-brand/50"
                            />
                        </div>

                        {/* Live Conversion Preview */}
                        {priceUsdt && !isNaN(priceUsdt) && parseFloat(priceUsdt) > 0 && (
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Previsualización</p>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">Total Bs:</span>
                                    <span className="font-black text-slate-700 dark:text-white">{formatBs(parseFloat(priceUsdt) * rates.usdt.price)} Bs</span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-slate-400">
                                    <span>Ref. Dolar (BCV):</span>
                                    <span className="font-mono">${formatUsd((parseFloat(priceUsdt) * rates.usdt.price) / rates.bcv.price).replace('$', '')}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-slate-400">
                                    <span>Ref. Euro (BCV):</span>
                                    <span className="font-mono">€{formatUsd((parseFloat(priceUsdt) * rates.usdt.price) / rates.euro.price).replace('$', '').replace('€', '')}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <button onClick={handleSave} className="w-full bg-brand text-slate-900 py-4 rounded-2xl font-black uppercase tracking-wider shadow-lg shadow-brand/20 active:scale-95 transition-transform">
                        {editingId ? "Actualizar Producto" : "Guardar Producto"}
                    </button>
                </div>
            </Modal>

            {/* Modal COMPARTIR COTIZACIÓN (Nuevo) */}
            <ProductShareModal
                isOpen={!!shareProduct}
                onClose={() => setShareProduct(null)}
                product={shareProduct}
                rates={rates}
                accounts={accounts}
            />
        </div>
    );
};
