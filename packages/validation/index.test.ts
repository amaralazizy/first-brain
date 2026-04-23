import { describe, it, expect } from 'vitest'
import { createTaskSchema, taskIdSchema, urgencyValues, taskTypeValues } from './index'

describe('createTaskSchema', () => {
  it('validates correct input', () => {
    const input = {
      title: 'My Task',
      description: 'Description',
      urgency: 'High' as const,
      taskType: 'work' as const,
      estimatedEffort: 2,
      hasDeadline: false,
    }
    expect(createTaskSchema.parse(input).title).toBe('My Task')
  })

  it('applies defaults', () => {
    const input = { title: 'Task' }
    const result = createTaskSchema.parse(input)
    expect(result.urgency).toBe('Medium')
    expect(result.taskType).toBe('other')
    expect(result.estimatedEffort).toBe(1)
  })

  it('rejects empty title', () => {
    const input = { title: '' }
    expect(() => createTaskSchema.parse(input)).toThrow()
  })

  it('rejects title over 200 chars', () => {
    const input = { title: 'a'.repeat(201) }
    expect(() => createTaskSchema.parse(input)).toThrow()
  })

  it('rejects invalid urgency', () => {
    const input = { title: 'Task', urgency: 'Invalid' }
    expect(() => createTaskSchema.parse(input)).toThrow()
  })

  it('rejects invalid task type', () => {
    const input = { title: 'Task', taskType: 'invalid' }
    expect(() => createTaskSchema.parse(input)).toThrow()
  })

  it('rejects effort less than 1', () => {
    const input = { title: 'Task', estimatedEffort: 0 }
    expect(() => createTaskSchema.parse(input)).toThrow()
  })

  it('rejects effort over 40', () => {
    const input = { title: 'Task', estimatedEffort: 41 }
    expect(() => createTaskSchema.parse(input)).toThrow()
  })

  it('accepts deadline as ISO string', () => {
    const input = {
      title: 'Task',
      deadline: '2025-01-15T12:00:00Z',
      hasDeadline: true,
    }
    expect(createTaskSchema.parse(input).deadline).toBeDefined()
  })
})

describe('taskIdSchema', () => {
  it('validates number id', () => {
    expect(taskIdSchema.parse({ id: 1 })).toEqual({ id: 1 })
  })

  it('rejects missing id', () => {
    expect(() => taskIdSchema.parse({})).toThrow()
  })

  it('rejects non-number id', () => {
    expect(() => taskIdSchema.parse({ id: '1' })).toThrow()
  })
})

describe('enums', () => {
  it('has valid urgency values', () => {
    expect(urgencyValues).toContain('Low')
    expect(urgencyValues).toContain('High')
  })

  it('has valid task type values', () => {
    expect(taskTypeValues).toContain('work')
    expect(taskTypeValues).toContain('health')
  })
})