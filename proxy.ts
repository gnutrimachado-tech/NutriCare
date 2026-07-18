import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const protectedPaths = [
    "/dashboard",
    "/pacientes",
    "/agenda",
    "/planos",
    "/plano-alimentar",
    "/taxa-metabolica",
  ];

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  const isLoginPage = pathname === "/";
  const isCadastroPage = pathname === "/cadastro";

  // Rotas que não precisam verificar token (API pública, assets, etc.)
  if (!isProtected && !isLoginPage && !isCadastroPage) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Usuário já logado tentando acessar login ou cadastro → redireciona para dashboard
  if ((isLoginPage || isCadastroPage) && token) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Rota protegida sem sessão → redireciona para login
  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|logo-nutricare\\.png|.*\\..*).*)",
  ],
};
