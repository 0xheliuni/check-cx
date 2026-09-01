import type {Metadata} from "next";
import {connection} from "next/server";
import {Suspense} from "react";
import {JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "@/lib/core/poller";
import NextTopLoader from "nextjs-toploader";
import {ThemeProvider} from "@/components/theme-provider";
import {NotificationBanner} from "@/components/notification-banner";
import {SupabaseBrowserProvider} from "@/lib/supabase/browser-context";
import {getSupabasePublicConfig} from "@/lib/supabase/public-config";
const jetbrainsMono = JetBrains_Mono({subsets:['latin'],variable:'--font-mono'});

export const metadata: Metadata = {
  title: "LINUX DO - 模型中转状态检测",
  description: "实时检测 OpenAI / Gemini / Anthropic 对话接口的可用性与延迟",
  icons: {
    icon: "/favicon.png",
  },
};

const themeBootScript = `(()=>{
  const hour = new Date().getHours();
  const isDark = hour >= 19 || hour < 7;
  const root = document.documentElement;
  root.classList.toggle('dark', isDark);
  root.style.colorScheme = isDark ? 'dark' : 'light';
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className={jetbrainsMono.variable}>
      <head>
        <script
          id="theme-boot"
          dangerouslySetInnerHTML={{ __html: themeBootScript }}
        />
      </head>
      <body className="antialiased">
        <NextTopLoader color="var(--foreground)" showSpinner={false} />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense>
            <RealtimeShell>
              <NotificationBanner />
              {children}
            </RealtimeShell>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}

async function RealtimeShell({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  return (
    <SupabaseBrowserProvider config={getSupabasePublicConfig()}>
      {children}
    </SupabaseBrowserProvider>
  );
}
