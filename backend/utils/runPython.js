// Optional helper wrapper (not used heavily yet). Left for extension.
const { spawn } = require('child_process');

module.exports = function runPython(script, args, onStdout, onStderr, onClose) {
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  const child = spawn(pythonCmd, [script, ...args]);
  child.stdout.on('data', (d) => onStdout && onStdout(d.toString()));
  child.stderr.on('data', (d) => onStderr && onStderr(d.toString()));
  child.on('close', (code) => onClose && onClose(code));
  return child;
};

