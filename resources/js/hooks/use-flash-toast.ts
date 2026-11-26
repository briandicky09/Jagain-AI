import { router } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { FlashToast } from '@/types/ui';

type SharedFlash = {
    success?: string | null;
    error?: string | null;
    info?: string | null;
    toast?: FlashToast;
};

export function useFlashToast(): void {
    const lastShownRef = useRef<{ key: string; at: number } | null>(null);

    useEffect(() => {
        const notify = (type: FlashToast['type'], message: string) => {
            const key = `${type}:${message}`;
            const now = Date.now();
            if (
                lastShownRef.current &&
                lastShownRef.current.key === key &&
                now - lastShownRef.current.at < 800
            ) {
                return;
            }
            lastShownRef.current = { key, at: now };
            toast[type](message);
        };

        const unsubFlash = router.on('flash', (event) => {
            const flash = (event as CustomEvent).detail?.flash as SharedFlash | undefined;
            if (flash?.toast?.message) {
                notify(flash.toast.type, flash.toast.message);
            }
        });

        const unsubSuccess = router.on('success', (event) => {
            const flash = (event as CustomEvent).detail?.page?.props?.flash as SharedFlash | undefined;
            if (!flash) return;
            if (flash.success) notify('success', flash.success);
            if (flash.error) notify('error', flash.error);
            if (flash.info) notify('info', flash.info);
        });

        return () => {
            unsubFlash();
            unsubSuccess();
        };
    }, []);
}
