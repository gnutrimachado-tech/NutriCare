import "./globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SessionProvider from "@/components/SessionProvider";
import Sidebar from "@/components/Sidebar";

export const metadata = {
  title: "NutriCare",
  description: "Sistema para nutricionistas",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="pt-BR">
      <body>
        <SessionProvider session={session}>
          {session ? (
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
          ) : (
            <>{children}</>
          )}
        </SessionProvider>
      </body>
    </html>
  );
}
