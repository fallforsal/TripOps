import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Service } from "@/app/types";
import { fetchCatalogue } from "@/app/services/catalogue";
const Context = createContext<Service[]>([]);
export function ServiceCatalogueProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [items, setItems] = useState<Service[]>([]);
  useEffect(() => {
    let active = true;
    fetchCatalogue()
      .then((items) => {
        if (active) setItems(items);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return <Context.Provider value={items}>{children}</Context.Provider>;
}
export const useServiceCatalogue = () => useContext(Context);
