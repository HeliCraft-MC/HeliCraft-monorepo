// Schema unit tests
// Tests schema structure without requiring database connection

import { getTableColumns, getTableName } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { litebansBans } from '../../server/db/banlist/schema';
import { auth } from '../../server/db/default/schema';
import { answers, forms, questions, responses } from '../../server/db/forms/schema';
import { fileRefs, gallery, skins } from '../../server/db/sqlite/schema';

describe('forms Schema', () => {
    it('forms table has correct name', () => {
        expect(getTableName(forms)).toBe('forms');
    });

    it('forms table has required columns', () => {
        const columns = getTableColumns(forms);
        expect(columns.id).toBeDefined();
        expect(columns.uuid).toBeDefined();
        expect(columns.ownerUuid).toBeDefined();
        expect(columns.title).toBeDefined();
        expect(columns.status).toBeDefined();
        expect(columns.createdAt).toBeDefined();
        expect(columns.updatedAt).toBeDefined();
    });

    it('questions table has form_id reference', () => {
        const columns = getTableColumns(questions);
        expect(columns.formId).toBeDefined();
        expect(columns.type).toBeDefined();
        expect(columns.isRequired).toBeDefined();
    });

    it('responses table has form_id and respondent_uuid', () => {
        const columns = getTableColumns(responses);
        expect(columns.formId).toBeDefined();
        expect(columns.respondentUuid).toBeDefined();
        expect(columns.submittedAt).toBeDefined();
    });

    it('answers table has response_id and question_id', () => {
        const columns = getTableColumns(answers);
        expect(columns.responseId).toBeDefined();
        expect(columns.questionId).toBeDefined();
        expect(columns.value).toBeDefined();
    });
});

describe('auth Schema', () => {
    it('auth table has correct name', () => {
        expect(getTableName(auth)).toBe('AUTH');
    });

    it('auth table has required columns', () => {
        const columns = getTableColumns(auth);
        expect(columns.nickname).toBeDefined();
        expect(columns.lowercaseNickname).toBeDefined();
        expect(columns.hash).toBeDefined();
        expect(columns.uuid).toBeDefined();
        expect(columns.isAdmin).toBeDefined();
    });
});

describe('banlist Schema', () => {
    it('litebans_bans table has correct name', () => {
        expect(getTableName(litebansBans)).toBe('litebans_bans');
    });

    it('litebans_bans table has required columns', () => {
        const columns = getTableColumns(litebansBans);
        expect(columns.id).toBeDefined();
        expect(columns.uuid).toBeDefined();
        expect(columns.reason).toBeDefined();
        expect(columns.bannedByUuid).toBeDefined();
        expect(columns.active).toBeDefined();
    });
});

describe('sQLite Schema', () => {
    it('skins table has correct structure', () => {
        const columns = getTableColumns(skins);
        expect(columns.uuid).toBeDefined();
        expect(columns.path).toBeDefined();
        expect(columns.mime).toBeDefined();
    });

    it('gallery table has correct structure', () => {
        const columns = getTableColumns(gallery);
        expect(columns.id).toBeDefined();
        expect(columns.path).toBeDefined();
        expect(columns.ownerUuid).toBeDefined();
        expect(columns.status).toBeDefined();
    });

    it('fileRefs table has correct structure', () => {
        const columns = getTableColumns(fileRefs);
        expect(columns.hash).toBeDefined();
        expect(columns.path).toBeDefined();
        expect(columns.refCount).toBeDefined();
    });
});
