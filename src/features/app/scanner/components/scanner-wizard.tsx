"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import type { UserCarddavConfig } from "@/db/schemas/contacts";
import type { ContactData } from "@/lib/types";
import { ContactsDrawer } from "./contacts-drawer";
import { CaptureStep } from "./steps/capture-step";
import { ProcessingStep } from "./steps/processing-step";
import { ReviewStep } from "./steps/review-step";

type Step = "capture" | "processing" | "review";

interface ScannerWizardProps {
	carddavConfig: UserCarddavConfig | null;
}

export function ScannerWizard({ carddavConfig }: ScannerWizardProps) {
	const tErrors = useTranslations("scanner.errors");
	const [step, setStep] = useState<Step>("capture");
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [imageUrl, setImageUrl] = useState("");
	const [contactData, setContactData] = useState<ContactData | null>(null);

	const reset = () => {
		setStep("capture");
		setSelectedFile(null);
		setImageUrl("");
		setContactData(null);
	};

	const handleImageSelected = (file: File) => {
		setSelectedFile(file);
		setStep("processing");
	};

	const handleProcessingDone = (url: string, data: ContactData) => {
		setImageUrl(url);
		setContactData(data);
		setStep("review");
	};

	const handleProcessingError = (message: string) => {
		toast.error(message || tErrors("ollama_down"));
		reset();
	};

	return (
		<div className="relative min-h-[calc(100vh-4rem)]">
			<ContactsDrawer carddavConfig={carddavConfig} />

			{step === "capture" && <CaptureStep onImageSelected={handleImageSelected} />}

			{step === "processing" && selectedFile && (
				<ProcessingStep file={selectedFile} onDone={handleProcessingDone} onError={handleProcessingError} />
			)}

			{step === "review" && contactData && (
				<ReviewStep imageUrl={imageUrl} data={contactData} onSave={reset} onRetry={reset} />
			)}
		</div>
	);
}
