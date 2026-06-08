export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white shadow-2xl rounded-2xl p-10 w-full max-w-md">
        <h1 className="text-4xl font-bold text-center text-green-600 mb-2">
          NutriCare
        </h1>

        <p className="text-center text-gray-500 mb-8">
          Sistema Profissional para Nutricionistas
        </p>

        <form className="space-y-4">
          <input
            type="email"
            placeholder="E-mail"
            className="w-full border border-gray-300 rounded-lg px-4 py-3"
          />

          <input
            type="password"
            placeholder="Senha"
            className="w-full border border-gray-300 rounded-lg px-4 py-3"
          />

          <button
            type="submit"
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
          >
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}
