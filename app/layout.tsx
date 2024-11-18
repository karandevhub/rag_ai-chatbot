import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SidebarInset, SidebarProvider } from "@/components/sidebar";
import { AppSidebar } from "@/components/custom/app-sidebar";
import { cookies } from "next/headers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RAG AI",
  description: "A chatbot that answers questions from documents using retrieval-augmented generation (RAG) technology.",
};

export const dynamic = "force-dynamic"
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {


  const cookieStore = await cookies();
  const isCollapsed = cookieStore.get('sidebar:state')?.value !== 'true';
  
  return (
    <html lang="en">
      <body className={inter.className}>
      <SidebarProvider defaultOpen={!isCollapsed}>
        <AppSidebar />
        <SidebarInset>
          {children}
        </SidebarInset>
      </SidebarProvider>
      </body>
    </html>
  );
}
