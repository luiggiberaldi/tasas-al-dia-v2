import { useState, useEffect } from 'react';
import { storageService } from '../utils/storageService';

const STORAGE_KEY = 'my_products_v1';

export function useProductsLite() {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const loadData = async () => {
            try {
                const saved = await storageService.getItem(STORAGE_KEY, []);
                if (isMounted) {
                    setProducts(saved || []);
                }
            } catch (error) {
                console.error("Error cargando catálogo:", error);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadData();
        return () => { isMounted = false; };
    }, []);

    return { products, isLoading };
}
