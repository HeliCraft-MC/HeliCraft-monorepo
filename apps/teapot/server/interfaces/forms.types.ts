export type FormStatus = 'draft' | 'published' | 'archived';

// Extensible question types
export const QUESTION_TYPES = {
    SHORT_TEXT: 'short_text',
    PARAGRAPH: 'paragraph',
    MULTIPLE_CHOICE: 'multiple_choice',
    CHECKBOX: 'checkbox',
    DROPDOWN: 'dropdown',
    FILE_UPLOAD: 'file_upload',
    RATING: 'rating'
} as const;

export type QuestionType = string;

export interface Form {
    id: number;
    uuid: string;
    owner_uuid: string;
    title: string;
    description?: string;
    status: FormStatus;
    theme?: FormTheme;
    settings?: FormSettings;
    public_hash?: string;
    created_at: number;
    updated_at: number;
}

export interface FormTheme {
    color?: string;
    background_image?: string;
    dark_mode?: boolean;
}

export interface FormSettings {
    max_responses?: number;
    allow_anonymous?: boolean; // If false, requires login (default for now)
    start_date?: number;
    end_date?: number;
}

export interface Question {
    id: number;
    form_id: number;
    uuid: string;
    type: QuestionType;
    title: string;
    description?: string;
    is_required: boolean;
    options?: any; // JSON
    validation?: QuestionValidation;
    order_index: number;
    created_at: number;
    updated_at: number;
}

export interface QuestionValidation {
    regex?: string;
    min_length?: number;
    max_length?: number;
    min_value?: number;
    max_value?: number;
    allowed_file_types?: string[];
    max_file_size?: number; // in bytes
}

export interface CreateFormDto {
    title: string;
    description?: string;
    theme?: FormTheme;
    settings?: FormSettings;
}

export interface UpdateFormDto {
    title?: string;
    description?: string;
    status?: FormStatus;
    theme?: FormTheme;
    settings?: FormSettings;
}

export interface CreateQuestionDto {
    type: QuestionType;
    title: string;
    description?: string;
    is_required?: boolean;
    options?: any;
    validation?: QuestionValidation;
    order_index?: number;
}

export interface UpdateQuestionDto {
    title?: string;
    description?: string;
    is_required?: boolean;
    options?: any;
    validation?: QuestionValidation;
}

export interface SubmitResponseDto {
    answers: {
        question_uuid: string;
        value: any;
    }[];
}
