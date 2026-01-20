export type FormStatus = 'draft' | 'published' | 'closed' | 'archived';

export interface Form {
    id: number;
    uuid: string;
    title: string;
    description?: string;
    status: FormStatus;
    theme?: any;
    settings?: any;
    public_hash?: string;
    created_at: number;
}

export interface Question {
    id: number;
    form_id: number;
    uuid: string;
    type: string;
    title: string;
    description?: string;
    is_required: boolean;
    options?: any;
    validation?: any;
    order_index: number;
}
