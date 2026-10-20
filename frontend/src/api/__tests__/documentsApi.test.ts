import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkApiHealth, deleteDocument, fetchDocuments } from '../documentsApi'

const response = (body: unknown, init: ResponseInit = {}) => new Response(
  body === undefined ? null : JSON.stringify(body),
  { status: 200, headers: { 'Content-Type': 'application/json' }, ...init },
)

afterEach(() => vi.unstubAllGlobals())

describe('fetchDocuments', () => {
  it('returns the document array from the API', async () => {
    const documents = [{ file_id: '1', filename: 'a.txt' }]
    const fetchMock = vi.fn().mockResolvedValue(response(documents))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchDocuments()).resolves.toEqual(documents)
    expect(fetchMock).toHaveBeenCalledWith('/api/files')
  })

  it('uses API detail for failed responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ detail: 'Database unavailable' }, { status: 503 })))
    await expect(fetchDocuments()).rejects.toThrow('Database unavailable')
  })

  it('rejects a successful response with a non-array body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ documents: [] })))
    await expect(fetchDocuments()).rejects.toThrow('unexpected document list')
  })

  it('uses a fallback when the error response is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not json', { status: 500 })))
    await expect(fetchDocuments()).rejects.toThrow('Could not load the document list.')
  })
})

describe('checkApiHealth', () => {
  it('resolves when the health endpoint is successful', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ status: 'ok' })))
    await expect(checkApiHealth()).resolves.toBeUndefined()
  })

  it('throws when the health endpoint fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({}, { status: 503 })))
    await expect(checkApiHealth()).rejects.toThrow('Health check failed.')
  })
})

describe('deleteDocument', () => {
  it('sends DELETE with an encoded file id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(undefined, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(deleteDocument('folder/file 1')).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith('/api/files/folder%2Ffile%201', { method: 'DELETE' })
  })

  it('throws the server detail when deletion fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ detail: 'Cannot delete' }, { status: 502 })))
    await expect(deleteDocument('abc')).rejects.toThrow('Cannot delete')
  })
})

describe('uploadDocument', () => {
  class MockXMLHttpRequest {
    static instance: MockXMLHttpRequest
    upload = { addEventListener: vi.fn((event: string, callback: (value: any) => void) => {
      this.uploadListeners[event] = callback
    }) }
    uploadListeners: Record<string, (value: any) => void> = {}
    listeners: Record<string, (value?: any) => void> = {}
    status = 0
    responseText = ''
    opened: [string, string] | null = null
    sentBody: FormData | null = null
    open(method: string, url: string) { this.opened = [method, url] }
    addEventListener(event: string, callback: (value?: any) => void) { this.listeners[event] = callback }
    send(body: FormData) { this.sentBody = body }
    trigger(event: string, value?: any) { this.listeners[event]?.(value) }
    triggerProgress(loaded: number, total: number, lengthComputable = true) {
      this.uploadListeners.progress?.({ loaded, total, lengthComputable })
    }
    constructor() { MockXMLHttpRequest.instance = this }
  }

  const file = () => new Blob(['sample content'], { type: 'text/plain' }) as File
  const uploadedRecord = { file_id: '1', filename: 'sample.txt' }

  afterEach(() => vi.unstubAllGlobals())

  it('posts the file, reports upload progress, and resolves parsed JSON', async () => {
    vi.stubGlobal('XMLHttpRequest', MockXMLHttpRequest)
    const progress = vi.fn()
    const promise = (await import('../documentsApi')).uploadDocument(file(), progress)
    const xhr = MockXMLHttpRequest.instance
    expect(xhr.opened).toEqual(['POST', '/api/files'])
    expect(xhr.sentBody).toBeInstanceOf(FormData)
    xhr.triggerProgress(25, 100)
    expect(progress).toHaveBeenCalledWith(25)
    xhr.status = 201
    xhr.responseText = JSON.stringify(uploadedRecord)
    xhr.trigger('load')
    await expect(promise).resolves.toEqual(uploadedRecord)
  })

  it('does not report progress when the total length is unknown', async () => {
    vi.stubGlobal('XMLHttpRequest', MockXMLHttpRequest)
    const progress = vi.fn()
    const promise = (await import('../documentsApi')).uploadDocument(file(), progress)
    MockXMLHttpRequest.instance.triggerProgress(10, 0, false)
    expect(progress).not.toHaveBeenCalled()
    MockXMLHttpRequest.instance.status = 200
    MockXMLHttpRequest.instance.responseText = JSON.stringify(uploadedRecord)
    MockXMLHttpRequest.instance.trigger('load')
    await promise
  })

  it('rejects when the server returns an API error', async () => {
    vi.stubGlobal('XMLHttpRequest', MockXMLHttpRequest)
    const promise = (await import('../documentsApi')).uploadDocument(file(), vi.fn())
    const xhr = MockXMLHttpRequest.instance
    xhr.status = 413
    xhr.responseText = JSON.stringify({ detail: 'File too large' })
    xhr.trigger('load')
    await expect(promise).rejects.toThrow('File too large')
  })

  it('rejects invalid JSON, network errors, and aborts', async () => {
    vi.stubGlobal('XMLHttpRequest', MockXMLHttpRequest)
    const api = await import('../documentsApi')

    const invalidJson = api.uploadDocument(file(), vi.fn())
    MockXMLHttpRequest.instance.status = 200
    MockXMLHttpRequest.instance.responseText = '{bad json'
    MockXMLHttpRequest.instance.trigger('load')
    await expect(invalidJson).rejects.toThrow('invalid response')

    const networkFailure = api.uploadDocument(file(), vi.fn())
    MockXMLHttpRequest.instance.trigger('error')
    await expect(networkFailure).rejects.toThrow('Network error')

    const aborted = api.uploadDocument(file(), vi.fn())
    MockXMLHttpRequest.instance.trigger('abort')
    await expect(aborted).rejects.toThrow('cancelled')
  })
})
