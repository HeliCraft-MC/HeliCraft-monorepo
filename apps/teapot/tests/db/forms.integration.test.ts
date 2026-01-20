// Integration tests for forms database
// Uses Testcontainers to spin up a real MySQL instance

import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { forms, questions } from '../../server/db/forms/schema'
import {
  getTestFormsDb,
  setupTestDatabase,
  startMySqlContainer,
  stopMySqlContainer,
} from '../setup'

describe('forms Integration Tests', () => {
  beforeAll(async () => {
    await startMySqlContainer()
    await setupTestDatabase()
  }, 60000) // 60s timeout for container startup

  afterAll(async () => {
    await stopMySqlContainer()
  })

  it('can create a form', async () => {
    const db = await getTestFormsDb()
    const now = Date.now()

    const result = await db.insert(forms).values({
      uuid: 'test-uuid-1',
      ownerUuid: 'owner-uuid-1',
      title: 'Test Form',
      createdAt: now,
      updatedAt: now,
    })

    expect(result[0].affectedRows).toBe(1)
  })

  it('can read a form by uuid', async () => {
    const db = await getTestFormsDb()

    const result = await db.select()
      .from(forms)
      .where(eq(forms.uuid, 'test-uuid-1'))

    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Test Form')
  })

  it('can create questions for a form', async () => {
    const db = await getTestFormsDb()
    const now = Date.now()

    // Get the form id
    const [form] = await db.select({ id: forms.id })
      .from(forms)
      .where(eq(forms.uuid, 'test-uuid-1'))

    // Insert question
    const result = await db.insert(questions).values({
      formId: form.id,
      uuid: 'question-uuid-1',
      type: 'text',
      title: 'What is your name?',
      isRequired: true,
      orderIndex: 0,
      createdAt: now,
      updatedAt: now,
    })

    expect(result[0].affectedRows).toBe(1)
  })

  it('can update a form', async () => {
    const db = await getTestFormsDb()

    await db.update(forms)
      .set({ title: 'Updated Form Title', updatedAt: Date.now() })
      .where(eq(forms.uuid, 'test-uuid-1'))

    const [updated] = await db.select()
      .from(forms)
      .where(eq(forms.uuid, 'test-uuid-1'))

    expect(updated.title).toBe('Updated Form Title')
  })

  it('cascade deletes questions when form is deleted', async () => {
    const db = await getTestFormsDb()

    // Delete the form
    await db.delete(forms).where(eq(forms.uuid, 'test-uuid-1'))

    // Questions should be cascade deleted
    const remainingQuestions = await db.select()
      .from(questions)
      .where(eq(questions.uuid, 'question-uuid-1'))

    expect(remainingQuestions).toHaveLength(0)
  })
})
