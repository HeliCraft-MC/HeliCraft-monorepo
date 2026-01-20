import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import type {
  CreateFormDto,
  CreateQuestionDto,
  Form,
  Question,
  SubmitResponseDto,
  UpdateFormDto,
  UpdateQuestionDto,
} from '~/interfaces/forms.types'
import { v4 as uuidv4 } from 'uuid'
import { useMySQL } from '~/plugins/mySql'

const DB_NAME = 'forms'

// Helper to convert MySQL row to proper Question with boolean is_required
function mapQuestion(row: RowDataPacket): Question {
  return {
    ...row,
    is_required: Boolean(row.is_required),
    options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
    validation: typeof row.validation === 'string' ? JSON.parse(row.validation) : row.validation,
  } as Question
}

// --- Forms ---

export async function getForms(limit: number = 50, offset: number = 0): Promise<Form[]> {
  const pool = useMySQL(DB_NAME)
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM forms WHERE status != "archived" ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset],
  )
  return rows as Form[]
}

export async function getFormById(id: number): Promise<Form | null> {
  const pool = useMySQL(DB_NAME)
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM forms WHERE id = ?', [id])
  return (rows[0] as Form) || null
}

export async function createForm(ownerUuid: string, dto: CreateFormDto): Promise<Form> {
  if (!dto.title || dto.title.trim().length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Title is required' })
  }

  const pool = useMySQL(DB_NAME)
  const uuid = uuidv4()
  const now = Date.now()

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO forms (uuid, owner_uuid, title, description, status, theme, settings, created_at, updated_at) 
         VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?)`,
    [
      uuid,
      ownerUuid,
      dto.title,
      dto.description || null,
      JSON.stringify(dto.theme || {}),
      JSON.stringify(dto.settings || {}),
      now,
      now,
    ],
  )

  return (await getFormById(result.insertId))!
}

export async function updateForm(id: number, dto: UpdateFormDto): Promise<Form> {
  const pool = useMySQL(DB_NAME)
  const updates: string[] = []
  const params: any[] = []

  if (dto.title !== undefined) {
    if (dto.title.trim().length === 0)
      throw createError({ statusCode: 400, statusMessage: 'Title cannot be empty' })
    updates.push('title = ?')
    params.push(dto.title)
  }
  if (dto.description !== undefined) { updates.push('description = ?'); params.push(dto.description) }
  if (dto.status !== undefined) { updates.push('status = ?'); params.push(dto.status) }
  if (dto.theme !== undefined) { updates.push('theme = ?'); params.push(JSON.stringify(dto.theme)) }
  if (dto.settings !== undefined) { updates.push('settings = ?'); params.push(JSON.stringify(dto.settings)) }

  if (updates.length > 0) {
    updates.push('updated_at = ?')
    params.push(Date.now())
    params.push(id)

    await pool.execute(
      `UPDATE forms SET ${updates.join(', ')} WHERE id = ?`,
      params,
    )
  }

  return (await getFormById(id))!
}

export async function deleteForm(id: number): Promise<void> {
  const pool = useMySQL(DB_NAME)
  await pool.execute('UPDATE forms SET status = "archived", updated_at = ? WHERE id = ?', [Date.now(), id])
}

export async function publishForm(id: number): Promise<string> {
  const pool = useMySQL(DB_NAME)
  const questions = await getQuestions(id)
  if (questions.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Cannot publish empty form' })
  }

  const hash = uuidv4().replace(/-/g, '').slice(0, 12)
  await pool.execute(
    'UPDATE forms SET status = "published", public_hash = ?, updated_at = ? WHERE id = ?',
    [hash, Date.now(), id],
  )
  return hash
}

// --- Questions ---

export async function getQuestions(formId: number): Promise<Question[]> {
  const pool = useMySQL(DB_NAME)
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM questions WHERE form_id = ? ORDER BY order_index ASC',
    [formId],
  )
  return rows.map(mapQuestion)
}

export async function createQuestion(formId: number, dto: CreateQuestionDto): Promise<Question> {
  const pool = useMySQL(DB_NAME)
  const uuid = uuidv4()
  const now = Date.now()

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO questions 
        (form_id, uuid, type, title, description, is_required, options, validation, order_index, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      formId,
      uuid,
      dto.type,
      dto.title,
      dto.description || null,
      dto.is_required ? 1 : 0,
      JSON.stringify(dto.options || {}),
      JSON.stringify(dto.validation || {}),
      dto.order_index || 0,
      now,
      now,
    ],
  )

  const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM questions WHERE id = ?', [result.insertId])
  return mapQuestion(rows[0])
}

export async function updateQuestion(id: number, dto: UpdateQuestionDto): Promise<void> {
  const pool = useMySQL(DB_NAME)
  const updates: string[] = []
  const params: any[] = []

  if (dto.type !== undefined) { updates.push('type = ?'); params.push(dto.type) }
  if (dto.title !== undefined) { updates.push('title = ?'); params.push(dto.title) }
  if (dto.description !== undefined) { updates.push('description = ?'); params.push(dto.description) }
  if (dto.is_required !== undefined) { updates.push('is_required = ?'); params.push(dto.is_required ? 1 : 0) }
  if (dto.options !== undefined) { updates.push('options = ?'); params.push(JSON.stringify(dto.options)) }
  if (dto.validation !== undefined) { updates.push('validation = ?'); params.push(JSON.stringify(dto.validation)) }

  if (updates.length > 0) {
    updates.push('updated_at = ?')
    params.push(Date.now())
    params.push(id)

    await pool.execute(
      `UPDATE questions SET ${updates.join(', ')} WHERE id = ?`,
      params,
    )
  }
}

export async function deleteQuestion(id: number): Promise<void> {
  const pool = useMySQL(DB_NAME)
  await pool.execute('DELETE FROM questions WHERE id = ?', [id])
}

export async function reorderQuestions(formId: number, questionIds: number[]): Promise<void> {
  const pool = useMySQL(DB_NAME)
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    for (let i = 0; i < questionIds.length; i++) {
      await connection.execute(
        'UPDATE questions SET order_index = ? WHERE id = ? AND form_id = ?',
        [i, questionIds[i], formId],
      )
    }
    await connection.commit()
  }
  catch (e) {
    await connection.rollback()
    throw e
  }
  finally {
    connection.release()
  }
}

// --- User Access ---

export async function getFormByHash(hash: string): Promise<{ form: Form, questions: Question[] } | null> {
  const pool = useMySQL(DB_NAME)
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM forms WHERE public_hash = ? AND status = "published"',
    [hash],
  )
  const form = rows[0] as Form

  if (!form)
    return null

  const questions = await getQuestions(form.id)
  return { form, questions }
}

// --- Responses ---

export async function submitResponse(formId: number, respondentUuid: string, dto: SubmitResponseDto): Promise<void> {
  const form = await getFormById(formId)
  if (!form || form.status !== 'published') {
    throw createError({ statusCode: 404, statusMessage: 'Form not available' })
  }

  const pool = useMySQL(DB_NAME)
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    // Create response
    const [res] = await connection.execute<ResultSetHeader>(
      'INSERT INTO responses (form_id, respondent_uuid, submitted_at) VALUES (?, ?, ?)',
      [formId, respondentUuid, Date.now()],
    )
    const responseId = res.insertId

    // Create answers
    const questions = await getQuestions(formId)
    const questionMap = new Map(questions.map(q => [q.uuid, q.id]))

    for (const answer of dto.answers) {
      const questionId = questionMap.get(answer.question_uuid)
      if (questionId) {
        let value = answer.value
        if (typeof value !== 'string') {
          value = JSON.stringify(value)
        }

        await connection.execute(
          'INSERT INTO answers (response_id, question_id, value) VALUES (?, ?, ?)',
          [responseId, questionId, value],
        )
      }
    }

    await connection.commit()
  }
  catch (e) {
    await connection.rollback()
    throw e
  }
  finally {
    connection.release()
  }
}

export async function getFormStats(formId: number): Promise<any> {
  const pool = useMySQL(DB_NAME)

  const [countRow] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) as total FROM responses WHERE form_id = ?',
    [formId],
  )
  const totalResponses = countRow[0].total

  return {
    total_responses: totalResponses,
  }
}

export async function getFormResponses(formId: number, limit: number = 100): Promise<any[]> {
  const pool = useMySQL(DB_NAME)
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id, respondent_uuid, submitted_at FROM responses WHERE form_id = ? ORDER BY submitted_at DESC LIMIT ?',
    [formId, limit],
  )
  return rows
}

// --- One Response Per User ---

export async function hasUserResponded(formId: number, userUuid: string): Promise<boolean> {
  const pool = useMySQL(DB_NAME)
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM responses WHERE form_id = ? AND respondent_uuid = ? LIMIT 1',
    [formId, userUuid],
  )
  return rows.length > 0
}

// --- Delete Response ---

export async function deleteResponse(responseId: number): Promise<void> {
  const pool = useMySQL(DB_NAME)
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    // Delete answers first (foreign key constraint)
    await connection.execute('DELETE FROM answers WHERE response_id = ?', [responseId])
    // Delete response
    await connection.execute('DELETE FROM responses WHERE id = ?', [responseId])
    await connection.commit()
  }
  catch (e) {
    await connection.rollback()
    throw e
  }
  finally {
    connection.release()
  }
}

// --- Unpublish/Republish Form ---

export async function unpublishForm(id: number): Promise<void> {
  const pool = useMySQL(DB_NAME)
  await pool.execute(
    'UPDATE forms SET status = "closed", updated_at = ? WHERE id = ?',
    [Date.now(), id],
  )
}

export async function republishForm(id: number): Promise<string> {
  const pool = useMySQL(DB_NAME)
  const form = await getFormById(id)
  if (!form)
    throw createError({ statusCode: 404, statusMessage: 'Form not found' })

  // If form already has public_hash, reuse it
  const hash = form.public_hash || uuidv4().replace(/-/g, '').slice(0, 12)

  await pool.execute(
    'UPDATE forms SET status = "published", public_hash = ?, updated_at = ? WHERE id = ?',
    [hash, Date.now(), id],
  )
  return hash
}

// --- Available Forms for User ---

export async function getAvailableForms(): Promise<Form[]> {
  const pool = useMySQL(DB_NAME)
  const now = Date.now()

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM forms 
         WHERE status = "published" 
         ORDER BY created_at DESC`,
  )

  // Filter by date in code (settings is JSON)
  return (rows as Form[]).filter((form) => {
    const settings = typeof form.settings === 'string'
      ? JSON.parse(form.settings)
      : (form.settings || {})

    // Check start_date
    if (settings.start_date && now < settings.start_date)
      return false
    // Check end_date
    if (settings.end_date && now > settings.end_date)
      return false

    return true
  })
}

export async function getUserResponsesForForms(userUuid: string, formIds: number[]): Promise<Map<number, boolean>> {
  if (formIds.length === 0)
    return new Map()

  const pool = useMySQL(DB_NAME)
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT DISTINCT form_id FROM responses WHERE respondent_uuid = ? AND form_id IN (${formIds.join(',')})`,
    [userUuid],
  )

  const responded = new Map<number, boolean>()
  for (const row of rows) {
    responded.set(row.form_id, true)
  }
  return responded
}
