"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { verifyEmailRef } from "@/lib/convex-refs";
import { Button } from "@/components/ui/button";

function VerifyEmailInner() {
  const search = useSearchParams();
  const router = useRouter();
  const verify = useMutation(verifyEmailRef);
  const token = search.get("token");
  const [state, setState] = useState<"loading" | "ok" | "already" | "err">("loading");
  const [errMsg, setErrMsg] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setState("err");
      setErrMsg("Токен отсутствует в ссылке");
      return;
    }
    verify({ token })
      .then((r) => setState(r.alreadyVerified ? "already" : "ok"))
      .catch((e) => {
        setState("err");
        setErrMsg((e as Error).message);
      });
  }, [token, verify]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-4">
        {state === "loading" && <p className="text-gray-500">Подтверждаем email…</p>}
        {state === "ok" && (
          <>
            <h1 className="text-2xl font-bold text-green-600">Email подтверждён</h1>
            <p className="text-gray-600">Заявка отправлена на approval. Проверьте позже.</p>
            <Button onClick={() => router.push("/pending-approval")}>OK</Button>
          </>
        )}
        {state === "already" && (
          <>
            <h1 className="text-2xl font-bold">Email уже подтверждён ранее</h1>
            <Button onClick={() => router.push("/pending-approval")}>Продолжить</Button>
          </>
        )}
        {state === "err" && (
          <>
            <h1 className="text-2xl font-bold text-red-600">Ошибка подтверждения</h1>
            <p className="text-gray-600">{errMsg}</p>
            <Button onClick={() => router.push("/login")}>На страницу входа</Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}
