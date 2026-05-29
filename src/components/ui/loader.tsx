"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

export function Loader({ onComplete }: { onComplete: () => void }) {
	const [isVisible, setIsVisible] = useState(true);

	useEffect(() => {
		const timer = setTimeout(() => {
			setIsVisible(false);
		}, 800);

		return () => clearTimeout(timer);
	}, []);

	return (
		<AnimatePresence onExitComplete={onComplete}>
			{isVisible && (
				<motion.div
					initial={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.4, ease: "easeInOut" }}
					className="fixed inset-0 z-[9999] bg-background flex items-center justify-center"
				>
					<div className="size-10 rounded-full border-4 border-muted border-t-foreground animate-spin" />
				</motion.div>
			)}
		</AnimatePresence>
	);
}
