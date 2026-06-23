import localFont from "next/font/local";
import { cookies } from "next/headers";
import "./globals.css";
import RootProviders from "@/components/providers/RootProviders";
import { I18NEXT_LS_KEY, normalizeLangTag } from "@/i18n/language";

const inter = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: {
    default: "Vegasphere",
    template: "Vegasphere | %s",
  },
  description: "Modern chat — Next.js shell",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  const cookieLng = normalizeLangTag(cookies().get(I18NEXT_LS_KEY)?.value);
  const htmlLang = cookieLng || "en";
  const cookieTheme = cookies().get("vegasphere-next-theme")?.value;
  const cookieThemeSafe =
    cookieTheme === "light" || cookieTheme === "dark" ? cookieTheme : undefined;
  const isDark = cookieThemeSafe === "dark";
  const initialTheme = cookieThemeSafe;

  return (
    <html
      lang={htmlLang}
      dir={htmlLang === "ar" ? "rtl" : "ltr"}
      className={isDark ? "dark" : undefined}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="icon"
          type="image/svg+xml"
          href={isDark ? "/icon-dark.svg?theme=dark" : "/icon-light.svg?theme=light"}
          data-vega-favicon="true"
        />
      </head>
      <body className={`${inter.variable} min-h-screen font-sans antialiased`}>
        <script
          // Ensure theme persists on refresh *before* React hydration.
          // Reads localStorage key written by `PreferencesLoader`.
          dangerouslySetInnerHTML={{
            __html: `
(() => {
  try {
    var key = "vegasphere-next-theme";
    var getCookie = function (name) {
      try {
        var parts = String(document.cookie || "").split("; ");
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i];
          if (p.indexOf(name + "=") === 0) return decodeURIComponent(p.slice(name.length + 1));
        }
        return null;
      } catch (e) {
        return null;
      }
    };
    var t = localStorage.getItem(key) || getCookie(key);
    var mq = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
    var resolved = (t === "dark" || t === "light") ? t : (mq && mq.matches ? "dark" : "light");
    document.documentElement.classList.toggle("dark", resolved === "dark");
    var fav = document.querySelector("link[data-vega-favicon]");
    if (!fav) {
      fav = document.createElement("link");
      fav.rel = "icon";
      fav.type = "image/svg+xml";
      fav.setAttribute("data-vega-favicon", "true");
      document.head.appendChild(fav);
    }
    fav.href = resolved === "dark" ? "/icon-dark.svg?theme=dark" : "/icon-light.svg?theme=light";
    if (t !== "dark" && t !== "light") {
      try { localStorage.setItem(key, resolved); } catch (e) {}
      try { document.cookie = key + "=" + encodeURIComponent(resolved) + "; path=/; max-age=31536000; samesite=lax"; } catch (e) {}
    }
  } catch (e) {}
})();`,
          }}
        />
        <RootProviders initialI18nLng={htmlLang} initialTheme={initialTheme}>
          {children}
        </RootProviders>
      </body>
    </html>
  );
}
