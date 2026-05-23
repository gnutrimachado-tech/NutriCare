import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata = {
  title: "NutriCare",
  description: "Sistema para nutricionistas",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            backgroundColor: "#f8fafc",
          }}
        >
          <Sidebar />

          <main
            style={{
              flex: 1,
              padding: "40px",
            }}
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}