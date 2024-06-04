import "../styles/globals.css";

import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { TRPCReactProvider } from "../trpc/react";
import { GithubIcon, TwitterIcon } from "lucide-react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "Shiptalkers",
  description:
    "Find out if people on Twitter actually ship code or if they're just shiptalking.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};
export const revalidate = 60; // 1 minute

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`font-sans ${inter.variable} flex min-h-screen flex-col bg-gray-100 dark:bg-gray-800`}
      >
        <TRPCReactProvider cookies={cookies().toString()}>
          <div className="bg-white shadow-lg">
            You're here early! We're still developing the site, it will be
            buggy.
          </div>
          <nav className="flex items-center justify-between bg-white p-2 shadow-lg  dark:bg-gray-900">
            <a href="/">
              <h1 className="text-2xl font-bold">Shiptalkers</h1>
            </a>
            <div className="flex flex-row items-center gap-4">
              <a
                href="https://github.com/RhysSullivan/shiptalkers"
                target="_blank"
                className="hover:text-gray-500"
              >
                <GithubIcon className="h-8 w-8" />
              </a>
              <a
                href="https://twitter.com/RhysSullivan1"
                target="_blank"
                className="hover:text-gray-500"
              >
                <TwitterIcon className="h-8 w-8" />
              </a>
            </div>
          </nav>
          {children}
        </TRPCReactProvider>
      </body>
    </html>
  );
}
