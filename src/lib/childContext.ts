import { createContext, useContext } from "react";
import type { Child } from "./schema";

export interface ChildCtx {
  child: Child | null;
  setChildId: (id: string) => void;
}

export const ChildContext = createContext<ChildCtx>({ child: null, setChildId: () => {} });
export const useChild = () => useContext(ChildContext);
