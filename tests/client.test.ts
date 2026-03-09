import axios from 'axios';
import { N8NClient } from '../src/client';
import type { N8NWorkflow } from '../src/types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();

const mockHttp = { get: mockGet, post: mockPost, put: mockPut };
mockedAxios.create.mockReturnValue(mockHttp as unknown as ReturnType<typeof axios.create>);

const ENV = { url: 'https://n8n.example.com', apiKey: 'test-key' };

const WORKFLOW: N8NWorkflow = {
  id: '1',
  name: 'Test Workflow',
  active: false,
  nodes: [],
  connections: {},
};

describe('N8NClient', () => {
  let client: N8NClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new N8NClient(ENV);
  });

  describe('constructor', () => {
    it('strips trailing slash from baseURL', () => {
      const c = new N8NClient({ url: 'https://n8n.example.com/', apiKey: 'key' });
      expect(c.baseURL).toBe('https://n8n.example.com');
    });

    it('creates axios instance with correct headers', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-N8N-API-KEY': 'test-key',
          }),
        }),
      );
    });
  });

  describe('listWorkflows', () => {
    it('returns workflows from a single page', async () => {
      mockGet.mockResolvedValueOnce({ data: { data: [WORKFLOW], nextCursor: null } });

      const result = await client.listWorkflows();
      expect(result).toEqual([WORKFLOW]);
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('paginates through multiple pages', async () => {
      const wf2: N8NWorkflow = { ...WORKFLOW, id: '2', name: 'Second' };
      mockGet
        .mockResolvedValueOnce({ data: { data: [WORKFLOW], nextCursor: 'cursor-1' } })
        .mockResolvedValueOnce({ data: { data: [wf2], nextCursor: null } });

      const result = await client.listWorkflows();
      expect(result).toEqual([WORKFLOW, wf2]);
      expect(mockGet).toHaveBeenCalledTimes(2);
      expect(mockGet).toHaveBeenNthCalledWith(
        2,
        '/workflows',
        expect.objectContaining({ params: { limit: 250, cursor: 'cursor-1' } }),
      );
    });

    it('returns empty array when no workflows exist', async () => {
      mockGet.mockResolvedValueOnce({ data: { data: [], nextCursor: null } });
      const result = await client.listWorkflows();
      expect(result).toEqual([]);
    });
  });

  describe('getWorkflow', () => {
    it('fetches a workflow by id', async () => {
      mockGet.mockResolvedValueOnce({ data: WORKFLOW });
      const result = await client.getWorkflow('1');
      expect(result).toEqual(WORKFLOW);
      expect(mockGet).toHaveBeenCalledWith('/workflows/1');
    });
  });

  describe('createWorkflow', () => {
    it('posts the workflow and returns the created resource', async () => {
      const created = { ...WORKFLOW, id: '99' };
      mockPost.mockResolvedValueOnce({ data: created });

      const { id: _id, createdAt: _c, updatedAt: _u, ...payload } = WORKFLOW;
      const result = await client.createWorkflow(payload);
      expect(result).toEqual(created);
      expect(mockPost).toHaveBeenCalledWith('/workflows', payload);
    });
  });

  describe('updateWorkflow', () => {
    it('puts the workflow and returns the updated resource', async () => {
      const updated = { ...WORKFLOW, name: 'Updated' };
      mockPut.mockResolvedValueOnce({ data: updated });

      const result = await client.updateWorkflow('1', { name: 'Updated' });
      expect(result).toEqual(updated);
      expect(mockPut).toHaveBeenCalledWith('/workflows/1', { name: 'Updated' });
    });
  });

  describe('activateWorkflow', () => {
    it('posts to the activate endpoint', async () => {
      mockPost.mockResolvedValueOnce({ data: { ...WORKFLOW, active: true } });
      const result = await client.activateWorkflow('1');
      expect(result.active).toBe(true);
      expect(mockPost).toHaveBeenCalledWith('/workflows/1/activate');
    });
  });

  describe('deactivateWorkflow', () => {
    it('posts to the deactivate endpoint', async () => {
      mockPost.mockResolvedValueOnce({ data: { ...WORKFLOW, active: false } });
      const result = await client.deactivateWorkflow('1');
      expect(result.active).toBe(false);
      expect(mockPost).toHaveBeenCalledWith('/workflows/1/deactivate');
    });
  });
});
