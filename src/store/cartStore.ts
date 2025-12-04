// store/cartStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Cart } from '@commercetools/platform-sdk';

interface CartStore {
  cart: Cart | null;
  cartId: string | null;
  hydrated: boolean;
  setCart: (cart: Cart | null) => void;
  setCartId: (cartId: string | null) => void;
  setHydrated: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      cart: null,
      cartId: null,
      hydrated: false,

      // On accepte un cart null et un cart.id potentiellement undefined
      setCart: (cart) => set({ 
        cart, 
        cartId: cart ? cart.id : null 
      }),

      // On accepte un cartId null
      setCartId: (cartId) => set({ cartId }),

      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'cart-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHydrated?.();
      },
    }
  )
);
