import { useState, useRef } from 'react';
import { storageService } from '../utils/storageService';
import { smartCashRounding } from '../utils/calculatorUtils';
import { fromBaseUsd, toBaseUsd } from '../utils/currencyUtils';

/**
 * Hook que encapsula el estado del formulario de producto
 * y los handlers de CRUD / pricing parity.
 */
export function useProductForm({ rates, mainCurrency, effectiveUsdtRate, streetRate, triggerHaptic }) {
    // Form State
    const [editingId, setEditingId] = useState(null);
    const [name, setName] = useState('');
    const [priceUsdt, setPriceUsdt] = useState('');
    const [costUsdt, setCostUsdt] = useState('');
    const [priceEfectivo, setPriceEfectivo] = useState('');
    const [image, setImage] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const fileInputRef = useRef(null);

    // Delete State
    const [deleteId, setDeleteId] = useState(null);

    // --- IMAGE UPLOAD (OPTIMIZADA PDA v1.0: 400x400 WebP 70%) ---
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
                const MAX_SIZE = 400;

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
                setImage(canvas.toDataURL('image/webp', 0.7));
            };
        };
    };

    // --- SAVE ---
    const handleSave = (products, setProducts) => {
        triggerHaptic && triggerHaptic();
        if (!name || !priceUsdt) return alert("Nombre y precio requeridos");

        const formattedName = name.replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase());

        const ratesReady = rates?.usdt?.price > 0;
        const finalPriceUsdt = ratesReady
            ? toBaseUsd(parseFloat(priceUsdt) || 0, mainCurrency, rates)
            : parseFloat(priceUsdt) || 0;
        const finalCostUsdt = costUsdt && ratesReady
            ? toBaseUsd(parseFloat(costUsdt) || 0, mainCurrency, rates)
            : costUsdt ? parseFloat(costUsdt) || 0 : null;

        if (editingId) {
            const updatedProducts = products.map(p =>
                p.id === editingId
                    ? { ...p, name: formattedName, priceUsdt: finalPriceUsdt, costUsdt: finalCostUsdt, image: image || p.image }
                    : p
            );
            setProducts(updatedProducts);
        } else {
            const newProduct = {
                id: crypto.randomUUID(),
                name: formattedName,
                priceUsdt: finalPriceUsdt,
                costUsdt: finalCostUsdt,
                image,
                createdAt: new Date().toISOString()
            };
            setProducts([newProduct, ...products]);
        }
        handleClose();
    };

    // --- EDIT ---
    const handleEdit = (product) => {
        triggerHaptic && triggerHaptic();
        setEditingId(product.id);
        setName(product.name);

        const ratesReady = rates?.usdt?.price > 0;
        setPriceUsdt(
            ratesReady
                ? fromBaseUsd(product.priceUsdt, mainCurrency, rates).toFixed(2)
                : product.priceUsdt
        );
        setCostUsdt(
            product.costUsdt > 0 && ratesReady
                ? fromBaseUsd(product.costUsdt, mainCurrency, rates).toFixed(2)
                : (product.costUsdt || '')
        );

        // Calculate Init Efectivo
        if (streetRate > 0) {
            const valBs = product.priceUsdt * effectiveUsdtRate;
            const parityEfectivo = valBs / streetRate;
            setPriceEfectivo(smartCashRounding(parityEfectivo).toString());
        } else {
            setPriceEfectivo(product.priceUsdt);
        }

        setImage(product.image);
        setIsModalOpen(true);
    };

    // --- PRICING PARITY HANDLERS ---
    const handleEfectivoChange = (val) => {
        setPriceEfectivo(val);
        if (!val || parseFloat(val) <= 0 || streetRate <= 0) { setPriceUsdt(''); return; }

        const totalBs = parseFloat(val) * streetRate;
        const usdt = totalBs / effectiveUsdtRate;
        setPriceUsdt(usdt.toFixed(2));
    };

    const handleUsdtChange = (val) => {
        setPriceUsdt(val);
        if (!val || parseFloat(val) <= 0 || streetRate <= 0) { setPriceEfectivo(''); return; }

        const totalBs = parseFloat(val) * effectiveUsdtRate;
        const efectivo = totalBs / streetRate;
        setPriceEfectivo(Math.round(efectivo).toFixed(2));
    };

    // --- DELETE ---
    const handleDelete = (id) => {
        triggerHaptic && triggerHaptic();
        setDeleteId(id);
    };

    const confirmDelete = (products, setProducts) => {
        if (deleteId) {
            const clean = products.filter(p => p.id !== deleteId);
            setProducts(clean);
            setDeleteId(null);
            triggerHaptic && triggerHaptic();
        }
    };

    // --- CLOSE ---
    const handleClose = () => {
        setName(''); setPriceUsdt(''); setCostUsdt(''); setPriceEfectivo('');
        setImage(null); setEditingId(null); setIsModalOpen(false);
    };

    return {
        // Form state
        editingId, name, setName, priceUsdt, costUsdt, setCostUsdt,
        priceEfectivo, image, setImage, isModalOpen, setIsModalOpen,
        fileInputRef, deleteId, setDeleteId,
        // Handlers
        handleImageUpload, handleSave, handleEdit,
        handleEfectivoChange, handleUsdtChange,
        handleDelete, confirmDelete, handleClose,
    };
}
