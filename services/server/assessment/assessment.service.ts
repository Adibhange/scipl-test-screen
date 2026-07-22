import { getAssessmentQuestions, getQuestionsByRoleAndExperience } from "@/repositories/question.repository";
import { ValidationError } from "@/lib/errors";

/**
 * Service to handle assessment question selections and configurations.
 */
export async function getQuestionsForAssessment(
	role: string,
	experience: string,
	all: boolean,
) {
	if (!role || !experience) {
		throw new ValidationError("role and experience parameters are required");
	}

	if (all) {
		return getQuestionsByRoleAndExperience(role, experience);
	}
	return getAssessmentQuestions(role, experience);
}
