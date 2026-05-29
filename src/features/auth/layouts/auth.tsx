"use client";

import { MeshGradient } from "@paper-design/shaders-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import bg from "../../../../public/assets/toulouse.jpg";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-primary backdrop-blur-[2px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="z-10 w-full max-w-lg px-4 flex flex-col items-center gap-6"
      >
        <Card className="bg-white shadow-xl p-10 border-none w-full">
          {children}
        </Card>
      </motion.div>
    </main>
  );
}
