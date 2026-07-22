import { create } from "zustand";

interface AssessmentUiState {
	activeQuestionIndex: number;
	setActiveQuestionIndex: (index: number) => void;
	isFullscreen: boolean;
	setIsFullscreen: (fullscreen: boolean) => void;
	theme: "light" | "dark";
	toggleTheme: () => void;
}

export const useAssessmentUiStore = create<AssessmentUiState>((set) => ({
	activeQuestionIndex: 0,
	setActiveQuestionIndex: (index) => set({ activeQuestionIndex: index }),
	isFullscreen: false,
	setIsFullscreen: (fullscreen) => set({ isFullscreen: fullscreen }),
	theme: "dark",
	toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
}));
