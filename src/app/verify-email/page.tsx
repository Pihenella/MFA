"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { FinlyAuthLayout } from "@/components/finly/FinlyAuthLayout";
import { FinlyButton } from "@/components/finly/FinlyButton";
import { verifyEmailRef } from "@/lib/convex-refs";

function VerifyEmailInner() {
  const search = useSearchParams();
  const router = useRouter();
  const verify = useMutation(verifyEmailRef);
  const token = search.get("token");
  const [state, setState] = useState<"loading" | "ok" | "already" | "err">(
    "loading"
  );
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
    <FinlyAuthLayout
      mascotPose="empty-data"
      title="Проверка email"
      subtitle="Сверяем печать на приглашении"
    >
      <div className="space-y-4 text-center">
        {state === "loading" ? (
          <p className="text-muted-foreground">Подтверждаем email…</p>
        ) : null}
        {state === "ok" ? (
          <>
            <h2 className="font-display text-2xl font-semibold text-rune-success">
              Email подтверждён
            </h2>
            <p className="text-muted-foreground">
              Заявка отправлена на approval. Проверьте позже.
            </p>
            <FinlyButton onClick={() => router.push("/pending-approval")}>
              OK
            </FinlyButton>
          </>
        ) : null}
        {state === "already" ? (
          <>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              Email уже подтверждён ранее
            </h2>
            <FinlyButton onClick={() => router.push("/pending-approval")}>
              Продолжить
            </FinlyButton>
          </>
        ) : null}
        {state === "err" ? (
          <>
            <h2 className="font-display text-2xl font-semibold text-rune-danger">
              Ошибка подтверждения
            </h2>
            <p className="text-muted-foreground">{errMsg}</p>
            <FinlyButton onClick={() => router.push("/login")}>
              На страницу входа
            </FinlyButton>
          </>
        ) : null}
      </div>
    </FinlyAuthLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}
