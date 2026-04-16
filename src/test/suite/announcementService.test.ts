import * as assert from 'assert';
import { filterForRepo } from '../../announcementService';
import { Announcement } from '../../types';

function ann(n: number, labels: string[]): Announcement {
  return {
    number: n,
    title: `A${n}`,
    body: '',
    labels: labels.map((name) => ({ name })),
    createdAt: '2026-01-01T00:00:00Z',
    url: `https://github.com/x/y/issues/${n}`,
  };
}

suite('filterForRepo', () => {
  const all = [
    ann(1, ['announcement', 'all-repos']),
    ann(2, ['announcement', 'repo:auth-service']),
    ann(3, ['announcement', 'repo:api']),
    ann(4, ['announcement', 'repo:auth-service', 'repo:api']),
    ann(5, ['announcement']),
  ];

  test('includes all-repos and matching repo labels', () => {
    const result = filterForRepo(all, { owner: 'our-org', repo: 'auth-service' });
    assert.deepStrictEqual(result.map((a) => a.number).sort(), [1, 2, 4]);
  });

  test('returns only all-repos when no repo labels match', () => {
    const result = filterForRepo(all, { owner: 'our-org', repo: 'web' });
    assert.deepStrictEqual(result.map((a) => a.number), [1]);
  });

  test('returns empty when no repo context', () => {
    const result = filterForRepo(all, null);
    assert.deepStrictEqual(result, []);
  });

  test('announcements with no repo/all-repos label are excluded', () => {
    const result = filterForRepo([ann(5, ['announcement'])], { owner: 'our-org', repo: 'api' });
    assert.deepStrictEqual(result, []);
  });
});
