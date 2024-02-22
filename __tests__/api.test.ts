import { Context } from '@actions/github/lib/context'
import { Octokit } from '@octokit/rest'
import api from '../src/api'

jest.mock('@actions/core')
jest.mock('@actions/github')
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    paginate: jest.fn(),
    rest: {
      teams: {
        listMembersInOrg: jest.fn()
      },
      pulls: {
        listReviews: jest.fn()
      },
      repos: {
        getContent: jest.fn()
      }
    }
  }))
}))

const context = {
  eventName: 'push',
  sha: 'fakeSha',
  ref: 'refs/heads/fake-branch',
  workflow: 'fakeWorkflow',
  action: 'fakeAction',
  actor: 'fakeActor',
  job: 'fakeJob',
  runNumber: 123,
  runId: 123456,
  payload: {
    pull_request: {
      number: 1
    }
  },
  repo: {
    owner: 'fakeOwner',
    repo: 'fakeRepo'
  },
  issue: {
    owner: 'fakeOwner',
    repo: 'fakeRepo',
    number: 1
  }
}
const fakeContext = context as Context
const getContentData = `groups:
    fake-team:
        members:
            - user1
        required: 1`

beforeEach(() => {
  jest.clearAllMocks()
})

describe('fetchConfig function', () => {
  it('throw error if not found', async () => {
    const octokit = new Octokit()
    ;(octokit.rest.repos.getContent as unknown as jest.Mock).mockImplementation(
      () => {
        throw new Error('Not Found')
      }
    )

    let err

    try {
      await api.fetchConfig(fakeContext, octokit, '')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      err = error
    } finally {
      expect(err.message).toBe('No configuration file is found: Not Found')
    }
  })

  it('return config object when file found and parsed', async () => {
    const octokit = new Octokit()
    ;(octokit.rest.repos.getContent as unknown as jest.Mock).mockImplementation(
      async () => {
        return Promise.resolve({
          data: {
            content: Buffer.from(getContentData).toString('base64')
          }
        })
      }
    )
    const res = await api.fetchConfig(fakeContext, octokit, '')
    const cfg = res

    expect(cfg).toMatchObject({
      groups: {
        'fake-team': {
          members: ['user1'],
          required: 1
        }
      }
    })
  })
})

describe('getApprovedMembers function', () => {
  it('return approved users if team found and reviews exist', async () => {
    const octokit = new Octokit()
    ;(octokit.paginate as unknown as jest.Mock).mockImplementation(
      async method => {
        if (method === octokit.rest.teams.listMembersInOrg) {
          return Promise.resolve([
            { login: 'user1' },
            { login: 'user2' },
            { login: 'user5' }
          ])
        } else if (method === octokit.rest.pulls.listReviews) {
          return Promise.resolve([
            { user: { login: 'user1' }, state: 'APPROVED' },
            { user: { login: 'user2' }, state: 'CHANGES_REQUESTED' },
            { user: { login: 'user3' }, state: 'APPROVED' }
          ])
        }
      }
    )

    const approved = await api.getApprovedMembers(
      fakeContext,
      octokit,
      'fake-team'
    )
    expect(approved).toEqual(new Set(['user1']))
  })

  it('return zero approved users if team found and no reviews', async () => {
    const octokit = new Octokit()
    ;(octokit.paginate as unknown as jest.Mock).mockImplementation(
      async method => {
        if (method === octokit.rest.teams.listMembersInOrg) {
          return Promise.resolve([
            { login: 'user1' },
            { login: 'user2' },
            { login: 'user5' }
          ])
        } else if (method === octokit.rest.pulls.listReviews) {
          return Promise.resolve([
            { user: { login: 'user1' }, state: 'CHANGES_REQUESTED' },
            { user: { login: 'user2' }, state: 'CHANGES_REQUESTED' },
            { user: { login: 'user3' }, state: 'CHANGES_REQUESTED' }
          ])
        }
      }
    )

    const approved = await api.getApprovedMembers(
      fakeContext,
      octokit,
      'fake-team'
    )
    expect(approved).toEqual(new Set([]))
  })
})
