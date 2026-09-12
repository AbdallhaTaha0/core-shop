import { createContext, useContext } from 'react';
import type { User, Cart } from '../lib/api';

type ShopState = {
  user: User | null;
  cart: Cart | null;
  ready: boolean;
  refreshCart: () => Promise<void>;
  setUser: (user: User | null) => void;
  notify: (message: string) => void;
};
export const ShopContext = createContext<ShopState | null>(null);
export function useShop() {
  const value = useContext(ShopContext);
  if (!value) throw new Error('Shop context missing');
  return value;
}
