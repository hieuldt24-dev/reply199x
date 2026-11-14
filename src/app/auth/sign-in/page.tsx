import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GoogleLoginForm } from "@/components/auth/GoogleLoginForm";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  let email: string | undefined;
  let unavailable = false;
  try {
    const { data } = await (await createClient()).auth.getUser();
    email = data.user?.email;
  } catch { unavailable = true; }
  const message = error === "callback"
    ? "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng thử lại."
    : error === "signout"
      ? "Chưa thể đăng xuất. Vui lòng thử lại."
      : error || unavailable
        ? "Chưa thể kết nối Google. Vui lòng thử lại sau khi tính năng đăng nhập được cấu hình."
        : null;

  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center px-6 py-20">
      <section className="w-full max-w-md border-2 border-current p-8 shadow-[6px_6px_0_currentColor]" aria-labelledby="sign-in-title">
        <p className="mb-3 text-sm tracking-widest">REPLY 199X</p>
        <h1 id="sign-in-title" className="text-3xl font-bold mb-4">{email ? "Bạn đã đăng nhập" : "Hẹn gặp bạn tại REPLY"}</h1>
        <p className="mb-6">{email || "Đăng nhập bằng Google để chuẩn bị cho hành trình đặt vé."}</p>
        {message && <p role="alert" className="mb-6">{message}</p>}
        {email ? <form action="/api/auth/logout" method="post"><button type="submit">Đăng xuất</button></form> : <GoogleLoginForm />}
        <Link href="/" className="mt-6 inline-block underline">Về trang chủ</Link>
      </section>
    </main>
  );
}
