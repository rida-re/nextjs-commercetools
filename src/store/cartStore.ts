// store/cartStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Cart } from '@commercetools/platform-sdk';

interface CartStore {
  cart: Cart | null;
  cartId: string | null;
  hydrated: boolean;
  setCart: (cart: Cart) => void;
  setCartId: (cartId: string) => void;
  setHydrated: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      cart: null,
      cartId: null,
      hydrated: false,
      setCart: (cart) => set({ cart, cartId: cart.id }),
      setCartId: (cartId) => set({ cartId }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'cart-storage',
      onRehydrateStorage: () => (state) => {
        // call setHydrated once rehydration is done
        state?.setHydrated?.();
      },
    }
  )
);
