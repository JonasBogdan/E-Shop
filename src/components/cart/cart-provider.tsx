"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

export type CartItem = {
  id: string;          // unique cart key: variantId when variant, productId otherwise
  productId: string;   // always the actual product UUID
  slug: string;
  name_en: string;
  name_lt: string;
  price: number;
  image: string | null;
  weight: string | null;
  quantity: number;
  variantId?: string | null;
  variantName?: string | null;
};

export type AppliedCoupon = {
  code: string;
  type: "percentage" | "fixed";
  value: number;
  discount: number; // EUR amount deducted
};

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  coupon: AppliedCoupon | null;
};

type CartAction =
  | { type: "ADD_ITEM"; payload: Omit<CartItem, "quantity"> & { quantity?: number } }
  | { type: "REMOVE_ITEM"; payload: string }
  | { type: "UPDATE_QUANTITY"; payload: { id: string; quantity: number } }
  | { type: "CLEAR_CART" }
  | { type: "SET_OPEN"; payload: boolean }
  | { type: "LOAD_CART"; payload: CartItem[] }
  | { type: "SET_COUPON"; payload: AppliedCoupon }
  | { type: "CLEAR_COUPON" };

type CartContextType = {
  items: CartItem[];
  isOpen: boolean;
  coupon: AppliedCoupon | null;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setIsOpen: (open: boolean) => void;
  setCoupon: (coupon: AppliedCoupon) => void;
  clearCoupon: () => void;
  totalItems: number;
  totalPrice: number;
  finalTotal: number;
};

const CartContext = createContext<CartContextType | null>(null);

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existingIndex = state.items.findIndex(
        (item) => item.id === action.payload.id
      );
      if (existingIndex > -1) {
        const newItems = [...state.items];
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity:
            newItems[existingIndex].quantity + (action.payload.quantity || 1),
        };
        return { ...state, items: newItems, isOpen: true };
      }
      return {
        ...state,
        items: [
          ...state.items,
          { ...action.payload, quantity: action.payload.quantity || 1 },
        ],
        isOpen: true,
      };
    }
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
      };
    case "UPDATE_QUANTITY": {
      if (action.payload.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter((item) => item.id !== action.payload.id),
        };
      }
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
      };
    }
    case "CLEAR_CART":
      return { ...state, items: [], coupon: null };
    case "SET_OPEN":
      return { ...state, isOpen: action.payload };
    case "LOAD_CART":
      return { ...state, items: action.payload };
    case "SET_COUPON":
      return { ...state, coupon: action.payload };
    case "CLEAR_COUPON":
      return { ...state, coupon: null };
    default:
      return state;
  }
}

const CART_STORAGE_KEY = "petfood-cart";

function isValidCartItem(item: unknown): item is CartItem {
  if (!item || typeof item !== "object") return false;
  const o = item as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.slug === "string" &&
    typeof o.name_en === "string" &&
    typeof o.name_lt === "string" &&
    typeof o.price === "number" &&
    typeof o.quantity === "number" &&
    o.quantity > 0
  );
}

function migrateCartItem(item: CartItem): CartItem {
  // Legacy items don't have productId — default it to id
  if (!item.productId) {
    return { ...item, productId: item.id };
  }
  return item;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    isOpen: false,
    coupon: null,
  });

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const validItems = parsed.filter(isValidCartItem).map(migrateCartItem);
          dispatch({ type: "LOAD_CART", payload: validItems });
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save cart to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      // Ignore storage errors
    }
  }, [state.items]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
      dispatch({ type: "ADD_ITEM", payload: item });
    },
    []
  );

  const removeItem = useCallback((id: string) => {
    dispatch({ type: "REMOVE_ITEM", payload: id });
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    dispatch({ type: "UPDATE_QUANTITY", payload: { id, quantity } });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR_CART" });
  }, []);

  const setIsOpen = useCallback((open: boolean) => {
    dispatch({ type: "SET_OPEN", payload: open });
  }, []);

  const setCoupon = useCallback((coupon: AppliedCoupon) => {
    dispatch({ type: "SET_COUPON", payload: coupon });
  }, []);

  const clearCoupon = useCallback(() => {
    dispatch({ type: "CLEAR_COUPON" });
  }, []);

  const totalItems = state.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const totalPrice = state.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const finalTotal = Math.max(0, totalPrice - (state.coupon?.discount ?? 0));

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        isOpen: state.isOpen,
        coupon: state.coupon,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        setIsOpen,
        setCoupon,
        clearCoupon,
        totalItems,
        totalPrice,
        finalTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
