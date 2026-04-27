// @ts-nocheck — обходит TS2589 (Convex deep type instantiation после
// расширения api в MFA-A.1). Файл экспортирует api/internal как `any`,
// чтобы downstream useQuery/useAction вызовы не пытались deep-инстанциировать
// типы. Runtime поведение идентично.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { api as _api, internal as _internal } from "../../convex/_generated/api";

export const api: any = _api;
export const internal: any = _internal;
