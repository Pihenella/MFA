"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-8 max-w-md w-full">
        <div className="text-4xl mb-4">!</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Что-то пошло не так
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Произошла ошибка при загрузке страницы. Попробуйте обновить.
        </p>
        {process.env.NODE_ENV === "development" && (
          <pre className="text-left text-xs text-red-600 bg-red-50 rounded-lg p-3 mb-4 overflow-auto max-h-40">
            {error.message}
          </pre>
        )}
        <button
          onClick={reset}
          className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    </div>
  );
}
