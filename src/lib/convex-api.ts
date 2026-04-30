// Прокси re-export api/internal. Создан чтобы дать единую точку для
// потенциальных type-cast обходов TS2589 (Convex deep type instantiation
// после расширения api в MFA-A.1). На текущий момент — простой re-export
// без cast — типы сохраняются для downstream useQuery/useAction.
export { api, internal } from "../../convex/_generated/api";
