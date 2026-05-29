import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import logo from "../../../../public/assets/icon.svg";

export function Loader({ onComplete }: { onComplete: () => void }) {
	const [isVisible, setIsVisible] = useState(true);

	useEffect(() => {
		const timer = setTimeout(() => {
			setIsVisible(false);
		}, 2000);

		return () => clearTimeout(timer);
	}, []);

	return (
		<AnimatePresence onExitComplete={onComplete}>
			{isVisible && (
				<motion.div
					initial={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.9, ease: "easeInOut" }}
					className="fixed inset-0 z-9999 bg-black flex items-center justify-center"
				>
					<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }}>
						<motion.div
							animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
							transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut", delay: 0.5 }}
						>
							<Image src={logo} alt="Logo" width={56} height={56} className="invert brightness-0" priority />
						</motion.div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
