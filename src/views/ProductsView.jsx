import React, { useState, useEffect } from 'react';
import { storageService } from '../utils/storageService';
import { Package, Plus, Trash2, Search, ChevronLeft, ChevronRight, Settings, ArrowLeftRight, Globe } from 'lucide-react';
import { Modal } from '../components/Modal';
import { ProductShareModal } from '../components/ProductShareModal';
import SettingsModal from '../components/SettingsModal';
import ShareInventoryModal from '../components/ShareInventoryModal';
import { formatBs, smartCashRounding } from '../utils/calculatorUtils';
import { useWallet } from '../hooks/useWallet';
import { useBusinessCurrency } from '../hooks/useBusinessCurrency';
import { CURRENCIES, getEffectiveUsdtRate } from '../utils/currencyUtils';

// Extracted components & hook
import { useProductForm } from '../hooks/useProductForm';
import { RateConfigPanel } from '../components/products/RateConfigPanel';
import { ProductCard } from '../components/products/ProductCard';
import { ProductFormModal } from '../components/products/ProductFormModal';

export const ProductsView = ({ rates, triggerHaptic }) => {
    const [products, setProducts] = useState([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);

    // MARKET LOGIC — Street Rate
    const [streetRate, setStreetRate] = useState(() => {
        const saved = localStorage.getItem('street_rate_bs');
        return saved ? parseFloat(saved) : 0;
    });
    const [streetPriceInput, setStreetPriceInput] = useState('');

    // MANUAL USDT RATE LOGIC
    const [useAutoUsdt, setUseAutoUsdt] = useState(() => {
        const saved = localStorage.getItem('catalog_use_auto_usdt');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [customUsdtPrice, setCustomUsdtPrice] = useState(() => {
        const saved = localStorage.getItem('catalog_custom_usdt_price');
        return saved && parseFloat(saved) > 0 ? saved : '';
    });
    const [showCashPrice, setShowCashPrice] = useState(() => {
        const saved = localStorage.getItem('catalog_show_cash_price');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    // Share State
    const [shareProduct, setShareProduct] = useState(null);
    const { accounts } = useWallet();
    const { mainCurrency, parityMode } = useBusinessCurrency();

    // Calculamos la tasa USDT actual respetando el estado de React en vivo
    const computedUsdtRate = useAutoUsdt
        ? (rates?.usdt?.price ?? 0)
        : (parseFloat(customUsdtPrice) || (rates?.usdt?.price ?? 0));

    // TASA DISPLAY — para badge y campo configuración
    // Cambia según moneda de trabajo y paridad
    const activeBaseRate = parityMode ? computedUsdtRate : ({
        USDT: computedUsdtRate,
        USD_BCV: rates?.bcv?.price ?? 0,
        EUR_BCV: rates?.euro?.price ?? 0,
    }[mainCurrency] ?? rates?.usdt?.price ?? 0);

    // TASA EFECTIVO — para cálculo de precio en calle
    // NUNCA cambia. Siempre USDT.
    const effectiveUsdtRate = computedUsdtRate;

    // Dynamic labels based on active business currency
    const rateFieldLabel = parityMode
        ? 'Tasa USDT Base'
        : ({
            USDT: 'Tasa USDT Base',
            USD_BCV: 'Tasa Dólar Base',
            EUR_BCV: 'Tasa Euro Base',
        }[mainCurrency] ?? 'Tasa Base');

    const cashSectionLabel = 'Precios en Efectivo';
    const cashSectionDescription = 'Muestra el precio en efectivo calibrado a la tasa de calle.';
    const streetRateLabel = 'Precio en Calle (Bs)';
    const effectivePriceUnit = 'USDT';

    // Paginación y Búsqueda
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 8;

    // Product Form Hook (CRUD + pricing parity)
    const form = useProductForm({ rates, mainCurrency, effectiveUsdtRate, streetRate, triggerHaptic });

    // --- EFFECTS ---

    // Initial Load (Asynchronous with localforage)
    useEffect(() => {
        let isMounted = true;
        const loadProducts = async () => {
            const saved = await storageService.getItem('my_products_v1', []);
            if (isMounted) {
                setProducts(saved);
                setIsLoadingProducts(false);
            }
        };
        loadProducts();
        return () => { isMounted = false; };
    }, []);

    // FIX: Detectar teclado y hacer scroll al input activo (Mobile Safari/Chrome)
    useEffect(() => {
        const handleResize = () => {
            // Si el viewport se reduce más de 150px asumimos que el teclado subió
            const isKeyboardOpen = window.visualViewport
                ? window.visualViewport.height < window.innerHeight - 150
                : false;

            if (isKeyboardOpen && document.activeElement) {
                // Esperar un frame para que el DOM se estabilice
                setTimeout(() => {
                    document.activeElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                    });
                }, 100);
            }
        };

        // Usar visualViewport API — más precisa que resize event normal
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleResize);
            return () => {
                window.visualViewport.removeEventListener('resize', handleResize);
            };
        }
    }, []);

    // Set Initial Street Rate if not set
    useEffect(() => {
        if (!streetRate && rates.usdt.price > 0 && !localStorage.getItem('street_rate_bs')) {
            setStreetRate(rates.usdt.price);
        }
    }, [rates.usdt.price, streetRate]);

    // Guardar al cambiar (Asíncrono)
    useEffect(() => {
        if (!isLoadingProducts) {
            if (products.length > 0) {
                storageService.setItem('my_products_v1', products);
            } else {
                storageService.removeItem('my_products_v1');
            }
        }
    }, [products, isLoadingProducts]);

    useEffect(() => {
        if (streetRate > 0) localStorage.setItem('street_rate_bs', streetRate.toString());
    }, [streetRate]);

    // Persist Manual USDT Config
    useEffect(() => {
        localStorage.setItem('catalog_use_auto_usdt', JSON.stringify(useAutoUsdt));
        localStorage.setItem('catalog_custom_usdt_price', customUsdtPrice.toString());
        localStorage.setItem('catalog_show_cash_price', JSON.stringify(showCashPrice));
    }, [useAutoUsdt, customUsdtPrice, showCashPrice]);

    // Resetear página al buscar
    useEffect(() => { setCurrentPage(1); }, [searchTerm]);

    // --- COMPUTED ---

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    const paginatedProducts = filteredProducts.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Calibration handlers
    const handleCalibration = (val) => setStreetPriceInput(val);
    const applyCalibration = () => {
        const val = parseFloat(streetPriceInput);
        if (val > 0) {
            setStreetRate(val);
            setStreetPriceInput('');
            triggerHaptic && triggerHaptic();
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-3 sm:p-6 overflow-hidden">

            {/* Header + Search */}
            <div className="shrink-0 mb-6 space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                            <Package size={26} className="text-brand" /> Catálogo
                        </h2>
                        {(!parityMode && mainCurrency !== 'USDT') && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full w-fit mt-1">
                                <Globe size={12} className="text-amber-500" />
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                    Trabajando en {CURRENCIES[mainCurrency]} · Bs como referencia
                                </span>
                            </div>
                        )}
                        <p className="text-sm text-slate-400 font-medium ml-1">Mis Productos</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => { triggerHaptic && triggerHaptic(); setIsShareOpen(true); }}
                            className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl shadow-sm hover:scale-105 transition-transform"
                            title="Compartir / Importar Catálogo"
                        >
                            <ArrowLeftRight size={24} strokeWidth={2.5} />
                        </button>
                        <button
                            onClick={() => { triggerHaptic && triggerHaptic(); setIsSettingsOpen(true); }}
                            className="p-3 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl shadow-sm hover:scale-105 transition-transform"
                            title="Ajustes y Backup"
                        >
                            <Settings size={24} strokeWidth={2.5} />
                        </button>
                        <button
                            onClick={() => { triggerHaptic && triggerHaptic(); form.setIsModalOpen(true); }}
                            className="p-3 bg-brand text-slate-900 rounded-2xl shadow-lg shadow-brand/20 hover:scale-105 transition-transform"
                        >
                            <Plus size={24} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                {/* Rate Configuration Panel */}
                <RateConfigPanel
                    isConfigOpen={isConfigOpen}
                    setIsConfigOpen={setIsConfigOpen}
                    useAutoUsdt={useAutoUsdt}
                    setUseAutoUsdt={setUseAutoUsdt}
                    customUsdtPrice={customUsdtPrice}
                    setCustomUsdtPrice={setCustomUsdtPrice}
                    effectiveUsdtRate={effectiveUsdtRate}
                    activeBaseRate={activeBaseRate}
                    rates={rates}
                    showCashPrice={showCashPrice}
                    setShowCashPrice={setShowCashPrice}
                    streetRate={streetRate}
                    streetPriceInput={streetPriceInput}
                    handleCalibration={handleCalibration}
                    applyCalibration={applyCalibration}
                    rateFieldLabel={rateFieldLabel}
                    cashSectionLabel={cashSectionLabel}
                    cashSectionDescription={cashSectionDescription}
                    streetRateLabel={streetRateLabel}
                    effectivePriceUnit={effectivePriceUnit}
                    mainCurrency={mainCurrency}
                    triggerHaptic={triggerHaptic}
                />

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
            {isLoadingProducts ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 space-y-4">
                    <div className="w-8 h-8 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-brand animate-spin" />
                    <p className="text-sm font-medium">Cargando catálogo...</p>
                </div>
            ) : products.length === 0 ? (
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
                    <div className="flex-1 overflow-y-auto pb-4 scrollbar-hide catalog-scroll-container">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3" style={{ gridAutoRows: 'auto' }}>
                            {paginatedProducts.map(p => {
                                // valBs para Bs y para efectivo = SIEMPRE USDT base
                                const valBs = p.priceUsdt * effectiveUsdtRate;

                                // refBcv y refEur son divisiones de valBs (Bs) a cada tasa
                                const refBcv = valBs / rates.bcv.price;
                                const refEur = valBs / rates.euro.price;

                                const efectivoPrecio = (() => {
                                    if (!showCashPrice || streetRate <= 0) return null;
                                    const ef = valBs / streetRate;
                                    return `$${smartCashRounding(ef)}`;
                                })();

                                return (
                                    <ProductCard
                                        key={p.id}
                                        product={p}
                                        valBs={valBs}
                                        refBcv={refBcv}
                                        refEur={refEur}
                                        efectivoPrecio={efectivoPrecio}
                                        mainCurrency={mainCurrency}
                                        rates={rates}
                                        onShare={setShareProduct}
                                        onEdit={form.handleEdit}
                                        onDelete={form.handleDelete}
                                    />
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
                    </div>
                </>
            )}

            {/* Modal Añadir / Editar */}
            <ProductFormModal
                isOpen={form.isModalOpen}
                onClose={form.handleClose}
                editingId={form.editingId}
                name={form.name}
                setName={form.setName}
                priceUsdt={form.priceUsdt}
                costUsdt={form.costUsdt}
                setCostUsdt={form.setCostUsdt}
                priceEfectivo={form.priceEfectivo}
                image={form.image}
                setImage={form.setImage}
                fileInputRef={form.fileInputRef}
                handleImageUpload={form.handleImageUpload}
                handleSave={() => form.handleSave(products, setProducts)}
                handleEfectivoChange={form.handleEfectivoChange}
                handleUsdtChange={form.handleUsdtChange}
                showCashPrice={showCashPrice}
                effectiveUsdtRate={effectiveUsdtRate}
                rates={rates}
                mainCurrency={mainCurrency}
            />

            {/* Share Modal */}
            <ProductShareModal
                isOpen={!!shareProduct}
                onClose={() => setShareProduct(null)}
                product={shareProduct}
                accounts={accounts}
                streetRate={streetRate}
                mainCurrency={mainCurrency}
                rates={{ ...rates, usdt: { ...rates.usdt, price: effectiveUsdtRate } }}
            />

            {/* Modal ELIMINAR PRODUCTO */}
            <Modal isOpen={!!form.deleteId} onClose={() => form.setDeleteId(null)} title="Eliminar Producto">
                <div className="flex flex-col items-center text-center space-y-4 py-4">
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-2">
                        <Trash2 size={32} className="text-red-500" />
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-slate-800 dark:text-white">¿Estás seguro?</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 px-4">
                            Esta acción eliminará el producto de tu catálogo permanentemente. No se puede deshacer.
                        </p>
                    </div>
                    <div className="flex gap-3 w-full pt-2">
                        <button
                            onClick={() => form.setDeleteId(null)}
                            className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => form.confirmDelete(products, setProducts)}
                            className="flex-1 py-3 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-lg shadow-red-500/30 active:scale-95 transition-all"
                        >
                            ¡Sí, eliminar!
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Settings Modal */}
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

            {/* Share Inventory Modal */}
            <ShareInventoryModal
                isOpen={isShareOpen}
                onClose={() => setIsShareOpen(false)}
                products={products}
                onImport={(imported) => {
                    setProducts(imported);
                    storageService.setItem('my_products_v1', imported);
                }}
            />
        </div>
    );
};
