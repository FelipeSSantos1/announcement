import * as assert from 'assert';
import * as sinon from 'sinon';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const child_process = require('child_process') as typeof import('child_process');
import * as ghCli from '../../ghCli';

suite('ghCli', () => {
  teardown(() => sinon.restore());

  test('isInstalled returns true when gh --version succeeds', () => {
    sinon.stub(child_process, 'execSync').returns(Buffer.from('gh version 2.40.0'));
    assert.strictEqual(ghCli.isInstalled(), true);
  });

  test('isInstalled returns false when gh is missing', () => {
    sinon.stub(child_process, 'execSync').throws(new Error('command not found: gh'));
    assert.strictEqual(ghCli.isInstalled(), false);
  });

  test('fetchIssues invokes gh with correct args and parses JSON', () => {
    const fake = [{
      number: 1, title: 'Hello', body: 'Body',
      labels: [{ name: 'announcement' }], createdAt: '2026-04-01T00:00:00Z',
      url: 'https://github.com/our-org/a/issues/1',
    }];
    const stub = sinon.stub(child_process, 'execSync').returns(Buffer.from(JSON.stringify(fake)));
    const issues = ghCli.fetchIssues('our-org/announcements', 'announcement');
    const cmd = stub.firstCall.args[0] as string;
    assert.ok(cmd.includes('gh issue list'));
    assert.ok(cmd.includes('--repo our-org/announcements'));
    assert.ok(cmd.includes('--label announcement'));
    assert.ok(cmd.includes('--json title,body,number,labels,createdAt,url'));
    assert.strictEqual(issues.length, 1);
    assert.strictEqual(issues[0].title, 'Hello');
  });

  test('fetchIssues throws when gh returns non-JSON', () => {
    sinon.stub(child_process, 'execSync').returns(Buffer.from('not json'));
    assert.throws(() => ghCli.fetchIssues('a/b', 'x'));
  });
});
